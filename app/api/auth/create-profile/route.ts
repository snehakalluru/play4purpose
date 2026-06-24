import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { user_id, full_name } = body
    if (!user_id) return NextResponse.json({ success: false, error: 'Missing user_id' }, { status: 400 })

    const payload = {
      id: user_id,
      full_name: full_name || null,
      created_at: new Date().toISOString()
    }

    // Upsert profile record using service role
    const { error } = await supabaseAdmin.from('profiles').upsert(payload)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'error' }, { status: 500 })
  }
}
