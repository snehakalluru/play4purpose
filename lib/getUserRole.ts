import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '../services/supabaseAdmin'

export type AppRole = 'admin' | 'user'

export type UserRoleResult = {
  isAuthenticated: boolean
  role: AppRole
  userId: string | null
  hasFeatureAccess?: boolean
  subscriptionStatus?: string | null
  trialEndDate?: string | null
}

function normalizeRole(role: unknown): AppRole {
  return role === 'admin' ? 'admin' : 'user'
}

function extractAccessToken(sessionRaw?: string | null): string | null {
  if (!sessionRaw) return null

  try {
    const parsed = JSON.parse(sessionRaw)
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed[0]
    if (typeof parsed?.access_token === 'string') return parsed.access_token
    if (typeof parsed?.accessToken === 'string') return parsed.accessToken
  } catch {
    if (typeof sessionRaw === 'string' && sessionRaw.length > 0) return sessionRaw
  }

  return null
}

function readSessionCookieValue(cookieSource: {
  get(name: string): { value: string } | undefined
}): string | null {
  const cookieNames = [
    'supabase-auth-token',
    'sb-access-token',
    'supabase-session'
  ]

  for (const name of cookieNames) {
    const cookie = cookieSource.get(name)
    if (cookie?.value) return cookie.value
  }

  return null
}

function readSupabaseAuthCookie(cookieSource: {
  getAll?: () => { name: string; value: string }[]
}): string | null {
  const cookie = cookieSource
    .getAll?.()
    .find((item) => item.name.startsWith('sb-') && item.name.includes('-auth-token'))

  return cookie?.value ?? null
}

function hasActiveOrTrialAccess(subscription: any): boolean {
  if (!subscription) return false
  if (subscription.status === 'active') return true
  if (subscription.status === 'trial_active') return true
  return false
}

async function resolveUserRole(accessToken: string | null): Promise<UserRoleResult> {
  if (!accessToken) {
    return { isAuthenticated: false, role: 'user', userId: null, hasFeatureAccess: false }
  }

  try {
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !userResp?.user) {
      return { isAuthenticated: false, role: 'user', userId: null, hasFeatureAccess: false }
    }

    const userId = userResp.user.id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status,trial_end,trial_end_date,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: profileAccess } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status,trial_end,trial_end_date,created_at')
      .eq('id', userId)
      .maybeSingle()

    const effectiveAccess = subscription || (profileAccess ? {
      status: profileAccess.subscription_status,
      trial_end: profileAccess.trial_end || profileAccess.trial_end_date || profileAccess.created_at,
      trial_end_date: profileAccess.trial_end_date || profileAccess.trial_end || profileAccess.created_at,
      created_at: profileAccess.created_at
    } : null)

    return {
      isAuthenticated: true,
      role: normalizeRole(profile?.role ?? userResp.user.app_metadata?.role ?? userResp.user.user_metadata?.role),
      userId,
      hasFeatureAccess: hasActiveOrTrialAccess(effectiveAccess),
      subscriptionStatus: effectiveAccess?.status ?? null,
      trialEndDate: effectiveAccess?.trial_end_date ?? effectiveAccess?.trial_end ?? null
    }
  } catch {
    return { isAuthenticated: false, role: 'user', userId: null, hasFeatureAccess: false }
  }
}

export async function getUserRole(accessToken?: string | null): Promise<UserRoleResult> {
  if (typeof accessToken !== 'undefined') {
    return resolveUserRole(accessToken)
  }

  const cookieStore = await cookies()
  const sessionRaw = readSessionCookieValue(cookieStore) ?? readSupabaseAuthCookie(cookieStore)
  return resolveUserRole(extractAccessToken(sessionRaw))
}

export async function getUserRoleFromRequest(req: NextRequest): Promise<UserRoleResult> {
  const sessionRaw =
    readSessionCookieValue(req.cookies) ??
    readSupabaseAuthCookie(req.cookies) ??
    null

  return resolveUserRole(extractAccessToken(sessionRaw))
}
