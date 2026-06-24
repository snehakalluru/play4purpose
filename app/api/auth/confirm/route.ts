import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

export async function POST(req: Request) {
  // Dev-only safeguard
  if (process.env.DISABLE_EMAIL_VERIFICATION !== 'true') {
    return NextResponse.json({ success: false, error: 'Dev confirm disabled' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { email, user_id } = body || {}

    let uid = user_id

    if (!uid && email) {
      const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
      if (listErr) return NextResponse.json({ success: false, error: listErr.message }, { status: 500 })
      uid = users.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase())?.id
    }

    if (!uid) return NextResponse.json({ success: false, error: 'user_id or email required' }, { status: 400 })

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(uid, { email_confirm: true })

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 })
  }
}
