import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) {
      console.error('[admin/users] listUsers failed:', authError.message)
      return NextResponse.json({ error: 'Failed to load auth users' }, { status: 500 })
    }

    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, charity_id, contribution_percentage, subscription_status, trial_end, trial_end_date, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/users] profiles select failed:', error.message)
      return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 })
    }


    const userIds = (users || []).map((user) => user.id)

    const [{ data: subscriptions }, { data: userCharities }, { data: scores }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from('subscriptions').select('user_id,status,plan_type,trial_end,trial_end_date,current_period_end,created_at').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabaseAdmin.from('user_charities').select('user_id,charity_id,contribution_percentage').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabaseAdmin.from('scores').select('user_id,created_at,score_date').in('user_id', userIds)
        : Promise.resolve({ data: [] })
    ])

    const usersById = new Map((authUsers?.users || []).map((u) => [u.id, u.email || null]))
    const latestSubByUser = new Map<string, any>()
    for (const sub of subscriptions || []) {
      const current = latestSubByUser.get(sub.user_id)
      if (!current || String(sub.created_at || '') > String(current.created_at || '')) {
        latestSubByUser.set(sub.user_id, sub)
      }
    }
    const selectedCharityByUser = new Map((userCharities || []).map((item: any) => [item.user_id, item]))
    const activityByUser = new Map<string, { score_count: number; last_score_at: string | null }>()
    for (const score of scores || []) {
      const current = activityByUser.get(score.user_id) || { score_count: 0, last_score_at: null }
      const scoreAt = score.score_date || score.created_at || null
      activityByUser.set(score.user_id, {
        score_count: current.score_count + 1,
        last_score_at: !current.last_score_at || (scoreAt && scoreAt > current.last_score_at) ? scoreAt : current.last_score_at
      })
    }

    const normalized = (users || []).map((user) => ({
      ...user,
      email: usersById.get(user.id) || null,
      subscription: latestSubByUser.get(user.id) || {
        status: user.subscription_status,
        trial_end: user.trial_end,
        trial_end_date: user.trial_end_date
      },
      selected_charity: selectedCharityByUser.get(user.id) || null,
      activity: activityByUser.get(user.id) || { score_count: 0, last_score_at: null }
    }))

    return NextResponse.json({ users: normalized, count: normalized.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
