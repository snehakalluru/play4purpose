export type Role = 'user' | 'admin'
export type SubscriptionPlan = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due' | 'expired'
export type DrawStatus = 'draft' | 'scheduled' | 'running' | 'completed'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed'

export interface Profile {
  id: string
  email?: string | null
  full_name: string
  avatar_url?: string | null
  role: Role
  charity_id?: string | null
  contribution_percentage: number
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan_type: SubscriptionPlan
  status: SubscriptionStatus
  current_period_start?: string | null
  current_period_end?: string | null
  created_at: string
  updated_at: string
}

export interface Charity {
  id: string
  name: string
  description?: string | null
  website?: string | null
  logo_url?: string | null
  active: boolean
  created_at: string
}

export interface Score {
  id: string
  user_id: string
  score: number
  played_date: string
  created_at: string
}

export interface ScoreStatistics {
  id: string
  user_id: string
  rolling_average: number
  last_five_average: number
  updated_at: string
}

export interface Draw {
  id: string
  name: string
  draw_date: string
  status: DrawStatus
  prize_pool: number
  jackpot_amount: number
  second_prize: number
  third_prize: number
  winning_number?: string | null
  created_by?: string | null
  created_at: string
}

export interface DrawEntry {
  id: string
  draw_id: string
  user_id: string
  entry_number: string
  created_at: string
}

export interface Winner {
  id: string
  draw_id: string
  user_id: string
  position: number
  amount: number
  verification_status: VerificationStatus
  payment_status: PaymentStatus
  proof_url?: string | null
  verified_by?: string | null
  verified_at?: string | null
  created_at: string
}

export interface Payout {
  id: string
  winner_id: string
  amount: number
  payment_method?: string | null
  transaction_reference?: string | null
  status: PaymentStatus
  paid_at?: string | null
  created_at: string
}

export interface PrizePool {
  id: string
  draw_id: string
  total_pool: number
  jackpot_amount: number
  second_amount: number
  third_amount: number
  rollover_amount: number
  created_at: string
}

export interface UserCharity {
  id: string
  user_id: string
  charity_id: string
  contribution_percentage: number
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message?: string | null
  read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  user_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  metadata?: Record<string, any> | null
  created_at: string
}
