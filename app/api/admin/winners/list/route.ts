import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userResp.user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: winners, error: wErr } = await supabaseAdmin
      .from('winners')
      .select(`
        id, draw_id, user_id, position, amount, verification_status, payment_status, proof_url, created_at,
        draw:draws!inner(name, draw_date, status),
        profile:profiles!winner_user_id_fkey(full_name, email),
        payout:payouts(id, amount, status, transaction_reference, paid_at)
      `)
      .order('created_at', { ascending: false })

    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })
    return NextResponse.json({ ok: true, winners: winners || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
