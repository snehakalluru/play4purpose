import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { getSubscriptionAccess } from '../../../../lib/subscriptionAccess'

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

    const { count: scoreCount } = await supabaseAdmin
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (!scoreCount || scoreCount < 5) return NextResponse.json({ error: 'At least 5 scores required' }, { status: 403 })

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

    const { data: entry, error: insertErr } = await supabaseAdmin
      .from('draw_entries')
      .insert({ draw_id: draw.id, user_id: userId, entry_number: entryNumber })
      .select('*')
      .maybeSingle()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    if (!entry) return NextResponse.json({ error: 'Failed to enter draw' }, { status: 500 })

    return NextResponse.json({ ok: true, entry })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
