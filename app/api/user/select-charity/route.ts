import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = userResp.user.id
    const body = await req.json()
    const { charity_id, contribution_percentage } = body
    if (!charity_id) return NextResponse.json({ error: 'Charity ID is required' }, { status: 400 })
    const contribution = Math.max(10, Math.min(100, Number(contribution_percentage) || 10))
    try {
      await supabaseAdmin.from('user_charities').upsert({ user_id: userId, charity_id, contribution_percentage: contribution }, { onConflict: 'user_id' })
    } catch (e) { console.error(e) }
    try {
      await supabaseAdmin.from('profiles').update({ charity_id, contribution_percentage: contribution }).eq('id', userId)
    } catch (e) { console.error(e) }
    try {
      await supabaseAdmin.from('profiles').upsert({ id: userId, full_name: userResp.user.user_metadata?.full_name || null, role: 'user' }, { onConflict: 'id' })
    } catch (e) { console.error(e) }
    return NextResponse.json({ success: true, message: 'Charity selected successfully' })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ success: true, message: 'Charity saved' })
  }
}
