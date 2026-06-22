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

    const { data: winners, error } = await supabaseAdmin
      .from('winners')
      .select(`
        id,
        draw_id,
        position,
        amount,
        verification_status,
        payment_status,
        proof_url,
        created_at,
        draw:draws!inner(name, draw_date, status)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, data: winners || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}