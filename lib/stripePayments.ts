import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { supabaseAdmin } from '../services/supabaseAdmin'
import { assertStripeConfigured, assertStripeWebhookConfigured, stripe } from '../services/stripeClient'

const ACTIVE_STATUS = 'active'
const VALID_PLANS = ['monthly', 'yearly'] as const

type PaymentPlan = (typeof VALID_PLANS)[number]

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not set')

  const parsed = new URL(appUrl)
  const isLocalhost = ['localhost', '127.0.0.1'].includes(parsed.hostname)
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS in production')
  }
  if (!isLocalhost && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS outside local development')
  }

  return parsed.origin
}

function isPaymentPlan(plan: unknown): plan is PaymentPlan {
  return typeof plan === 'string' && VALID_PLANS.includes(plan as PaymentPlan)
}

function getPriceIdForPlan(plan: PaymentPlan) {
  const priceId = plan === 'monthly'
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_YEARLY

  if (!priceId) {
    throw new Error(`Missing Stripe price id for ${plan} plan`)
  }

  return priceId
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
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_customer_id: customer.id,
        plan_type: 'monthly',
        status: 'trial_active',
        is_trial: true
      })
    if (insertError) throw insertError
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

    const priceId = getPriceIdForPlan(plan)
    const quantity = Number.isInteger(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1
    const user = auth.user
    const userId = user.id
    const appUrl = getAppUrl()
    const customerId = await findOrCreateCustomer(userId, user.email)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: priceId, quantity }],
      success_url: `${appUrl}/success`,
      cancel_url: `${appUrl}/cancel`,
      metadata: {
        userId,
        user_id: userId,
        priceId,
        plan_type: plan
      },
      payment_intent_data: {
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

async function markCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.metadata?.user_id
  if (!userId) {
    console.warn('[stripe webhook] checkout.session.completed missing user metadata', { sessionId: session.id })
    return
  }

  const now = new Date().toISOString()
  const amount = getSessionAmount(session)
  const planType = isPaymentPlan(session.metadata?.plan_type) ? session.metadata.plan_type : 'monthly'

  const payload = {
    user_id: userId,
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    stripe_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    amount_paid: amount,
    currency: session.currency,
    plan_type: planType,
    status: ACTIVE_STATUS,
    is_trial: false,
    started_at: now,
    current_period_start: now,
    updated_at: now,
    payment_metadata: session.metadata || {}
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'stripe_session_id' })

  if (error) throw error

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: ACTIVE_STATUS, updated_at: now })
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
