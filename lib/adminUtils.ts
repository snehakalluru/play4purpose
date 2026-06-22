import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '../services/supabaseAdmin'

export async function requireAdmin() {
  // Read cookies to find session access token
  const cookieStore = cookies()
  const all = cookieStore.getAll()
  let sessionRaw: string | undefined
  for (const c of all) {
    const name = c.name
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
      sessionRaw = c.value
      break
    }
    if (name === 'supabase-auth-token' || name === 'sb-access-token' || name === 'supabase-session') {
      sessionRaw = c.value
      break
    }
  }

  if (!sessionRaw) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

  let accessToken: string | null = null
  try {
    const parsed = JSON.parse(sessionRaw)
    if (Array.isArray(parsed) && parsed[0]) accessToken = parsed[0]
    else accessToken = parsed.access_token || parsed.accessToken || parsed[0]
  } catch {
    accessToken = sessionRaw
  }

  if (!accessToken) return NextResponse.json({ success: false, error: 'Missing access token' }, { status: 401 })

  try {
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (userErr || !userResp?.user) return NextResponse.json({ success: false, error: 'Invalid user' }, { status: 401 })
    const userId = userResp.user.id

    const { data: profile, error: profileErr } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (profileErr) return NextResponse.json({ success: false, error: 'Profile fetch failed' }, { status: 500 })
    if (!profile || profile.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    return userId
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 })
  }
}
