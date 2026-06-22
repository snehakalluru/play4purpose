import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

export async function GET(req: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const { data, error } = await supabaseAdmin.from('payouts').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, payouts: data })
}

export async function PATCH(req: Request) {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const body = await req.json()
  const { payout_id, status } = body || {}
  if (!payout_id || !status) return NextResponse.json({ success: false, error: 'payout_id and status required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('payouts').update({ status }).eq('id', payout_id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
