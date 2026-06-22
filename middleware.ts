import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/*
Middleware architecture (Phase 1)

- Protects /dashboard, /settings, /api routes by verifying Supabase session JWT cookie.
- Uses the Supabase JWT (from cookie) to allow unauthenticated redirects to /login.
- Role strategy: `role` is stored in `profiles.role` (user|admin). For admin-only routes check profile.

Protected route strategy:
- Public routes: /, /login, /signup, /_next, /api/webhook
- Authenticated routes: startsWith('/dashboard') or '/settings' or '/account'
- Admin routes: startsWith('/admin')

Session handling strategy:
- Read Supabase access token cookie (by default 'sb-access-token' or from custom cookie). If present, allow.
- For admin routes, perform a server-side call to Supabase to fetch profile role (or embed role in custom JWT claim).

Note: middleware runs at edge; keep calls minimal. For robust server checks use server-side endpoints with service role key.
*/

const PUBLIC_PATHS = ['/', '/login', '/signup', '/api/webhook', '/pricing', '/how-it-works', '/charities', '/favicon.ico']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public assets and API routes
  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // Basic auth check: rely on Supabase auth cookie
  const accessToken = req.cookies.get('sb-access-token')?.value || req.cookies.get('supabase-auth-token')?.value

  if (!accessToken) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For admin routes, verify role by fetching profile using Supabase REST with user's token
  if (pathname.startsWith('/admin')) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey || ''
        }
      })
      // If fetch fails, block
      if (!resp.ok) return NextResponse.redirect(new URL('/', req.url))
      const rows = await resp.json()
      const role = rows?.[0]?.role
      if (role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    } catch (e) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  // For protected app areas (dashboard, draws, winnings, scores) validate subscription
  const protectedPrefixes = ['/dashboard', '/draws', '/winnings', '/scores']
  if (protectedPrefixes.some((p) => pathname.startsWith(p))) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const resp = await fetch(`${supabaseUrl}/rest/v1/subscriptions?select=status`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey || ''
        }
      })
      if (!resp.ok) return NextResponse.redirect(new URL('/pricing', req.url))
      const rows = await resp.json()
      const active = rows && rows.length && rows[0].status === 'active'
      if (!active) return NextResponse.redirect(new URL('/pricing', req.url))
    } catch (e) {
      return NextResponse.redirect(new URL('/pricing', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
