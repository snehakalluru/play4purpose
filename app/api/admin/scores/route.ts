import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  const { searchParams } = new URL(req.url)
  const limitParam = Number(searchParams.get('limit') || '500')
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1000) : 500

  try {
    const { data, error } = await supabaseAdmin
      .from('scores')
      .select('id,user_id,score_value,score_date,created_at')
      .order('score_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[admin/scores] Failed to load scores:', error.message)
      return NextResponse.json({ ok: false, success: false, data: [], scores: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, success: true, data: data || [], scores: data || [], error: null })
  } catch (err: any) {
    console.error('[admin/scores] Unexpected error:', err)
    return NextResponse.json({
      ok: false,
      success: false,
      data: [],
      scores: [],
      error: err?.message || 'Unable to load scores'
    }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const body = await req.json()
    const scoreId = body?.score_id || body?.id
    const scoreValue = Number(body?.score_value)
    const scoreDate = body?.score_date

    if (!scoreId) {
      return NextResponse.json({ ok: false, error: 'score_id is required' }, { status: 400 })
    }
    if (!Number.isFinite(scoreValue) || scoreValue < 1 || scoreValue > 200) {
      return NextResponse.json({ ok: false, error: 'score_value must be between 1 and 200' }, { status: 400 })
    }

    const payload: Record<string, any> = { score_value: scoreValue }
    if (scoreDate) payload.score_date = scoreDate

    const { data, error } = await supabaseAdmin
      .from('scores')
      .update(payload)
      .eq('id', scoreId)
      .select('id,user_id,score_value,score_date,created_at')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck,
      action: 'edit_score',
      entity_type: 'score',
      entity_id: scoreId,
      metadata: payload
    })

    return NextResponse.json({ ok: true, success: true, score: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Unable to update score' }, { status: 500 })
  }
}
