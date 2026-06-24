import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../services/supabaseAdmin'

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

  const { error } = await supabaseAdmin
    .from('draws')
    .insert({
      name: drawName,
      draw_date: drawDate,
      status: 'scheduled',
      prize_pool: 0,
      jackpot_amount: 0,
      second_prize: 0,
      third_prize: 0,
      created_by: createdBy
    })

  return { error }
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

    // For each draw, check if user has an entry
    const drawsWithEntry = await Promise.all((draws || []).map(async (draw: any) => {
      const { data: entry } = await supabaseAdmin
        .from('draw_entries')
        .select('entry_number')
        .eq('draw_id', draw.id)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      return {
        ...draw,
        hasEntry: !!entry,
        entryNumber: entry?.entry_number || null
      }
    }))

    return NextResponse.json({ ok: true, data: drawsWithEntry })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
