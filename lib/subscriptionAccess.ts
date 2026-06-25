import { supabaseAdmin } from '../services/supabaseAdmin'

export type SubscriptionAccess = {
  allowed: boolean
  subscription: any | null
  reason?: string
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

  return { allowed: true, subscription: subscription || profile || { status: 'trial_active' } }
}
