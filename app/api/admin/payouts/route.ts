import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

async function fetchWinnersForPayouts(winnerIds: string[]) {
  if (!winnerIds.length) return []

  const withAmount = await supabaseAdmin
    .from('winners')
    .select('id, amount, prize_amount, user_id')
    .in('id', winnerIds)

  if (!withAmount.error) return withAmount.data || []

  const withoutAmount = await supabaseAdmin
    .from('winners')
    .select('id, prize_amount, user_id')
    .in('id', winnerIds)

  return (withoutAmount.data || []).map((winner: any) => ({
    ...winner,
    amount: winner.prize_amount ?? 0
  }))
}

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const { data: payouts, error } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const winnerIds = [...new Set((payouts || []).map((payout: any) => payout.winner_id).filter(Boolean))]
    const winners = await fetchWinnersForPayouts(winnerIds)

    const userIds = [...new Set((winners || []).map((winner: any) => winner.user_id).filter(Boolean))]
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] }
    const { data: authUsers } = userIds.length
      ? await supabaseAdmin.auth.admin.listUsers()
      : { data: { users: [] } }

    const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]))
    const emailsById = new Map((authUsers?.users || []).map((u) => [u.id, u.email || null]))
    const winnersById = new Map((winners || []).map((winner: any) => [
      winner.id,
      {
        ...winner,
        amount: winner.amount ?? winner.prize_amount ?? 0,
        profile: {
          ...(profilesById.get(winner.user_id) || {}),
          email: emailsById.get(winner.user_id) || null
        }
      }
    ]))

    const normalizedPayouts = (payouts || []).map((payout: any) => ({
      ...payout,
      transaction_reference: payout.transaction_reference || payout.payment_reference || null,
      winner: winnersById.get(payout.winner_id) || null
    }))

    return NextResponse.json({ payouts: normalizedPayouts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
