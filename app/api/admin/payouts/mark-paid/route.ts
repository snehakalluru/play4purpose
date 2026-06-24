import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../../lib/adminUtils'

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const body = await req.json()
    const { payout_id, stripe_transfer_id } = body

    if (!payout_id) {
      return NextResponse.json({ error: 'Missing payout_id' }, { status: 400 })
    }

    // Update payout status
    const { error: payoutError } = await supabaseAdmin
      .from('payouts')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        stripe_transfer_id: stripe_transfer_id || null
      })
      .eq('id', payout_id)

    if (payoutError) return NextResponse.json({ error: payoutError.message }, { status: 500 })

    // Get payout details for audit
    const { data: payout } = await supabaseAdmin
      .from('payouts')
      .select('winner_id, amount')
      .eq('id', payout_id)
      .maybeSingle()

    // Update winner payment status
    if (payout?.winner_id) {
      await supabaseAdmin
        .from('winners')
        .update({ payment_status: 'paid' })
        .eq('id', payout.winner_id)
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck,
      action: 'mark_payout_paid',
      entity_type: 'payout',
      entity_id: payout_id,
      metadata: { amount: payout?.amount, stripe_transfer_id: stripe_transfer_id || null }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
