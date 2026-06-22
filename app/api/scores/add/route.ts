import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { scoreSchema } from '../../../../validators/score'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const body = await req.json()
    const parsed = scoreSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = userResp.user.id

    const payload = {
      user_id: userId,
      score: parsed.data.score,
      played_date: parsed.data.played_date
    }

    const { error } = await supabaseAdmin.from('scores').insert(payload)
    if (error) {
      if (error.code === '23505' || /unique_user_played_date/i.test(error.message || '')) {
        return NextResponse.json({ error: 'Score for this date already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return latest 5 scores for user
    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from('scores')
      .select('id,score,played_date,created_at')
      .eq('user_id', userId)
      .order('played_date', { ascending: false })
      .limit(5)

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, scores: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
