import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { registrationSchema } from '../../../../validators/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parse = registrationSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.flatten() }, { status: 400 })
    }

    const { email, password, full_name } = parse.data
    const nameParts = (full_name || '').split(' ')
    const first_name = nameParts[0] || ''
    const last_name = nameParts.slice(1).join(' ') || ''

    // Create user via admin API so we can create profile immediately
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name, last_name },
      email_confirm: true
    } as any)

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    const user = userData.user || userData
    const userId = user.id

    // Create profile record
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email,
      full_name,
      first_name,
      last_name,
      role: 'user'
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
