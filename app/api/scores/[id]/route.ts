import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { getSubscriptionAccess } from '../../../../lib/subscriptionAccess'
import { scoreSchema } from '../../../../validators/score'

function invalid(message: string, status = 400) {
  return NextResponse.json({ ok: false, success: false, error: message, message }, { status })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return invalid('Unauthorized', 401)
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return invalid('Invalid token', 401)

    const userId = userResp.user.id
    const access = await getSubscriptionAccess(userId)
    if (!access.allowed) return invalid(access.reason || 'Active subscription required', 403)

    const body = await req.json()
    const parsed = scoreSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return invalid(firstIssue?.message || 'Invalid score input', 400)
    }

    const score = parsed.data.score
    const score_date = parsed.data.score_date || parsed.data.played_date
    if (!score_date) return invalid('Score date is required', 400)

    const { id } = await params

    const { data: duplicate } = await supabaseAdmin
      .from('scores')
      .select('id')
      .eq('user_id', userId)
      .eq('score_date', score_date)
      .neq('id', id)
      .limit(1)
      .maybeSingle()

    if (duplicate) {
      return invalid('You already submitted a score for this date', 409)
    }

    const { data, error } = await supabaseAdmin
      .from('scores')
      .update({
        score_value: score,
        score_date
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle()

    if (error) return invalid(error.message, 500)
    if (!data) return invalid('Score not found or access denied', 404)

    return NextResponse.json({ ok: true, success: true, data })
  } catch (err: any) {
    return invalid(err.message || 'Unable to update score', 500)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return invalid('Unauthorized', 401)
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return invalid('Invalid token', 401)

    const userId = userResp.user.id
    const access = await getSubscriptionAccess(userId)
    if (!access.allowed) return invalid(access.reason || 'Active subscription required', 403)

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('scores')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle()

    if (error) return invalid(error.message, 500)
    if (!data) return invalid('Score not found or access denied', 404)

    return NextResponse.json({ ok: true, success: true, message: 'Score deleted successfully' })
  } catch (err: any) {
    return invalid(err.message || 'Unable to delete score', 500)
  }
}
