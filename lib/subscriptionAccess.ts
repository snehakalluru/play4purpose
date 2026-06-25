import { supabaseAdmin } from '../services/supabaseAdmin'

export type SubscriptionAccess = {
  allowed: boolean
  subscription: any | null
  reason?: string
}

function trialHasTimeRemaining(subscription: any) {
  const endDate = subscription?.trial_end_date || subscription?.trial_end
  if (!endDate) return true

  const endTime = Date.parse(String(endDate))
  if (Number.isNaN(endTime)) return false

  return Date.now() < endTime + 24 * 60 * 60 * 1000
}

function hasActiveAccess(subscription: any) {
  const status = subscription?.status || subscription?.subscription_status
  if (status === 'active') return true
  if (status === 'trial_active') return trialHasTimeRemaining(subscription)
  return false
}

export async function getSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
  let subscription: any = null
  try {
    const result = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    subscription = result.data
  } catch (e) {}

  let profile: any = null
  try {
    const result = await supabaseAdmin
      .from('profiles')
      .select('subscription_status,trial_end,trial_end_date,created_at')
      .eq('id', userId)
      .maybeSingle()
    profile = result.data
  } catch (e) {}

  const effectiveSubscription = subscription || profile
  const allowed = hasActiveAccess(effectiveSubscription)

  return {
    allowed,
    subscription: effectiveSubscription,
    reason: allowed ? undefined : 'Active subscription or trial required'
  }
}
