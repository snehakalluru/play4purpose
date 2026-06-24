import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../../lib/adminUtils'

async function fetchWinner(winnerId: string) {
  const withAmount = await supabaseAdmin
    .from('winners')
    .select('id, amount, prize_amount, payment_status')
    .eq('id', winnerId)
    .maybeSingle()

  if (!withAmount.error) return withAmount

  const withoutAmount = await supabaseAdmin
    .from('winners')
    .select('id, prize_amount, payment_status')
    .eq('id', winnerId)
    .maybeSingle()

  return {
    ...withoutAmount,
    data: withoutAmount.data
      ? { ...withoutAmount.data, amount: withoutAmount.data.prize_amount ?? 0 }
      : null
  }
}

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const body = await req.json()
    const { winner_id, payment_method } = body
    if (!winner_id) return NextResponse.json({ error: 'Missing winner_id' }, { status: 400 })

    // Get winner data
    const { data: winner, error: winnerError } = await fetchWinner(winner_id)

    if (winnerError) return NextResponse.json({ error: winnerError.message }, { status: 500 })
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
      paid_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    })

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // Update winner payment_status
    await supabaseAdmin.from('winners').update({ payment_status: 'paid' }).eq('id', winner_id)

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck,
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
