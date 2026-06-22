import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', userResp.user.id).single()
    if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { winner_id, action } = body
    if (!winner_id || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid input: need winner_id and action (approve|reject)' }, { status: 400 })

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { error: updErr } = await supabaseAdmin
      .from('winners')
      .update({
        verification_status: newStatus,
        verified_by: userResp.user.id,
        verified_at: new Date().toISOString()
      })
      .eq('id', winner_id)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userResp.user.id,
      action: `${action}_winner`,
      entity_type: 'winner',
      entity_id: winner_id,
      metadata: { review_status: newStatus }
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
