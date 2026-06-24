import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    // Verify admin role
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userResp.user.id).maybeSingle()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { draw_id, status } = body

    if (!draw_id || !status) {
      return NextResponse.json({ error: 'Missing draw_id or status' }, { status: 400 })
    }

    const validStatuses = ['draft', 'scheduled', 'running', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update draw status
    const { error } = await supabaseAdmin
      .from('draws')
      .update({ status })
      .eq('id', draw_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userResp.user.id,
      action: 'update_draw_status',
      entity_type: 'draw',
      entity_id: draw_id,
      metadata: { new_status: status }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
