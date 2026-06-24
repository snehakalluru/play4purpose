import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const res = NextResponse.json({ success: true })
  const cookieHeader = req.headers.get('cookie') || ''
  const supabaseCookieNames = cookieHeader
    .split(';')
    .map((item) => item.trim().split('=')[0])
    .filter((name) => name.startsWith('sb-') && name.includes('-auth-token'))

  for (const name of ['supabase-auth-token', 'sb-access-token', 'supabase-session', ...supabaseCookieNames]) {
    res.cookies.set(name, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 0
    })
  }
  return res
}
