import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/favicon.ico']
const PUBLIC_PREFIXES = ['/_next/', '/api/stripe/webhook', '/api/auth/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Get Supabase session cookie
  // Supabase stores auth in a JSON cookie: 'sb-<project-ref>-auth-token'
  const sbCookie = req.cookies.get('sb-access-token')
  // Also try the supabase-auth-token format
  const altCookie = req.cookies.get('supabase-auth-token')
  const sessionRaw = sbCookie?.value || altCookie?.value

  if (!sessionRaw) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For admin routes, need to verify admin role
  if (pathname.startsWith('/admin')) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !anonKey) return NextResponse.redirect(new URL('/', req.url))

      // Try to parse the session cookie as JSON
      let accessToken: string | null = null
      try {
        const parsed = JSON.parse(sessionRaw)
        if (Array.isArray(parsed) && parsed[0]) accessToken = parsed[0]
        else accessToken = parsed.access_token
      } catch {
        accessToken = sessionRaw
      }

      if (!accessToken) return NextResponse.redirect(new URL('/', req.url))

      const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey }
      })
      if (!userResp.ok) return NextResponse.redirect(new URL('/', req.url))

      const userJson = await userResp.json()
      const userId = userJson?.id
      if (!userId) return NextResponse.redirect(new URL('/', req.url))

      const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey }
      })
      if (!profileResp.ok) return NextResponse.redirect(new URL('/', req.url))

      const profiles = await profileResp.json()
      if (!profiles?.[0]?.role || profiles[0].role !== 'admin') return NextResponse.redirect(new URL('/', req.url))
    } catch {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
