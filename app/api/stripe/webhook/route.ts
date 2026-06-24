import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { assertStripeConfigured, stripe } from '../../../../services/stripeClient'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

export const runtime = 'nodejs'

function mapStripeSubscriptionStatus(status?: string | null) {
  if (status === 'active') return 'active'
  if (status === 'trialing') return 'trial_active'
  return 'expired'
}

async function updateSubscriptionForUser(userId: string, payload: Record<string, any>) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .update(payload)
    .eq('user_id', userId)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) {
    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({ user_id: userId, ...payload })
    if (insertError) throw insertError
  }

  await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: payload.status })
    .eq('id', userId)
}

export async function POST(req: Request) {
  try {
    assertStripeConfigured()
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  const buf = await req.arrayBuffer()
  const rawBody = Buffer.from(buf)
  const sig = req.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const user_id = session.metadata?.userId || session.metadata?.user_id
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        if (!user_id || !subscriptionId) break
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const currentPeriodStart = (subscription as any).current_period_start
        const currentPeriodEnd = (subscription as any).current_period_end
        const status = mapStripeSubscriptionStatus(subscription.status)

        await updateSubscriptionForUser(user_id, {
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: subscriptionId,
          plan_type: 'monthly',
          status,
          is_trial: status === 'trial_active',
          started_at: new Date().toISOString(),
          current_period_start: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
          current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString().slice(0, 10) : null
        })
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const stripeId = subscription.id
        const userId = subscription.metadata?.userId || subscription.metadata?.user_id
        const status = mapStripeSubscriptionStatus(subscription.status)
        const currentPeriodStart = (subscription as any).current_period_start
        const currentPeriodEnd = (subscription as any).current_period_end
        const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString().slice(0, 10) : null
        const { data: rows, error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status,
            is_trial: status === 'trial_active',
            trial_end: trialEndDate,
            trial_end_date: trialEndDate,
            current_period_start: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null
          })
          .eq('stripe_subscription_id', stripeId)
          .select('user_id')
        if (error) throw error
        const profileUserId = rows?.[0]?.user_id || userId
        if (profileUserId) {
          await supabaseAdmin.from('profiles').update({ subscription_status: status }).eq('id', profileUserId)
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription
        const { data: rows, error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'expired', is_trial: false })
          .eq('stripe_subscription_id', subId)
          .select('user_id')
        if (error) throw error
        if (rows?.[0]?.user_id) {
          await supabaseAdmin.from('profiles').update({ subscription_status: 'expired' }).eq('id', rows[0].user_id)
        }
        break
      }
      default:
        // ignored
        break
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
