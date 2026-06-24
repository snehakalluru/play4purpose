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
