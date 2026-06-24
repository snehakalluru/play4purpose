import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { getSubscriptionAccess } from '../../../../lib/subscriptionAccess'
import { scoreSchema } from '../../../../validators/score'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const userId = userResp.user.id
    const access = await getSubscriptionAccess(userId)
    if (!access.allowed) return NextResponse.json({ error: access.reason || 'Active subscription required' }, { status: 403 })

    const body = await req.json()
    const parsed = scoreSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json({ ok: false, success: false, error: firstIssue?.message || 'Invalid score input', message: firstIssue?.message || 'Invalid score input' }, { status: 400 })
    }

    const score = parsed.data.score
    const score_date = parsed.data.score_date || parsed.data.played_date
    if (!score_date) {
      return NextResponse.json({ ok: false, success: false, error: 'Score date is required', message: 'Score date is required' }, { status: 400 })
    }

    // Check for duplicate score on same date
    const { data: existing } = await supabaseAdmin
      .from('scores')
      .select('id')
      .eq('user_id', userId)
      .eq('score_date', score_date)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ok: false, success: false, error: 'You already submitted a score for this date', message: 'You already submitted a score for this date' }, { status: 409 })
    }

    // Insert new score
    const { data, error } = await supabaseAdmin
      .from('scores')
      .insert({
        user_id: userId,
        score_value: score,
        score_date
      })
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ ok: false, success: false, error: error.message, message: 'Failed to save score' }, { status: 500 })
    if (!data) return NextResponse.json({ ok: false, success: false, error: 'Failed to save score', message: 'Failed to save score' }, { status: 500 })

    // Keep only latest 5 scores - delete oldest if more than 5
    const { data: allScores } = await supabaseAdmin
      .from('scores')
      .select('id, score_date')
      .eq('user_id', userId)
      .order('score_date', { ascending: true })

    if (allScores && allScores.length > 5) {
      const toDelete = allScores.slice(0, allScores.length - 5)
      const idsToDelete = toDelete.map(s => s.id)
      
      await supabaseAdmin
        .from('scores')
        .delete()
        .in('id', idsToDelete)
    }

    const { data: recentScores } = await supabaseAdmin
      .from('scores')
      .select('id, score_value, score_date, created_at')
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .limit(5)

    return NextResponse.json({ ok: true, success: true, data, scores: recentScores || [] })
  } catch (err: any) {
    return NextResponse.json({ ok: false, success: false, error: err.message, message: 'Unable to save score' }, { status: 500 })
  }
}
