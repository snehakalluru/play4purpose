import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const body = await req.json()
    const { winner_id, file_url } = body
    if (!winner_id || !file_url) return NextResponse.json({ error: 'Missing winner_id or file_url' }, { status: 400 })

    // Resolve user
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = userResp.user.id

    // Verify winner belongs to user
    const { data: winnerRows, error: wErr } = await supabaseAdmin.from('winners').select('id, user_id').eq('id', winner_id).limit(1)
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })
    if (!winnerRows || winnerRows.length === 0) return NextResponse.json({ error: 'Winner not found' }, { status: 404 })
    const winner = winnerRows[0]
    if (winner.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error: insErr } = await supabaseAdmin.from('winner_proofs').insert({ winner_id, file_url })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
