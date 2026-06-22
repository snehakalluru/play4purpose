import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { session } = body || {}
    if (!session || !session.access_token) {
      return NextResponse.json({ success: false, error: 'Missing session' }, { status: 400 })
    }

    const cookieValue = JSON.stringify(session)
    const res = NextResponse.json({ success: true })
    // Set an HttpOnly cookie so middleware can read it server-side
    res.cookies.set('supabase-auth-token', cookieValue, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax'
    })
    return res
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 })
  }
}
