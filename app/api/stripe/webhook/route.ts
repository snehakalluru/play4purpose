import { NextResponse } from 'next/server'
import { stripe } from '../../../../services/stripeClient'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

export const config = { runtime: 'experimental-edge' }

export async function POST(req: Request) {
  const buf = await req.arrayBuffer()
  const rawBody = Buffer.from(buf)
  const sig = req.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const user_id = session.metadata?.user_id
        const subscriptionId = session.subscription
        // Create subscription record
        await supabaseAdmin.from('subscriptions').upsert({
          user_id,
          stripe_subscription_id: subscriptionId,
          tier: 'monthly',
          status: 'active',
          current_period_end: new Date(session.expires_at * 1000).toISOString()
        })
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const stripeId = subscription.id
        const status = subscription.status
        const period_end = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
        await supabaseAdmin.from('subscriptions').update({ status, current_period_end: period_end }).eq('stripe_subscription_id', stripeId)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subId = invoice.subscription
        await supabaseAdmin.from('subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', subId)
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
