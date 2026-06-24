import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../../lib/adminUtils'

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const body = await req.json()
    const { user_id, role } = body

    if (!user_id || !role) {
      return NextResponse.json({ error: 'Missing user_id or role' }, { status: 400 })
    }

    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Update user role
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', user_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck,
      action: 'update_user_role',
      entity_type: 'profile',
      entity_id: user_id,
      metadata: { new_role: role }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
