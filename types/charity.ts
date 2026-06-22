export interface Charity {
  id: string
  name: string
  description?: string | null
  website?: string | null
  logo_url?: string | null
  active: boolean
  created_at: string
}
