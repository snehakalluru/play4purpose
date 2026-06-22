export type Role = 'user' | 'admin'

export interface Profile {
  id: string
  email?: string | null
  full_name?: string | null
  avatar_url?: string | null
  role: Role
  created_at: string
}
