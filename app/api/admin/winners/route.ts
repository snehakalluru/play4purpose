import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

export async function GET(req: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const { data, error } = await supabaseAdmin.from('winners').select('*').order('id', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, winners: data })
}

export async function PATCH(req: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const body = await req.json()
  const { winner_id, verified } = body || {}
  if (!winner_id) return NextResponse.json({ success: false, error: 'winner_id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('winners').update({ verified: !!verified }).eq('id', winner_id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
