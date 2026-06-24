import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

function secureRandomInt(max: number) {
  if (max <= 0) return 0
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] % max
}

function pickUniqueWinners(userIds: string[], count: number) {
  const pool = [...userIds]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1)
    const current = pool[i]
    pool[i] = pool[j]
    pool[j] = current
  }
  return pool.slice(0, count)
}

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    // Get all eligible users (have scores)
    const { data: usersWithScores, error: scoresError } = await supabaseAdmin
      .from('scores')
      .select('user_id')
      .order('score_date', { ascending: false })

    if (scoresError) return NextResponse.json({ error: scoresError.message }, { status: 500 })

    // Get unique user IDs
    const uniqueUserIds = [...new Set((usersWithScores || []).map(s => s.user_id))]

    if (uniqueUserIds.length < 3) {
      return NextResponse.json({ error: 'Not enough participants (need at least 3)' }, { status: 400 })
    }

    // Randomly select 3 unique winners with cryptographic entropy.
    const [first, second, third] = pickUniqueWinners(uniqueUserIds, 3)

    // Create draw
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draws')
      .insert({
        name: `Monthly Draw - ${new Date().toLocaleDateString()}`,
        draw_date: new Date().toISOString().split('T')[0],
        status: 'completed',
        prize_pool: 1000,
        jackpot_amount: 400,
        second_prize: 350,
        third_prize: 250,
        created_by: adminCheck
      })
      .select()
      .maybeSingle()

    if (drawError) return NextResponse.json({ error: drawError.message }, { status: 500 })
    if (!draw) return NextResponse.json({ error: 'Failed to create draw' }, { status: 500 })

    // Create winners
    const winners = [
      { draw_id: draw.id, user_id: first, position: 1, amount: 400 },
      { draw_id: draw.id, user_id: second, position: 2, amount: 350 },
      { draw_id: draw.id, user_id: third, position: 3, amount: 250 }
    ]

    const { error: winnersError } = await supabaseAdmin
      .from('winners')
      .insert(winners)

    if (winnersError) return NextResponse.json({ error: winnersError.message }, { status: 500 })

    // Create payouts
    // Get winner IDs
    const { data: createdWinners } = await supabaseAdmin
      .from('winners')
      .select('id, user_id, position')
      .eq('draw_id', draw.id)

    const payoutRecords = (createdWinners || []).map(w => ({
      winner_id: w.id,
      amount: w.position === 1 ? 400 : w.position === 2 ? 350 : 250,
      status: 'pending'
    }))

    const { error: payoutsError } = await supabaseAdmin
      .from('payouts')
      .insert(payoutRecords)

    if (payoutsError) return NextResponse.json({ error: payoutsError.message }, { status: 500 })

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck,
      action: 'run_draw',
      entity_type: 'draw',
      entity_id: draw.id,
      metadata: { winners: [first, second, third] }
    })

    return NextResponse.json({
      success: true,
      draw,
      winners: createdWinners
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
