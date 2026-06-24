import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const callerUserId = userResp.user.id

    const body = await req.json()
    const winner_id = body?.winner_id
    const file_url = body?.file_url

    if (!winner_id || typeof winner_id !== 'string') {
      return NextResponse.json({ error: 'winner_id is required' }, { status: 400 })
    }
    if (!file_url || typeof file_url !== 'string') {
      return NextResponse.json({ error: 'file_url is required' }, { status: 400 })
    }

    // Allow admins to upload proof for any winner; users can only update their own winners.
    const adminCheck = await requireAdmin(req).catch(() => null)
    const isAdmin = typeof adminCheck === 'string' && adminCheck.length > 0

    const { data: winnerRow, error: winnerErr } = await supabaseAdmin
      .from('winners')
      .select('id, user_id, verification_status')
      .eq('id', winner_id)
      .maybeSingle()

    if (winnerErr) return NextResponse.json({ error: winnerErr.message }, { status: 500 })
    if (!winnerRow) return NextResponse.json({ error: 'Winner not found' }, { status: 404 })

    if (!isAdmin && winnerRow.user_id !== callerUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Persist proof URL and mark as pending verification.
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('winners')
      .update({
        proof_url: file_url,
        verification_status: 'pending'
      })
      .eq('id', winner_id)
      .select('*')
      .maybeSingle()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    if (!updated) return NextResponse.json({ error: 'Failed to update winner proof' }, { status: 500 })

    return NextResponse.json({ ok: true, winner: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}

