import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../../lib/adminUtils'

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const { data: winners, error: wErr } = await supabaseAdmin
      .from('winners')
      .select('id, draw_id, user_id, position, amount, prize_amount, verification_status, payment_status, proof_url, created_at')
      .order('created_at', { ascending: false })

    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })

    const drawIds = [...new Set((winners || []).map((winner: any) => winner.draw_id).filter(Boolean))]
    const userIds = [...new Set((winners || []).map((winner: any) => winner.user_id).filter(Boolean))]
    const winnerIds = (winners || []).map((winner: any) => winner.id)

    const [{ data: draws }, { data: profiles }, { data: payouts }] = await Promise.all([
      drawIds.length
        ? supabaseAdmin.from('draws').select('id, name, draw_date, status').in('id', drawIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds)
        : Promise.resolve({ data: [] }),
      winnerIds.length
        ? supabaseAdmin.from('payouts').select('id, winner_id, amount, status, transaction_reference, paid_at').in('winner_id', winnerIds)
        : Promise.resolve({ data: [] })
    ])

    const drawsById = new Map((draws || []).map((draw: any) => [draw.id, draw]))
    const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]))
    const { data: authUsers } = userIds.length
      ? await supabaseAdmin.auth.admin.listUsers()
      : { data: { users: [] } }
    const emailsById = new Map((authUsers?.users || []).map((u) => [u.id, u.email || null]))
    const payoutsByWinnerId = new Map<string, any[]>()
    for (const payout of payouts || []) {
      const existing = payoutsByWinnerId.get(payout.winner_id) || []
      existing.push(payout)
      payoutsByWinnerId.set(payout.winner_id, existing)
    }

    const normalizedWinners = (winners || []).map((winner: any) => ({
      ...winner,
      amount: winner.amount ?? winner.prize_amount ?? 0,
      draw: drawsById.get(winner.draw_id) || null,
      profile: {
        ...(profilesById.get(winner.user_id) || {}),
        email: emailsById.get(winner.user_id) || null
      },
      payouts: payoutsByWinnerId.get(winner.id) || []
    }))

    return NextResponse.json({ ok: true, winners: normalizedWinners })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
