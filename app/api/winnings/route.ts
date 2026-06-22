import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../services/supabaseAdmin'
import SimpleStore from '../../../lib/simpleStore'

export async function GET() {
  try {
    if (supabaseAdmin && (supabaseAdmin as any).from) {
      try {
        const { data, error } = await supabaseAdmin.from('winners').select('*').order('created_at', { ascending: false })
        if (error) throw error
        return NextResponse.json({ ok: true, data })
      } catch (e) {
        // fallback
      }
    }

    const data = await SimpleStore.getWinners()
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message || 'error' }, { status: 500 })
  }
}
