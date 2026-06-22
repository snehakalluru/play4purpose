import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

function validateNumbers(nums: number[]) {
  if (!Array.isArray(nums) || nums.length !== 5) return 'Must provide exactly 5 numbers'
  const set = new Set<number>()
  for (const n of nums) {
    if (!Number.isInteger(n) || n < 1 || n > 45) return 'Each number must be an integer between 1 and 45'
    set.add(n)
  }
  if (set.size !== 5) return 'Numbers must be unique'
  return null
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    const body = await req.json()
    const numbers = body.numbers
    if (!numbers) return NextResponse.json({ error: 'Missing numbers array' }, { status: 400 })
    const parsed = numbers.map((n: any) => Number(n))
    const validationErr = validateNumbers(parsed)
    if (validationErr) return NextResponse.json({ error: validationErr }, { status: 400 })

    // Resolve user via service client
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = userResp.user.id

    // Find latest active draw (status open or published)
    const { data: draws, error: drawErr } = await supabaseAdmin
      .from('draws')
      .select('*')
      .in('status', ['open', 'published'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (drawErr) return NextResponse.json({ error: drawErr.message }, { status: 500 })
    if (!draws || draws.length === 0) return NextResponse.json({ error: 'No open draw available' }, { status: 400 })
    const draw = draws[0]

    // If draw has entry_deadline, ensure not passed
    if (draw.entry_deadline) {
      const now = new Date()
      const deadline = new Date(draw.entry_deadline)
      if (now > deadline) return NextResponse.json({ error: 'Entry deadline passed' }, { status: 400 })
    }

    const payload = { draw_id: draw.id, user_id: userId, numbers: JSON.stringify(parsed) }
    const { data: inserted, error: insertErr } = await supabaseAdmin.from('draw_entries').insert(payload).select().limit(1)
    if (insertErr) {
      if (insertErr.code === '23505' || /unique_draw_user/i.test(insertErr.message || '')) {
        return NextResponse.json({ error: 'User already entered this draw' }, { status: 409 })
      }
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, entry: inserted?.[0] ?? null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
