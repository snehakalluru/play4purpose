import { NextResponse } from 'next/server'
import { stripe } from '../../../../services/stripeClient'
import { supabase } from '../../../../services/supabaseClient'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { priceId, returnUrl } = body
    // Expect authenticated client; extract user from supabase client cookie via Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    // Get user info
    const { data: userResp } = await supabase.auth.getUser(token)
    const user = userResp?.user
    if (!user) return NextResponse.json({ error: 'Invalid user' }, { status: 401 })

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email || undefined,
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: { user_id: user.id }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
