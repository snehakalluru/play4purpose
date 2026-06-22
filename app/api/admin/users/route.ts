import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

export async function GET(req: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const { data, error } = await supabaseAdmin.from('profiles').select('id,email,full_name,role,created_at')
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, users: data })
}

export async function PATCH(req: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const body = await req.json()
  const { user_id, role } = body || {}
  if (!user_id || !role) return NextResponse.json({ success: false, error: 'user_id and role required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', user_id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
