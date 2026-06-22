import type { Session } from '@supabase/supabase-js'

const ACCESS_TOKEN_COOKIE = 'sb-access-token'
const LEGACY_ACCESS_TOKEN_COOKIE = 'supabase-auth-token'

function cookieOptions(maxAge = 60 * 60 * 24 * 7) {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

export function setSessionCookies(session: Session | null) {
  if (!session?.access_token) return

  const expiresIn = session.expires_at ? Math.max(session.expires_at - Math.floor(Date.now() / 1000), 60) : undefined
  const options = cookieOptions(expiresIn)

  document.cookie = `${ACCESS_TOKEN_COOKIE}=${session.access_token}; ${options}`
  document.cookie = `${LEGACY_ACCESS_TOKEN_COOKIE}=${session.access_token}; ${options}`
}

export function clearSessionCookies() {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; ${cookieOptions(0)}`
  document.cookie = `${LEGACY_ACCESS_TOKEN_COOKIE}=; ${cookieOptions(0)}`
}
