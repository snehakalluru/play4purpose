import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

function isSchemaError(error: any) {
  const message = String(error?.message || '')
  return message.includes('schema cache') || message.includes('column') || message.includes('does not exist')
}

async function insertDrawWithFallback(payload: Record<string, any>, adminId: string) {
  const attempts = [
    { ...payload, created_by: adminId },
    { ...payload, status: payload.status === 'scheduled' ? 'simulation' : payload.status, created_by: adminId },
    payload,
    { ...payload, status: payload.status === 'scheduled' ? 'simulation' : payload.status },
    {
      name: payload.name,
      draw_date: payload.draw_date,
      status: payload.status,
      prize_pool: payload.prize_pool
    },
    {
      draw_date: payload.draw_date,
      draw_type: payload.draw_type || 'random',
      numbers: payload.numbers || [],
      status: payload.status === 'scheduled' ? 'simulation' : payload.status,
      prize_pool: payload.prize_pool,
      jackpot_amount: payload.jackpot_amount,
      second_prize: payload.second_prize,
      third_prize: payload.third_prize
    },
    {
      draw_month: payload.draw_date,
      mode: payload.draw_type || 'random',
      status: payload.status === 'scheduled' ? 'simulation' : payload.status,
      winning_numbers: payload.numbers || [],
      jackpot_amount: payload.jackpot_amount || payload.prize_pool
    }
  ]

  let lastError: any = null
  for (const attempt of attempts) {
    const cleanPayload = Object.fromEntries(Object.entries(attempt).filter(([, value]) => value !== undefined))
    const result = await supabaseAdmin
      .from('draws')
      .insert(cleanPayload)
      .select('*')
      .maybeSingle()

    if (!result.error && result.data) return result
    lastError = result.error
    if (!isSchemaError(result.error) && !String(result.error?.message || '').includes('violates check constraint')) break
  }

  return { data: null, error: lastError || new Error('Failed to create draw') }
}

async function insertPrizePoolSnapshot(drawId: string, prizePool: number, jackpotAmount: number, secondPrize: number, thirdPrize: number) {
  const attempts = [
    {
      total_pool: prizePool,
      pool_5_match: jackpotAmount,
      pool_4_match: secondPrize,
      pool_3_match: thirdPrize,
      jackpot_amount: jackpotAmount,
      second_amount: secondPrize,
      third_amount: thirdPrize,
      rollover_amount: 0
    },
    {
      total_pool: prizePool,
      pool_5_match: jackpotAmount,
      pool_4_match: secondPrize,
      pool_3_match: thirdPrize,
      rollover_amount: 0
    },
    {
      amount: prizePool,
      currency: 'GBP'
    }
  ]

  for (const attempt of attempts) {
    const { error } = await supabaseAdmin
      .from('prize_pools')
      .insert({ draw_id: drawId, ...attempt })

    if (!error) return
    if (!isSchemaError(error)) return
  }
}

async function readPrizePoolsByDrawId(drawIds: string[]) {
  if (drawIds.length === 0) return new Map<string, number>()

  const attempts = [
    'draw_id,total_pool',
    'draw_id,amount'
  ]

  for (const select of attempts) {
    const { data, error } = await supabaseAdmin
      .from('prize_pools')
      .select(select)
      .in('draw_id', drawIds)

    if (error) {
      if (isSchemaError(error)) continue
      return new Map<string, number>()
    }

    return new Map<string, number>(
      (data || []).map((pool: any): [string, number] => [
        pool.draw_id,
        Number(pool.total_pool ?? pool.amount ?? 0)
      ])
    )
  }

  return new Map<string, number>()
}

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  const { data: draws, error } = await supabaseAdmin
    .from('draws')
    .select('*')
    .order('draw_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const prizePoolsByDrawId = await readPrizePoolsByDrawId((draws || []).map((draw: any) => draw.id))
  const normalizedDraws = (draws || []).map((draw: any) => {
    const poolFromDraw = Number(draw.prize_pool ?? 0)
    const poolFromSnapshot = prizePoolsByDrawId.get(draw.id) || 0
    const prizePool = poolFromDraw > 0 ? poolFromDraw : poolFromSnapshot

    return {
      ...draw,
      prize_pool: prizePool,
      jackpot_amount: Number(draw.jackpot_amount ?? 0) || Math.round(prizePool * 0.4 * 100) / 100,
      second_prize: Number(draw.second_prize ?? 0) || Math.round(prizePool * 0.35 * 100) / 100,
      third_prize: Number(draw.third_prize ?? 0) || Math.round(prizePool * 0.25 * 100) / 100
    }
  })

  return NextResponse.json({ draws: normalizedDraws })
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

    const basePayload = {
      name: body?.name || `Draw - ${drawDate}`,
      draw_date: drawDate,
      status: body?.status || 'scheduled',
      draw_type: body?.draw_type === 'algorithmic' ? 'algorithmic' : 'random',
      numbers: Array.isArray(body?.numbers) ? body.numbers : [],
      prize_pool: prizePool,
      jackpot_amount: jackpotAmount,
      second_prize: secondPrize,
      third_prize: thirdPrize
    }

    const result = await insertDrawWithFallback(basePayload, adminCheck)

    const { data: draw, error } = result

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!draw) return NextResponse.json({ error: 'Failed to create draw' }, { status: 500 })

    await insertPrizePoolSnapshot(draw.id, prizePool, jackpotAmount, secondPrize, thirdPrize)

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
