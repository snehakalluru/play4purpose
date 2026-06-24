import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../../lib/adminUtils'

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const body = await req.json()
    const { winner_id, action } = body
    if (!winner_id || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid input: need winner_id and action (approve|reject)' }, { status: 400 })

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { error: updErr } = await supabaseAdmin
      .from('winners')
      .update({
        verification_status: newStatus,
        verified_by: adminCheck,
        verified_at: new Date().toISOString()
      })
      .eq('id', winner_id)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck,
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
