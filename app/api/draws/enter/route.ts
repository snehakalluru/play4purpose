import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { getSubscriptionAccess } from '../../../../lib/subscriptionAccess'

function isSchemaError(error: any) {
  const message = String(error?.message || '')
  return message.includes('schema cache') || message.includes('column') || message.includes('does not exist')
}

function scoreValue(row: any) {
  return Number(row.score_value ?? row.score)
}

function normalizeFiveNumbers(scores: number[]) {
  const picked: number[] = []
  for (const score of scores) {
    if (Number.isInteger(score) && score >= 1 && score <= 45 && !picked.includes(score)) picked.push(score)
    if (picked.length === 5) break
  }

  let fill = 1
  while (picked.length < 5 && fill <= 45) {
    if (!picked.includes(fill)) picked.push(fill)
    fill += 1
  }

  return picked.sort((a, b) => a - b)
}

async function fetchLatestScores(userId: string) {
  const attempts = ['score_value,score_date,created_at', 'score,score_date,created_at']

  for (const select of attempts) {
    const result = await supabaseAdmin
      .from('scores')
      .select(select, { count: 'exact' })
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    if (!result.error) return result
    if (!isSchemaError(result.error)) return result
  }

  return { data: [], count: 0, error: null }
}

async function insertEntry(drawId: string, userId: string, entryNumber: string, numbers: number[]) {
  const attempts: any[] = [
    { draw_id: drawId, user_id: userId, entry_number: entryNumber, numbers },
    { draw_id: drawId, user_id: userId, numbers },
    { draw_id: drawId, user_id: userId, entry_number: entryNumber }
  ]

  let lastError: any = null
  for (const attempt of attempts) {
    const result = await supabaseAdmin
      .from('draw_entries')
      .insert(attempt)
      .select('*')
      .maybeSingle()

    if (!result.error) return result
    lastError = result.error
    if (!isSchemaError(result.error)) break
  }

  return { data: null, error: lastError || new Error('Failed to enter draw') }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = userResp.user.id

    const access = await getSubscriptionAccess(userId)
    if (!access.allowed) return NextResponse.json({ error: access.reason || 'Active subscription required' }, { status: 403 })

    const { data: scoreRows, count: scoreCount, error: scoresError } = await fetchLatestScores(userId)
    if (scoresError) return NextResponse.json({ error: scoresError.message }, { status: 500 })

    if (!scoreCount || scoreCount < 5) return NextResponse.json({ error: 'At least 5 scores required' }, { status: 403 })
    const numbers = normalizeFiveNumbers((scoreRows || []).map(scoreValue))

    // Find latest active draw
    const { data: draws } = await supabaseAdmin
      .from('draws')
      .select('id, status, draw_date')
      .in('status', ['scheduled', 'running'])
      .order('draw_date', { ascending: false })
      .limit(1)

    if (!draws || draws.length === 0) return NextResponse.json({ error: 'No active draw available' }, { status: 404 })
    const draw = draws[0]

    // Check if already entered
    const { data: existing } = await supabaseAdmin
      .from('draw_entries')
      .select('id')
      .eq('draw_id', draw.id)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'Already entered this draw' }, { status: 409 })

    // Generate entry number
    const year = new Date().getFullYear()
    const shortId = draw.id.replace(/-/g, '').substring(0, 4).toUpperCase()
    const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    const entryNumber = `DRAW-${year}-${shortId}${rand}`

    const { data: entry, error: insertErr } = await insertEntry(draw.id, userId, entryNumber, numbers)

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    if (!entry) return NextResponse.json({ error: 'Failed to enter draw' }, { status: 500 })

    return NextResponse.json({ ok: true, entry })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
