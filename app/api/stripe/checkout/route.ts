import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { assertStripeConfigured, stripe } from '../../../../services/stripeClient'

function getAllowedPriceIds() {
  return [
    process.env.STRIPE_MONTHLY_PRICE_ID,
    process.env.STRIPE_YEARLY_PRICE_ID,
    ...(process.env.STRIPE_ALLOWED_PRICE_IDS || '').split(',')
  ].filter((priceId): priceId is string => Boolean(priceId?.trim())).map((priceId) => priceId.trim())
}

export async function POST(req: Request) {
  try {
    assertStripeConfigured()

    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const userId = userResp.user.id

    // Check user has selected a charity (non-blocking)
    try {
      const { data: userCharity } = await supabaseAdmin.from('user_charities').select('id').eq('user_id', userId).limit(1).maybeSingle()
      if (!userCharity) {
        const { data: profileCharity } = await supabaseAdmin.from('profiles').select('charity_id').eq('id', userId).limit(1).maybeSingle()
        if (!profileCharity?.charity_id) {
          // Soft warning - allow checkout anyways
          console.log('User subscribing without charity:', userId)
        }
      }
    } catch (e) { console.error(e) }

    const body = await req.json()
    const allowedPriceIds = getAllowedPriceIds()
    const requestedPriceId = body?.priceId
    const priceId = requestedPriceId || process.env.STRIPE_MONTHLY_PRICE_ID
    const origin = new URL(req.url).origin
    const requestedReturnUrl = typeof body?.returnUrl === 'string' ? body.returnUrl : `${origin}/dashboard`
    const parsedReturnUrl = new URL(requestedReturnUrl, origin)
    const returnUrl = parsedReturnUrl.origin === origin ? parsedReturnUrl.toString() : `${origin}/dashboard`

    if (!priceId || !allowedPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userResp.user.email,
        metadata: { userId }
      })
      customerId = customer.id

      // Save customer ID without replacing a user's active trial row.
      if (subscription) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId)
      } else {
        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_customer_id: customerId,
            plan_type: 'monthly',
            status: 'trial_active',
            is_trial: true
          })
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId }
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
