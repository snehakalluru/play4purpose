import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../lib/adminUtils'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  const { data, error } = await supabaseAdmin
    .from('charities')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, charities: data || [] })
}

export async function POST(req: Request) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  const body = await req.json()
  const payload = {
    name: body?.name,
    description: body?.description || null,
    image_url: body?.image_url || body?.logo_url || null,
    logo_url: body?.logo_url || body?.image_url || null,
    website: body?.website || null,
    events: body?.website ? { website: body.website } : null
  }

  if (!payload.name) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('charities')
    .insert({ ...payload, is_active: body?.is_active ?? true, active: body?.is_active ?? true })
    .select('*')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ success: false, error: 'Failed to create charity' }, { status: 500 })
  }

  return NextResponse.json({ success: true, charity: data })
}
