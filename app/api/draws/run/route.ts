import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'

function generateEntryNumber(drawId: string): string {
  const year = new Date().getFullYear()
  const shortId = drawId.replace(/-/g, '').substring(0, 4).toUpperCase()
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `DRAW-${year}-${shortId}${rand}`
}

function cryptographicRandom(max: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

function selectWinners(count: number, total: number): number[] {
  if (count > total) return Array.from({ length: total }, (_, i) => i)
  const selected: Set<number> = new Set()
  while (selected.size < count) {
    selected.add(cryptographicRandom(total))
  }
  return Array.from(selected)
}

async function getEligibleUserIds(): Promise<{ ids: string[]; count: number }> {
  // Try RPC first
  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('get_eligible_draw_users')
  if (!rpcErr && rpcData && rpcData.length > 0) {
    return { ids: rpcData.map((r: any) => r.user_id || r), count: rpcData.length }
  }

  // Fallback: manual query
  const { data: subs } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id,status')
    .in('status', ['active', 'trialing'])
  if (!subs || subs.length === 0) return { ids: [], count: 0 }
  const subUserIds = subs.map(s => s.user_id)

  const { data: allScores } = await supabaseAdmin
    .from('scores')
    .select('user_id')
    .in('user_id', subUserIds)

  const userScoreCount: Record<string, number> = {}
  for (const s of allScores || []) {
    if (s.user_id) userScoreCount[s.user_id] = (userScoreCount[s.user_id] || 0) + 1
  }

  const eligibleIds = Object.entries(userScoreCount)
    .filter(([uid, count]) => count >= 5)
    .map(([uid]) => uid)

  return { ids: eligibleIds, count: eligibleIds.length }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !userData?.user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const userId = userData.user.id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 1. Find eligible users
    const { ids: eligibleUserIds, count: activeCount } = await getEligibleUserIds()
    if (eligibleUserIds.length === 0) {
      return NextResponse.json({ error: 'No eligible users found (need active subscription and 5+ scores)' }, { status: 400 })
    }

    // 2. Create draw
    const drawName = `Monthly Draw - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`
    const drawDate = new Date().toISOString().split('T')[0]

    const { data: draw, error: drawErr } = await supabaseAdmin
      .from('draws')
      .insert({ name: drawName, draw_date: drawDate, status: 'running', created_by: userId })
      .select('*')
      .maybeSingle()

    if (drawErr || !draw) return NextResponse.json({ error: 'Failed to create draw: ' + (drawErr?.message || '') }, { status: 500 })

    // 3. Create entries for each eligible user
    const entries: { draw_id: string; user_id: string; entry_number: string }[] = []
    for (const uid of eligibleUserIds) {
      entries.push({
        draw_id: draw.id,
        user_id: uid,
        entry_number: generateEntryNumber(draw.id)
      })
    }

    const { error: entriesErr } = await supabaseAdmin.from('draw_entries').insert(entries)
    if (entriesErr) return NextResponse.json({ error: 'Failed to create entries: ' + entriesErr.message }, { status: 500 })

    // 4. Calculate prize pool
    const totalPool = activeCount * 10
    const jackpotAmount = Math.round(totalPool * 0.40 * 100) / 100
    const secondAmount = Math.round(totalPool * 0.35 * 100) / 100
    const thirdAmount = Math.round(totalPool * 0.25 * 100) / 100
    const prizeAmounts = [jackpotAmount, secondAmount, thirdAmount]

    // 5. Select winners using cryptographic randomness
    const winnerIndices = selectWinners(3, eligibleUserIds.length)
    const winnersData = winnerIndices.map((idx, i) => ({
      draw_id: draw.id,
      user_id: eligibleUserIds[idx],
      position: i + 1,
      amount: prizeAmounts[i],
      verification_status: 'pending',
      payment_status: 'pending'
    }))

    const { error: winnersErr } = await supabaseAdmin.from('winners').insert(winnersData)
    if (winnersErr) return NextResponse.json({ error: 'Failed to save winners: ' + winnersErr.message }, { status: 500 })

    // 6. Update draw
    const winningEntryNumber = entries[winnerIndices[0]]?.entry_number || ''
    await supabaseAdmin
      .from('draws')
      .update({
        status: 'completed',
        prize_pool: totalPool,
        jackpot_amount: jackpotAmount,
        second_prize: secondAmount,
        third_prize: thirdAmount,
        winning_number: winningEntryNumber
      })
      .eq('id', draw.id)

    // 7. Save prize pool record
    await supabaseAdmin.from('prize_pools').insert({
      draw_id: draw.id,
      total_pool: totalPool,
      jackpot_amount: jackpotAmount,
      second_amount: secondAmount,
      third_amount: thirdAmount,
      rollover_amount: 0
    })

    // 8. Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
      action: 'run_draw',
      entity_type: 'draw',
      entity_id: draw.id,
      metadata: {
        eligible_users: eligibleUserIds.length,
        total_entries: entries.length,
        total_pool: totalPool,
        winners: winnersData.map(w => ({ position: w.position, user_id: w.user_id, amount: w.amount }))
      }
    })

    // 9. Notifications for winners
    const notifications = winnersData.map(w => ({
      user_id: w.user_id,
      type: 'winner',
      title: `You won ${w.position === 1 ? 'Jackpot' : w.position === 2 ? 'Second Prize' : 'Third Prize'}!`,
      message: `Congratulations! You won £${w.amount.toFixed(2)} in the ${drawName}. Please upload verification proof.`
    }))
    if (notifications.length > 0) {
      await supabaseAdmin.from('notifications').insert(notifications)
    }

    return NextResponse.json({
      ok: true,
      draw: { id: draw.id, name: drawName, pool: totalPool },
      winners: winnersData.map(w => ({ position: w.position, user_id: w.user_id, amount: w.amount }))
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
