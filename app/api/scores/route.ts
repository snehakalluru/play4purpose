import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../services/supabaseAdmin'
import { getSubscriptionAccess } from '../../../lib/subscriptionAccess'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const userId = userResp.user.id
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    let scores: any[] = []
    try {
      const result = await supabaseAdmin
        .from('scores')
        .select('*')
        .eq('user_id', userId)
        .order('played_date', { ascending: false })
        .limit(limit)
      scores = result.data || []
    } catch (e) {
      // Return empty scores on error
    }

    return NextResponse.json({ ok: true, data: scores })
  } catch (err: any) {
    return NextResponse.json({ ok: true, data: [] })
  }
}
