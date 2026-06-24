export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id?: string
  tier?: 'monthly' | 'yearly' | 'trial'
  plan_type?: 'monthly' | 'yearly'
  status: 'trial_active' | 'active' | 'expired'
  is_trial?: boolean
  trial_end?: string | null
  trial_end_date?: string | null
  current_period_end?: string | null
  stripe_session_id?: string | null
  stripe_payment_intent_id?: string | null
  amount_paid?: number | null
  currency?: string | null
  created_at: string
}
