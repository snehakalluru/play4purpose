export interface Charity {
  id: string
  name: string
  description?: string | null
  website?: string | null
  image_url?: string | null
  logo_url?: string | null
  events?: Record<string, any> | null
  active?: boolean
  created_at: string
}
