import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { supabaseAdmin } from '../services/supabaseAdmin'
import { assertStripeConfigured, assertStripeWebhookConfigured, stripe } from '../services/stripeClient'
import { assertValidSubscriptionStatus, normalizeSubscriptionStatus } from './subscriptionStatus'

const VALID_PLANS = ['monthly', 'yearly'] as const

type PaymentPlan = (typeof VALID_PLANS)[number]

const PLAN_PRICES: Record<PaymentPlan, { amount: number; interval: 'month' | 'year'; lookupKey: string }> = {
  monthly: { amount: 1000, interval: 'month', lookupKey: 'play4purpose_monthly_membership' },
  yearly: { amount: 10000, interval: 'year', lookupKey: 'play4purpose_yearly_membership' }
}

function logAndValidateSubscriptionStatus(status: string) {
  console.log('SUBSCRIPTION STATUS BEFORE INSERT:', status)
  assertValidSubscriptionStatus(status)
  return status
}

function fromStripeTimestamp(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null
}

function getRequestOrigin(req: Request) {
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || req.headers.get('host')
  if (!host) return null

  const proto = forwardedProto || (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
  return `${proto}://${host}`
}

function getAppUrl(req: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  const requestOrigin = getRequestOrigin(req)
  const secureRequestOrigin = requestOrigin?.startsWith('https://') ? requestOrigin : null
  const appUrl = secureRequestOrigin || configuredUrl || requestOrigin
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set')

  const parsed = new URL(appUrl)
  const isLocalhost = ['localhost', '127.0.0.1'].includes(parsed.hostname)

  if (parsed.protocol !== 'https:' && !isLocalhost) {
    if (requestOrigin) {
      const requestParsed = new URL(requestOrigin)
      if (requestParsed.protocol === 'https:') return requestParsed.origin
    }

    throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS outside local development')
  }

  return parsed.origin
}

function isPaymentPlan(plan: unknown): plan is PaymentPlan {
  return typeof plan === 'string' && VALID_PLANS.includes(plan as PaymentPlan)
}

async function getOrCreateProductId() {
  const configuredProductId = process.env.STRIPE_PRODUCT_ID

  if (configuredProductId) {
    try {
      const product = await stripe.products.retrieve(configuredProductId)
      if (!product.deleted) return product.id
    } catch (err: any) {
      if (err?.code !== 'resource_missing') throw err
    }
  }

  const product = await stripe.products.create(
    {
      name: 'Play4Purpose Membership',
      metadata: { app: 'play4purpose' }
    },
    { idempotencyKey: 'play4purpose-membership-product' }
  )

  return product.id
}

async function findPriceByLookupKey(lookupKey: string) {
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })
  return data[0] || null
}

async function getPriceIdForPlan(plan: PaymentPlan) {
  const configuredPriceId = plan === 'monthly'
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_YEARLY

  if (configuredPriceId) {
    try {
      const price = await stripe.prices.retrieve(configuredPriceId)
      if (price.active) return price.id
    } catch (err: any) {
      if (err?.code !== 'resource_missing') throw err
      console.warn(`[stripe checkout] configured ${plan} price does not exist; creating fallback price`)
    }
  }

  const config = PLAN_PRICES[plan]
  const existingPrice = await findPriceByLookupKey(config.lookupKey)
  if (existingPrice) {
    if (!existingPrice.active) {
      const updatedPrice = await stripe.prices.update(existingPrice.id, { active: true })
      return updatedPrice.id
    }

    return existingPrice.id
  }

  const productId = await getOrCreateProductId()
  const price = await stripe.prices.create(
    {
      product: productId,
      currency: 'gbp',
      unit_amount: config.amount,
      recurring: { interval: config.interval },
      lookup_key: config.lookupKey,
      metadata: { app: 'play4purpose', plan_type: plan }
    },
    { idempotencyKey: `play4purpose-${plan}-membership-price` }
  )

  return price.id
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    return { response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) }
  }

  return { user: data.user }
}

async function findOrCreateCustomer(userId: string, email?: string | null) {
  const { data: subscription, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id,stripe_customer_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (subscription?.stripe_customer_id) return subscription.stripe_customer_id as string

  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { userId, user_id: userId }
  })

  if (subscription?.id) {
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
      .eq('id', subscription.id)
    if (updateError) throw updateError
  }

  return customer.id
}

export async function createCheckoutSession(req: Request) {
  try {
    assertStripeConfigured()

    const auth = await getAuthenticatedUser(req)
    if (auth.response) return auth.response

    const { plan, quantity: requestedQuantity } = await req.json().catch(() => ({}))
    console.log('PLAN RECEIVED:', plan)

    if (!isPaymentPlan(plan)) {
      return NextResponse.json({ error: 'Invalid payment plan' }, { status: 400 })
    }

    const priceId = await getPriceIdForPlan(plan)
    const quantity = Number.isInteger(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1
    const user = auth.user
    const userId = user.id
    const appUrl = getAppUrl(req)
    const customerId = await findOrCreateCustomer(userId, user.email)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity }],
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      metadata: {
        userId,
        user_id: userId,
        priceId,
        plan_type: plan
      },
      subscription_data: {
        metadata: {
          userId,
          user_id: userId,
          priceId,
          plan_type: plan
        }
      }
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe checkout] failed:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Unable to start checkout' }, { status: 500 })
  }
}

function getSessionAmount(session: Stripe.Checkout.Session) {
  return session.amount_total ?? session.amount_subtotal ?? 0
}

async function getCheckoutSubscription(session: Stripe.Checkout.Session) {
  const subscription = session.subscription
  if (!subscription) return null
  if (typeof subscription !== 'string') return subscription

  return stripe.subscriptions.retrieve(subscription)
}

async function markCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.metadata?.user_id
  if (!userId) {
    console.warn('[stripe webhook] checkout.session.completed missing user metadata', { sessionId: session.id })
    return
  }

  const now = new Date().toISOString()
  const amount = getSessionAmount(session)
  const planType = isPaymentPlan(session.metadata?.plan_type) ? session.metadata.plan_type : 'monthly'
  const stripeSubscription = await getCheckoutSubscription(session)
  const rawStatus = stripeSubscription?.status || (session.payment_status === 'paid' || session.status === 'complete' ? 'active' : session.status || 'incomplete')
  const status = logAndValidateSubscriptionStatus(normalizeSubscriptionStatus(rawStatus))

  const payload = {
    user_id: userId,
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    stripe_subscription_id: stripeSubscription?.id ?? null,
    stripe_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    amount_paid: amount,
    currency: session.currency,
    plan_type: planType,
    status: normalizeSubscriptionStatus(status),
    is_trial: false,
    started_at: now,
    current_period_start: fromStripeTimestamp(stripeSubscription?.current_period_start) || now,
    current_period_end: fromStripeTimestamp(stripeSubscription?.current_period_end),
    updated_at: now,
    payment_metadata: session.metadata || {}
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'stripe_session_id' })

  if (error) throw error

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: 'active', updated_at: now })
    .eq('id', userId)

  if (profileError) throw profileError
}

async function findUserIdForStripeSubscription(subscription: Stripe.Subscription) {
  const metadataUserId = subscription.metadata?.userId || subscription.metadata?.user_id
  if (metadataUserId) return metadataUserId

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  if (!customerId) return null

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.user_id ?? null
}

function getProfileSubscriptionStatus(status: string) {
  if (status === 'active') return 'active'
  if (status === 'trial_active') return 'trial_active'
  return 'expired'
}

async function upsertStripeSubscription(subscription: Stripe.Subscription, rawStatus = subscription.status) {
  const userId = await findUserIdForStripeSubscription(subscription)
  if (!userId) {
    console.warn('[stripe webhook] subscription event missing user metadata', { subscriptionId: subscription.id })
    return
  }

  const now = new Date().toISOString()
  const planType = isPaymentPlan(subscription.metadata?.plan_type) ? subscription.metadata.plan_type : 'monthly'
  const status = logAndValidateSubscriptionStatus(normalizeSubscriptionStatus(rawStatus))
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_type: planType,
      status: normalizeSubscriptionStatus(status),
      is_trial: status === 'trial_active',
      started_at: fromStripeTimestamp(subscription.start_date) || now,
      current_period_start: fromStripeTimestamp(subscription.current_period_start),
      current_period_end: fromStripeTimestamp(subscription.current_period_end),
      updated_at: now,
      payment_metadata: subscription.metadata || {}
    }, { onConflict: 'stripe_subscription_id' })

  if (error) throw error

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: getProfileSubscriptionStatus(status), updated_at: now })
    .eq('id', userId)

  if (profileError) throw profileError
}

export async function handleStripeWebhook(req: Request) {
  try {
    assertStripeConfigured()
    assertStripeWebhookConfigured()
  } catch (err: any) {
    console.error('[stripe webhook] configuration error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Stripe webhook is not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })

  let event: Stripe.Event
  try {
    const rawBody = Buffer.from(await req.arrayBuffer())
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET || '')
  } catch (err: any) {
    console.error('[stripe webhook] signature verification failed:', err?.message || err)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await markCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      await upsertStripeSubscription(event.data.object as Stripe.Subscription)
    } else if (event.type === 'customer.subscription.deleted') {
      await upsertStripeSubscription(event.data.object as Stripe.Subscription, 'canceled')
    }
  } catch (err: any) {
    console.error('[stripe webhook] handler failed:', {
      eventId: event.id,
      eventType: event.type,
      message: err?.message || err
    })
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
