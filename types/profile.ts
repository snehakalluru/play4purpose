export type Role = 'user' | 'admin'

export interface Profile {
  id: string
  full_name?: string | null
  phone?: string | null
  role: Role
  charity_id?: string | null
  contribution_percentage?: number | null
  subscription_status?: 'trial_active' | 'active' | 'expired'
  trial_end?: string | null
  trial_end_date?: string | null
  privacy_accepted?: boolean
  terms_accepted?: boolean
  created_at: string
}
