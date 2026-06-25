import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'
import {
  DrawAction,
  DrawMode,
  calculateWinners,
  generateWinningNumbers,
  getEligibleDrawEntries,
  getLatestRolloverAmount,
  monthBounds
} from '../../../../lib/drawSystem'

function isSchemaError(error: any) {
  const message = String(error?.message || '')
  return message.includes('schema cache') || message.includes('column') || message.includes('does not exist')
}

function entryNumber(drawId: string) {
  const shortId = drawId.replace(/-/g, '').substring(0, 4).toUpperCase()
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `DRAW-${new Date().getFullYear()}-${shortId}${rand}`
}

async function hasPublishedDrawThisMonth() {
  const { start, next } = monthBounds()
  const result = await supabaseAdmin
    .from('draws')
    .select('id,status,draw_date')
    .gte('draw_date', start)
    .lt('draw_date', next)
    .in('status', ['published', 'completed'])
    .limit(1)

  if (result.error) return false
  return Boolean(result.data?.length)
}

async function insertDraw(payload: Record<string, any>) {
  const attempts: any[] = [
    payload,
    { ...payload, status: payload.status === 'published' ? 'completed' : 'running' },
    {
      name: payload.name,
      draw_date: payload.draw_date,
      status: payload.status === 'published' ? 'completed' : 'running',
      prize_pool: payload.prize_pool,
      jackpot_amount: payload.jackpot_amount,
      second_prize: payload.second_prize,
      third_prize: payload.third_prize,
      winning_number: payload.winning_number,
      created_by: payload.created_by
    },
    {
      draw_date: payload.draw_date,
      draw_type: payload.draw_type,
      numbers: payload.numbers,
      status: payload.status
    },
    {
      draw_month: payload.draw_date,
      mode: payload.mode,
      status: payload.status === 'published' ? 'completed' : 'running',
      winning_numbers: payload.winning_numbers,
      jackpot_amount: payload.jackpot_amount,
      published_at: payload.published_at
    }
  ]

  let lastError: any = null
  for (const attempt of attempts) {
    const cleanPayload = Object.fromEntries(Object.entries(attempt).filter(([, value]) => value !== undefined))
    const result = await supabaseAdmin.from('draws').insert(cleanPayload).select('*').maybeSingle()
    if (!result.error && result.data) return result.data
    lastError = result.error
    if (!isSchemaError(result.error) && !String(result.error?.message || '').includes('violates check constraint')) break
  }

  throw lastError || new Error('Failed to create draw')
}

async function insertEntries(drawId: string, entries: Array<{ user_id: string; numbers: number[] }>) {
  const fullRows = entries.map((entry) => ({
    draw_id: drawId,
    user_id: entry.user_id,
    numbers: entry.numbers,
    entry_number: entryNumber(drawId),
    match_count: null
  }))

  let result = await supabaseAdmin.from('draw_entries').insert(fullRows).select('id,user_id')
  if (!result.error) return result.data || []

  if (!isSchemaError(result.error)) throw result.error

  const fallbackRows = fullRows.map(({ draw_id, user_id, entry_number }) => ({ draw_id, user_id, entry_number }))
  result = await supabaseAdmin.from('draw_entries').insert(fallbackRows).select('id,user_id')
  if (result.error) throw result.error
  return result.data || []
}

async function insertWinners(drawId: string, createdEntries: any[], winners: any[]) {
  const entryIdByUser = new Map((createdEntries || []).map((entry: any) => [entry.user_id, entry.id]))
  const rows = winners.map((winner, index) => ({
    draw_entry_id: entryIdByUser.get(winner.user_id),
    draw_id: drawId,
    user_id: winner.user_id,
    position: index + 1,
    amount: winner.prize_amount,
    prize_amount: winner.prize_amount,
    match_count: winner.match_count,
    match_type: winner.match_type,
    status: 'pending',
    verification_status: 'pending',
    payment_status: 'pending'
  }))

  const attempts: any[] = [
    rows,
    rows.map(({ draw_entry_id, draw_id, user_id, prize_amount, match_count, status }) => ({
      draw_entry_id,
      draw_id,
      user_id,
      prize_amount,
      match_count,
      status
    })),
    rows.map(({ draw_id, user_id, match_type, prize_amount, verification_status, payment_status }) => ({
      draw_id,
      user_id,
      match_type,
      prize_amount,
      verification_status,
      payment_status
    }))
  ]

  let lastError: any = null
  for (const attempt of attempts) {
    const result = await supabaseAdmin.from('winners').insert(attempt).select('*')
    if (!result.error) return result.data || []
    lastError = result.error
    if (!isSchemaError(result.error)) break
  }

  throw lastError || new Error('Failed to save winners')
}

async function insertPrizePool(drawId: string, totalPool: number, pools: any, rolloverAmount: number) {
  const attempts: any[] = [
    {
      table: 'prize_pools',
      payload: {
        draw_id: drawId,
        total_pool: totalPool,
        pool_5_match: pools.pool5,
        pool_4_match: pools.pool4,
        pool_3_match: pools.pool3,
        jackpot_amount: pools.pool5,
        second_amount: pools.pool4,
        third_amount: pools.pool3,
        rollover_amount: rolloverAmount
      }
    },
    {
      table: 'prize_pool',
      payload: {
        draw_id: drawId,
        total_amount: totalPool,
        five_match_share: pools.pool5,
        four_match_share: pools.pool4,
        three_match_share: pools.pool3,
        rollover_amount: rolloverAmount
      }
    }
  ]

  for (const attempt of attempts) {
    const result = await supabaseAdmin.from(attempt.table).insert(attempt.payload)
    if (!result.error) return
    if (!isSchemaError(result.error)) return
  }
}

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const body = await req.json().catch(() => ({}))
    const action: DrawAction = body?.action === 'publish' ? 'publish' : 'simulate'
    const mode: DrawMode = body?.mode === 'algorithmic' ? 'algorithmic' : 'random'
    const force = Boolean(body?.force)

    const entries = await getEligibleDrawEntries()
    if (entries.length === 0) {
      return NextResponse.json({ error: 'No eligible users found. Users need at least 5 valid scores.' }, { status: 400 })
    }

    if (action === 'publish' && !force && await hasPublishedDrawThisMonth()) {
      return NextResponse.json({ error: 'A draw has already been published for this month.' }, { status: 409 })
    }

    const rolloverIn = await getLatestRolloverAmount()
    const basePrizePool = Number(body?.prize_pool ?? entries.length * 10)
    const winningNumbers = generateWinningNumbers(entries, mode)
    const result = calculateWinners(entries, winningNumbers, basePrizePool, rolloverIn)
    const { label, start } = monthBounds()

    const analysis = {
      action,
      mode,
      draw_month: start,
      eligible_entries: entries.length,
      winning_numbers: winningNumbers,
      match_counts: result.counts,
      prize_pool: result.totalPool,
      pools: result.pools,
      rollover_in: rolloverIn,
      rollover_to_next_month: result.rolloverAmount,
      winners: result.winners
    }

    if (action === 'simulate') {
      return NextResponse.json({ ok: true, success: true, simulation: true, analysis })
    }

    const draw = await insertDraw({
      name: `Monthly Draw - ${label}`,
      draw_date: start,
      draw_type: mode,
      mode,
      numbers: winningNumbers,
      winning_numbers: winningNumbers,
      winning_number: winningNumbers.join('-'),
      status: 'published',
      prize_pool: result.totalPool,
      jackpot_amount: result.pools.pool5,
      second_prize: result.pools.pool4,
      third_prize: result.pools.pool3,
      published_at: new Date().toISOString(),
      created_by: adminCheck
    })

    const createdEntries = await insertEntries(draw.id, entries)
    const createdWinners = result.winners.length > 0 ? await insertWinners(draw.id, createdEntries, result.winners) : []
    await insertPrizePool(draw.id, result.totalPool, result.pools, result.rolloverAmount)

    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck,
      action: 'publish_draw',
      entity_type: 'draw',
      entity_id: draw.id,
      metadata: analysis
    })

    return NextResponse.json({
      ok: true,
      success: true,
      simulation: false,
      draw,
      winners: createdWinners,
      analysis
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unable to run draw' }, { status: 500 })
  }
}
