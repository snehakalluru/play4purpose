import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserRoleFromRequest } from './lib/getUserRole'

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/favicon.ico']
const PUBLIC_PREFIXES = ['/_next/', '/api/stripe/webhook', '/api/auth/', '/api/charities']
const SUBSCRIPTION_REQUIRED_PREFIXES = ['/draws']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) return NextResponse.next()

  const roleResult = await getUserRoleFromRequest(req)

  if (!roleResult.isAuthenticated) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/admin') && roleResult.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/dashboard') && roleResult.role === 'admin') {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  if (
    roleResult.role !== 'admin' &&
    SUBSCRIPTION_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !roleResult.hasFeatureAccess
  ) {
    const planUrl = new URL('/onboarding/plan', req.url)
    planUrl.searchParams.set('reason', roleResult.subscriptionStatus === 'trial_active' ? 'trial-expired' : 'subscription-required')
    return NextResponse.redirect(planUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
