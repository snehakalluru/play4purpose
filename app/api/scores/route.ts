import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../services/supabaseAdmin'
import { scoreSchema } from '../../../validators/score'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, success: false, error: message, message }, { status })
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: jsonError('Unauthorized', 401) }
  }

  const token = authHeader.slice('Bearer '.length)
  const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userResp?.user) {
    console.error('[scores] Invalid token:', userErr?.message)
    return { userId: null, error: jsonError('Invalid token', 401) }
  }

  return { userId: userResp.user.id, error: null }
}

export async function GET(req: Request) {
  try {
    const { userId, error } = await getAuthenticatedUser(req)
    if (error) return error

    const { searchParams } = new URL(req.url)
    const limitParam = Number(searchParams.get('limit') || '50')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50

    const { data, error: scoresError } = await supabaseAdmin
      .from('scores')
      .select('id,user_id,score_value,score_date,created_at')
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (scoresError) {
      console.error('[scores] Failed to load scores:', scoresError.message)
      return jsonError('Failed to load scores', 500)
    }

    return NextResponse.json({ ok: true, success: true, data: data || [], scores: data || [] })
  } catch (err: any) {
    console.error('[scores] Unexpected GET error:', err)
    return jsonError(err?.message || 'Unable to load scores', 500)
  }
}

export async function POST(req: Request) {
  try {
    const { userId, error } = await getAuthenticatedUser(req)
    if (error) return error

    const body = await req.json()
    const parsed = scoreSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return jsonError(firstIssue?.message || 'Invalid score input', 400)
    }

    const score = parsed.data.score
    const scoreDate = parsed.data.score_date || parsed.data.played_date
    if (!scoreDate) return jsonError('Score date is required', 400)

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('scores')
      .select('id,user_id,score_value,score_date,created_at')
      .eq('user_id', userId)
      .eq('score_date', scoreDate)
      .maybeSingle()

    if (existingError) {
      console.error('[scores] Duplicate lookup failed:', existingError.message)
      return jsonError('Failed to validate score', 500)
    }

    if (existing) {
      if (Number(existing.score_value) === score) {
        const { data: recentScores } = await supabaseAdmin
          .from('scores')
          .select('id,user_id,score_value,score_date,created_at')
          .eq('user_id', userId)
          .order('score_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5)

        return NextResponse.json({
          ok: true,
          success: true,
          data: existing,
          score: existing,
          scores: recentScores || [],
          idempotent: true
        })
      }

      return jsonError('You already submitted a score for this date', 409)
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('scores')
      .insert({
        user_id: userId,
        score_value: score,
        score_date: scoreDate
      })
      .select('id,user_id,score_value,score_date,created_at')
      .maybeSingle()

    if (insertError) {
      console.error('[scores] Insert failed:', insertError.message)
      return jsonError('Failed to save score', 500)
    }

    const { data: recentScores } = await supabaseAdmin
      .from('scores')
      .select('id,user_id,score_value,score_date,created_at')
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ ok: true, success: true, data, score: data, scores: recentScores || [] }, { status: 201 })
  } catch (err: any) {
    console.error('[scores] Unexpected POST error:', err)
    return jsonError(err?.message || 'Unable to save score', 500)
  }
}
