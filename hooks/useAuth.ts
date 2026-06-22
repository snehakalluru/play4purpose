import { useEffect, useState } from 'react'
import type { Profile } from '../types'

// Placeholder hook for client-side auth state
export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // implement session fetch with supabase client in UI phase
    setLoading(false)
  }, [])

  return { profile, loading, setProfile }
}
