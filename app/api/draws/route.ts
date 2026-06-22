import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../services/supabaseAdmin'

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

    const { data: draws, error } = await supabaseAdmin
      .from('draws')
      .select('*')
      .order('draw_date', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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