export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id?: string
  tier: 'monthly' | 'annual' | 'trial'
  status: 'active' | 'past_due' | 'canceled' | 'incomplete'
  current_period_end?: string | null
  created_at: string
}
