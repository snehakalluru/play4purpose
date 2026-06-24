import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../services/supabaseAdmin'
import { requireAdmin } from '../../../../../lib/adminUtils'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  const { id } = await params
  const body = await req.json()

  const payload = {
    name: body?.name,
    description: body?.description || null,
    image_url: body?.image_url || body?.logo_url || null,
    logo_url: body?.logo_url || body?.image_url || null,
    website: body?.website || null,
    events: body?.website ? { website: body.website } : null,
    is_active: typeof body?.is_active === 'boolean' ? body.is_active : undefined,
    active: typeof body?.is_active === 'boolean' ? body.is_active : undefined
  }

  if (!payload.name) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('charities')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ success: false, error: 'Charity not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, charity: data })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck instanceof NextResponse) return adminCheck

  const { id } = await params

  const { count, error: usageError } = await supabaseAdmin
    .from('user_charities')
    .select('id', { count: 'exact', head: true })
    .eq('charity_id', id)

  if (usageError) {
    return NextResponse.json({ success: false, error: usageError.message }, { status: 500 })
  }

  const query = supabaseAdmin.from('charities')

  const { error } = count && count > 0
    ? await query.update({ is_active: false, active: false }).eq('id', id)
    : await query.delete().eq('id', id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, mode: count && count > 0 ? 'disabled' : 'deleted' })
}
