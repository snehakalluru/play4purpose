import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

type AuthUserSummary = {
  id: string
  email: string | null
}

async function listAllAuthUsers() {
  const users: AuthUserSummary[] = []
  const perPage = 1000
  let page = 1

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const batch = data?.users || []
    users.push(...batch.map((user) => ({ id: user.id, email: user.email || null })))

    if (batch.length < perPage) break
    page += 1
  }

  return users
}

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  try {
    const authUsers = await listAllAuthUsers()

    let { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, charity_id, contribution_percentage, subscription_status, trial_end, trial_end_date, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/users] profiles select failed, trying legacy users table:', error.message)
      const fallback = await supabaseAdmin
        .from('users')
        .select('id, name, email, charity_id, contribution_percentage, created_at')
        .order('created_at', { ascending: false })

      if (fallback.error) {
        console.error('[admin/users] legacy users select failed:', fallback.error.message)
        return NextResponse.json({ ok: false, success: false, error: 'Failed to load users' }, { status: 500 })
      }

      users = (fallback.data || []).map((user: any) => ({
        id: user.id,
        full_name: user.name,
        email: user.email,
        role: 'user',
        charity_id: user.charity_id,
        contribution_percentage: user.contribution_percentage,
        subscription_status: null,
        trial_end: null,
        trial_end_date: null,
        created_at: user.created_at
      }))
    }

    const userIds = (users || []).map((user) => user.id)

    const [{ data: subscriptions, error: subscriptionsError }, { data: userCharities, error: charitiesError }, { data: scores, error: scoresError }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from('subscriptions').select('user_id,status,plan_type,trial_end,trial_end_date,current_period_end,created_at').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabaseAdmin.from('user_charities').select('user_id,charity_id,contribution_percentage,charities(id,name)').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? supabaseAdmin.from('scores').select('user_id,created_at,score_date').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null })
    ])

    if (subscriptionsError) console.error('[admin/users] subscriptions lookup failed:', subscriptionsError.message)
    if (charitiesError) console.error('[admin/users] user charities lookup failed:', charitiesError.message)
    if (scoresError) console.error('[admin/users] scores lookup failed:', scoresError.message)

    const usersById = new Map(authUsers.map((u) => [u.id, u.email]))
    const latestSubByUser = new Map<string, any>()
    for (const sub of subscriptions || []) {
      const current = latestSubByUser.get(sub.user_id)
      if (!current || String(sub.created_at || '') > String(current.created_at || '')) {
        latestSubByUser.set(sub.user_id, sub)
      }
    }
    const selectedCharityByUser = new Map((userCharities || []).map((item: any) => {
      const charity = Array.isArray(item.charities) ? item.charities[0] : item.charities
      return [item.user_id, {
        user_id: item.user_id,
        charity_id: item.charity_id,
        contribution_percentage: item.contribution_percentage,
        charity: charity ? { id: charity.id, name: charity.name } : null
      }]
    }))
    const activityByUser = new Map<string, { score_count: number; last_score_at: string | null }>()
    for (const score of scores || []) {
      const current = activityByUser.get(score.user_id) || { score_count: 0, last_score_at: null }
      const scoreAt = score.score_date || score.created_at || null
      activityByUser.set(score.user_id, {
        score_count: current.score_count + 1,
        last_score_at: !current.last_score_at || (scoreAt && scoreAt > current.last_score_at) ? scoreAt : current.last_score_at
      })
    }

    const normalized = (users || []).map((user: any) => ({
      ...user,
      email: usersById.get(user.id) || user.email || null,
      subscription: latestSubByUser.get(user.id) || {
        status: user.subscription_status,
        trial_end: user.trial_end,
        trial_end_date: user.trial_end_date
      },
      selected_charity: selectedCharityByUser.get(user.id) || null,
      activity: activityByUser.get(user.id) || { score_count: 0, last_score_at: null }
    }))

    return NextResponse.json({ ok: true, success: true, users: normalized, count: normalized.length })
  } catch (err: any) {
    console.error('[admin/users] Unexpected error:', err)
    return NextResponse.json({ ok: false, success: false, error: err?.message || 'Unable to load users' }, { status: 500 })
  }
}
