import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ GET ALL SCORES
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ ok: false, error: 'No token' })
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'Invalid user' })
  }

  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', user.id)
    .order('score_date', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message })
  }

  return NextResponse.json({ ok: true, data })
}


// ✅ ADD SCORE
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  const body = await req.json()
  const { score_value, score_date } = body

  if (!token) {
    return NextResponse.json({ ok: false, error: 'No token' })
  }

  const {
    data: { user }
  } = await supabase.auth.getUser(token)

  const { error } = await supabase.from('scores').insert([
    {
      user_id: user?.id,
      score_value,
      score_date
    }
  ])

  if (error) {
    return NextResponse.json({ ok: false, error: error.message })
  }

  return NextResponse.json({ ok: true })
}