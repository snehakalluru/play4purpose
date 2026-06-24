import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../services/supabaseAdmin'

export async function GET() {
  try {
    // Try with active filter first
    let { data, error } = await supabaseAdmin
      .from('charities')
      .select('*')
      .or('is_active.eq.true,active.eq.true')
      .order('name', { ascending: true })

    // If that fails, try without filter
    if (error) {
      const result = await supabaseAdmin
        .from('charities')
        .select('*')
        .order('name', { ascending: true })
      data = result.data
      // Ignore error from second attempt
    }

    return NextResponse.json({ success: true, charities: data || [] })
  } catch (err: any) {
    return NextResponse.json({ success: true, charities: [] })
  }
}
