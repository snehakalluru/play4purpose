import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  const { data: draws, error } = await supabaseAdmin
    .from('draws')
    .select('*')
    .order('draw_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ draws: draws || [] })
}

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const body = await req.json()
    const drawDate = body?.draw_date

    if (!drawDate || Number.isNaN(Date.parse(drawDate))) {
      return NextResponse.json({ error: 'Valid draw_date is required' }, { status: 400 })
    }

    const prizePool = Number(body?.prize_pool ?? 0)
    const jackpotAmount = Number(body?.jackpot_amount ?? Math.round(prizePool * 0.4 * 100) / 100)
    const secondPrize = Number(body?.second_prize ?? Math.round(prizePool * 0.35 * 100) / 100)
    const thirdPrize = Number(body?.third_prize ?? Math.round(prizePool * 0.25 * 100) / 100)

    const { data: draw, error } = await supabaseAdmin
      .from('draws')
      .insert({
        name: body?.name || `Draw - ${drawDate}`,
        draw_date: drawDate,
        status: body?.status || 'scheduled',
        prize_pool: prizePool,
        jackpot_amount: jackpotAmount,
        second_prize: secondPrize,
        third_prize: thirdPrize,
        created_by: adminCheck
      })
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!draw) return NextResponse.json({ error: 'Failed to create draw' }, { status: 500 })

    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck,
      action: 'create_draw',
      entity_type: 'draw',
      entity_id: draw.id,
      metadata: { draw_date: drawDate, prize_pool: prizePool }
    })

    return NextResponse.json({ success: true, draw }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
