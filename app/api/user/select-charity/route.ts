import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { charitySelectionSchema } from '../../../../validators/charity'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const body = await req.json()
    const parse = charitySelectionSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 })

    const { charity_id } = parse.data
    const contribution_percentage = body.contribution_percentage ?? 10

    // Get user id from token using supabase admin
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const user_id = userResp.user.id

    // Upsert user_charities
    const { error } = await supabaseAdmin.from('user_charities').upsert({
      user_id,
      charity_id,
      contribution_percentage
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
