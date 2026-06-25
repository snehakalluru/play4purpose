import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../services/supabaseAdmin'

function isSchemaError(error: any) {
  const message = String(error?.message || '')
  return message.includes('schema cache') || message.includes('column') || message.includes('does not exist')
}

function isMissingDrawEntries(error: any) {
  const message = String(error?.message || '')
  return message.includes('draw_entries') && isSchemaError(error)
}

async function ensureDrawExists(createdBy: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('draws')
    .select('*')
    .order('draw_date', { ascending: false })
    .limit(1)

  if (existingError || (existing && existing.length > 0)) {
    return { error: existingError }
  }

  const now = new Date()
  const drawName = `Monthly Draw - ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`
  const drawDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10)

  const payload = {
      name: drawName,
      draw_date: drawDate,
      status: 'scheduled',
      draw_type: 'random',
      prize_pool: 0,
      jackpot_amount: 0,
      second_prize: 0,
      third_prize: 0,
      created_by: createdBy
    }

  let result = await supabaseAdmin.from('draws').insert(payload)
  if (result.error && isSchemaError(result.error)) {
    result = await supabaseAdmin.from('draws').insert({
      draw_date: drawDate,
      draw_type: 'random',
      numbers: [],
      status: 'simulation'
    })
  }

  return { error: result.error }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const userId = userResp.user.id
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    try {
      await ensureDrawExists(userId)
    } catch (e) {
      // Ignore draw creation errors
    }

    let draws: any[] = []
    try {
      const result = await supabaseAdmin
        .from('draws')
        .select('*')
        .order('draw_date', { ascending: false })
        .limit(limit)
      draws = result.data || []
    } catch (e) {
      // Return empty draws on error
    }

    // For each draw, check if user has an entry. If the DB has not received
    // the draw_entries migration yet, still return draws instead of failing.
    const drawsWithEntry = await Promise.all((draws || []).map(async (draw: any) => {
      const { data: entry, error: entryError } = await supabaseAdmin
        .from('draw_entries')
        .select('entry_number')
        .eq('draw_id', draw.id)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (entryError && !isMissingDrawEntries(entryError)) {
        console.error('[draws] entry lookup failed:', entryError.message)
      }

      return {
        ...draw,
        hasEntry: entryError ? false : !!entry,
        entryNumber: entryError ? null : entry?.entry_number || null,
        entriesUnavailable: isMissingDrawEntries(entryError)
      }
    }))

    return NextResponse.json({ ok: true, data: drawsWithEntry })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
