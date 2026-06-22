import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

function randomNumbers(count = 5, max = 45) {
  const set = new Set<number>()
  while (set.size < count) {
    set.add(Math.floor(Math.random() * max) + 1)
  }
  return Array.from(set).sort((a, b) => a - b).map(String)
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')

    // Verify user and role
    const { data: userResp, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const userId = userResp.user.id

    const { data: profileRows } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).limit(1).single()
    if (!profileRows || profileRows.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Create draw
    const winning_numbers = randomNumbers()
    const draw_month = new Date()
    draw_month.setDate(1)
    const drawPayload = {
      draw_month: draw_month.toISOString().slice(0, 10),
      mode: 'random',
      status: 'published',
      winning_numbers: JSON.stringify(winning_numbers),
      jackpot_amount: 0
    }

    const { data: drawData, error: drawErr } = await supabaseAdmin.from('draws').insert(drawPayload).select('id').limit(1).single()
    if (drawErr || !drawData) return NextResponse.json({ error: drawErr?.message || 'Failed to create draw' }, { status: 500 })
    const drawId = drawData.id

    // Simple prize pool: static or summed donations (fallback to static)
    let totalPool = 1000.0
    const { data: donations } = await supabaseAdmin.from('donations').select('amount').filter('status', 'eq', 'pending')
    if (donations && donations.length) {
      totalPool = donations.reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0)
    }

    const pool5 = +(totalPool * 0.4).toFixed(2)
    const pool4 = +(totalPool * 0.35).toFixed(2)
    const pool3 = +(totalPool * 0.25).toFixed(2)

    await supabaseAdmin.from('prize_pools').insert({ draw_id: drawId, total_pool: totalPool, pool_5_match: pool5, pool_4_match: pool4, pool_3_match: pool3, rollover_amount: 0 })

    // Build entries: for every user create a random entry (minimal simulation)
    const { data: users } = await supabaseAdmin.from('profiles').select('id').neq('role', 'admin')
    if (!users) return NextResponse.json({ error: 'No users found' }, { status: 400 })

    const entries: any[] = []
    const winnersToCreate: any[] = []

    for (const u of users) {
      const numbers = randomNumbers()
      const matchCount = numbers.filter((n) => winning_numbers.includes(n)).length
      entries.push({ draw_id: drawId, user_id: u.id, numbers: JSON.stringify(numbers), match_count: matchCount })
      if (matchCount >= 3) {
        winnersToCreate.push({ draw_id: drawId, user_id: u.id, match_count: matchCount })
      }
    }

    // Bulk insert entries
    if (entries.length) {
      await supabaseAdmin.from('draw_entries').insert(entries)
    }

    // Create winner rows with placeholder amounts and status 'approved'
    if (winnersToCreate.length) {
      const winnersInsert = winnersToCreate.map((w) => ({ draw_id: drawId, user_id: w.user_id, prize_amount: 0, match_count: w.match_count, status: 'approved' }))
      await supabaseAdmin.from('winners').insert(winnersInsert)

      // Call DB function to calculate prize distribution
      const { data: distData, error: distErr } = await supabaseAdmin.rpc('calculate_prize_distribution', { draw_uuid: drawId })
      if (distErr) {
        // Log but continue
        console.warn('Distribution RPC error', distErr)
      }

      // distData may be returned as an array depending on driver
      const distribution = Array.isArray(distData) ? distData[0] : distData

      // Persist rollover amount back to prize_pools
      const rollover = distribution?.rollover ?? 0
      await supabaseAdmin.from('prize_pools').update({ rollover_amount: rollover }).eq('draw_id', drawId)

      // Update winners' prize_amount based on allocations per-tier
      const alloc5 = distribution?.allocations?.['5_match'] ?? null
      const alloc4 = distribution?.allocations?.['4_match'] ?? null
      const alloc3 = distribution?.allocations?.['3_match'] ?? null

      if (alloc5 !== null) await supabaseAdmin.from('winners').update({ prize_amount: alloc5 }).eq('draw_id', drawId).eq('match_count', 5).eq('status', 'approved')
      if (alloc4 !== null) await supabaseAdmin.from('winners').update({ prize_amount: alloc4 }).eq('draw_id', drawId).eq('match_count', 4).eq('status', 'approved')
      if (alloc3 !== null) await supabaseAdmin.from('winners').update({ prize_amount: alloc3 }).eq('draw_id', drawId).eq('match_count', 3).eq('status', 'approved')
    }

    return NextResponse.json({ ok: true, draw_id: drawId, winning_numbers, totalPool })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
