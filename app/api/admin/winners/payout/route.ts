import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userResp.user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { winner_id, payment_method } = body
    if (!winner_id) return NextResponse.json({ error: 'Missing winner_id' }, { status: 400 })

    // Get winner data
    const { data: winner } = await supabaseAdmin
      .from('winners')
      .select('id, amount, payment_status')
      .eq('id', winner_id)
      .single()

    if (!winner) return NextResponse.json({ error: 'Winner not found' }, { status: 404 })
    if (winner.payment_status === 'paid') return NextResponse.json({ error: 'Winner already paid' }, { status: 409 })

    const txRef = `PAY-${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`

    // Create payout
    const { error: insErr } = await supabaseAdmin.from('payouts').insert({
      winner_id,
      amount: winner.amount,
      payment_method: payment_method || 'bank_transfer',
      transaction_reference: txRef,
      status: 'paid',
      paid_at: new Date().toISOString()
    })

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // Update winner payment_status
    await supabaseAdmin.from('winners').update({ payment_status: 'paid' }).eq('id', winner_id)

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userResp.user.id,
      action: 'process_payout',
      entity_type: 'winner',
      entity_id: winner_id,
      metadata: { amount: winner.amount, transaction_reference: txRef }
    })

    return NextResponse.json({ ok: true, transaction_reference: txRef })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
