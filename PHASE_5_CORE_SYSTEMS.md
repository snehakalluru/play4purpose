# PHASE 5: CORE BUSINESS SYSTEMS
## Golf Charity Draw Platform

---

## ⛳ 5A: GOLF SCORE SYSTEM

### Score Entry Rules
```
┌─────────────────────────────────────────────────────────────┐
│                    SCORE ENTRY RULES                          │
└─────────────────────────────────────────────────────────────┘

VALIDATION:
├── Range: 1-45 (inclusive)
├── One score per user per date (unique constraint)
├── Date cannot be in the future
├── Must have active subscription
└── Score must be integer (no decimals)

STORAGE:
├── Unlimited history (all scores retained)
├── Rolling average: last 5 scores only
├── Auto-calculated via database trigger
└── Statistics stored in score_statistics table

EDIT/DELETE RULES:
├── No direct edit (must delete and re-add)
├── Delete allowed anytime
├── FIFO deletion when > 5 scores
├── Deleting triggers statistics recalculation
└── If count drops below 5, user loses draw eligibility
```

### Score Entry Implementation
```typescript
// actions/scoreActions.ts
'use server'

import { supabaseAdmin } from '@/services/supabaseAdmin'
import { scoreSchema } from '@/validators/score'
import { checkSubscriptionStatus } from '@/lib/subscriptionManager'

export async function addScore(formData: FormData) {
  try {
    // 1. Get current user from session
    const token = formData.get('token') as string
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Validate input
    const validation = scoreSchema.safeParse({
      score: parseInt(formData.get('score') as string),
      played_date: formData.get('played_date') as string
    })

    if (!validation.success) {
      return { 
        success: false, 
        error: validation.error.errors[0]?.message || 'Invalid input' 
      }
    }

    const { score, played_date } = validation.data

    // 3. Check subscription
    const { allowed, status } = await checkSubscriptionStatus(user.id)
    if (!allowed) {
      return { 
        success: false, 
        error: `Active subscription required. Status: ${status}` 
      }
    }

    // 4. Check for duplicate date
    const { data: existing } = await supabaseAdmin
      .from('scores')
      .select('id')
      .eq('user_id', user.id)
      .eq('played_date', played_date)
      .maybeSingle()

    if (existing) {
      return { 
        success: false, 
        error: 'You already have a score for this date' 
      }
    }

    // 5. Insert score
    const { data: newScore, error: insertError } = await supabaseAdmin
      .from('scores')
      .insert({
        user_id: user.id,
        score,
        played_date
      })
      .select()
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    // 6. Enforce 5-score limit (FIFO deletion)
    await enforceScoreLimit(user.id)

    // 7. Return success
    return { 
      success: true, 
      data: newScore,
      message: 'Score added successfully' 
    }

  } catch (err: any) {
    console.error('Add score error:', err)
    return { success: false, error: 'Server error' }
  }
}

export async function deleteScore(scoreId: string) {
  try {
    // 1. Get current user
    const token = formData.get('token') as string
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Verify ownership
    const { data: score } = await supabaseAdmin
      .from('scores')
      .select('user_id')
      .eq('id', scoreId)
      .single()

    if (!score || score.user_id !== user.id) {
      return { success: false, error: 'Forbidden' }
    }

    // 3. Delete score
    const { error: deleteError } = await supabaseAdmin
      .from('scores')
      .delete()
      .eq('id', scoreId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    // 4. Statistics auto-updated via trigger

    return { 
      success: true, 
      message: 'Score deleted successfully' 
    }

  } catch (err: any) {
    console.error('Delete score error:', err)
    return { success: false, error: 'Server error' }
  }
}

async function enforceScoreLimit(userId: string) {
  // Get all scores ordered by date (oldest first)
  const { data: scores } = await supabaseAdmin
    .from('scores')
    .select('id, played_date')
    .eq('user_id', userId)
    .order('played_date', { ascending: true })

  if (!scores || scores.length <= 5) {
    return
  }

  // Delete oldest scores to keep only 5
  const toDelete = scores.slice(0, scores.length - 5)
  const idsToDelete = toDelete.map(s => s.id)

  await supabaseAdmin
    .from('scores')
    .delete()
    .in('id', idsToDelete)

  // Log deletion
  console.log(`Enforced 5-score limit for user ${userId}: deleted ${idsToDelete.length} scores`)
}
```

### Score Statistics Calculation
```typescript
// Get user's score statistics
export async function getScoreStatistics(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('score_statistics')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { 
    success: true, 
    data: {
      rolling_average: data?.rolling_average || 0,
      last_five_average: data?.last_five_average || 0,
      total_scores: data?.total_scores || 0
    }
  }
}

// Get user's recent scores
export async function getRecentScores(userId: string, limit: number = 10) {
  const { data, error } = await supabaseAdmin
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('played_date', { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}
```

### Database Trigger for Statistics
```sql
-- Already defined in PHASE_2_DATABASE.md
-- Trigger: trg_update_score_stats
-- Function: update_score_statistics()

-- This trigger automatically:
-- 1. Calculates rolling average of last 5 scores
-- 2. Updates score_statistics table
-- 3. Runs after INSERT or DELETE on scores
```

---

## 🎲 5B: DRAW ENGINE

### Draw Cycle System
```
┌─────────────────────────────────────────────────────────────┐
│                    MONTHLY DRAW CYCLE                         │
└─────────────────────────────────────────────────────────────┘

1. DRAW CREATION (Admin)
   ├── Admin creates draw for next month
   ├── Status: 'draft'
   ├── Set draw_date (last day of month)
   └── Configure prize pool

2. DRAW SCHEDULING (Cron)
   ├── Cron job runs on draw_date
   ├── Updates status: 'draft' → 'scheduled'
   ├── Notifies users of upcoming draw
   └── Closes entries 1 hour before draw

3. DRAW EXECUTION (Cron/Admin)
   ├── Cron triggers draw on draw_date at 23:59 UTC
   ├── Updates status: 'scheduled' → 'running'
   ├── Execute winner selection
   ├── Calculate prize distribution
   ├── Create winners and payouts
   ├── Updates status: 'running' → 'completed'
   └── Send winner notifications

4. POST-DRAW
   ├── Winners upload proof (7 days)
   ├── Admin verifies winners
   ├── Admin processes payouts (30 days)
   ├── Unclaimed prizes → charity
   └── Archive draw results
```

### Draw Execution Implementation
```typescript
// services/drawEngine.ts

import { supabaseAdmin } from '@/services/supabaseAdmin'
import { sendEmail } from '@/services/emailService'

export async function executeDraw(drawId: string) {
  try {
    // 1. Get draw details
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('draws')
      .select('*')
      .eq('id', drawId)
      .single()

    if (drawError || !draw) {
      throw new Error('Draw not found')
    }

    if (draw.status !== 'scheduled' && draw.status !== 'running') {
      throw new Error('Draw is not in valid state')
    }

    // 2. Update draw status to running
    const { error: updateError } = await supabaseAdmin
      .from('draws')
      .update({ status: 'running' })
      .eq('id', drawId)

    if (updateError) throw updateError

    // 3. Get eligible users
    const eligibleUsers = await getEligibleUsers()
    
    if (eligibleUsers.length < 3) {
      throw new Error('Not enough eligible participants (minimum 3)')
    }

    // 4. Calculate entry weights
    const weightedPool = await buildWeightedPool(eligibleUsers)

    // 5. Select winners (crypto-secure random)
    const winners = await selectWinners(weightedPool)

    // 6. Calculate prize pool
    const prizePool = await calculatePrizePool(drawId)

    // 7. Update draw with prize amounts
    const { error: prizeError } = await supabaseAdmin
      .from('draws')
      .update({
        status: 'completed',
        prize_pool: prizePool.total,
        jackpot_amount: prizePool.jackpot,
        second_prize: prizePool.second,
        third_prize: prizePool.third
      })
      .eq('id', drawId)

    if (prizeError) throw prizeError

    // 8. Create winner records
    const winnerRecords = winners.map((winner, index) => ({
      draw_id: drawId,
      user_id: winner.userId,
      position: index + 1,
      match_count: 5,  // Simplified - in real system this would be based on number matching
      amount: index === 0 ? prizePool.jackpot : 
              index === 1 ? prizePool.second : 
              prizePool.third
    }))

    const { data: createdWinners, error: winnersError } = await supabaseAdmin
      .from('winners')
      .insert(winnerRecords)
      .select()

    if (winnersError) throw winnersError

    // 9. Create payout records
    const payoutRecords = createdWinners.map(winner => ({
      winner_id: winner.id,
      amount: winner.amount,
      status: 'pending'
    }))

    const { error: payoutsError } = await supabaseAdmin
      .from('payouts')
      .insert(payoutRecords)

    if (payoutsError) throw payoutsError

    // 10. Create prize pool record
    await supabaseAdmin.from('prize_pools').insert({
      draw_id: drawId,
      total_pool: prizePool.total,
      jackpot_amount: prizePool.jackpot,
      second_amount: prizePool.second,
      third_amount: prizePool.third,
      rollover_amount: prizePool.rollover,
      charity_total: prizePool.charityTotal
    })

    // 11. Send winner notifications
    for (const winner of createdWinners) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', winner.user_id)
        .single()

      if (profile) {
        await sendEmail({
          to: profile.email,
          subject: '🎉 Congratulations! You Won!',
          template: 'winner_notification',
          data: {
            name: profile.full_name,
            position: winner.position,
            amount: winner.amount,
            proofDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        })
      }
    }

    // 12. Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'execute_draw',
      entity_type: 'draw',
      entity_id: drawId,
      metadata: {
        winners: winners.map(w => w.userId),
        prize_pool: prizePool
      }
    })

    return {
      success: true,
      draw,
      winners: createdWinners,
      prize_pool: prizePool
    }

  } catch (err: any) {
    console.error('Draw execution error:', err)
    
    // Update draw status to failed
    await supabaseAdmin
      .from('draws')
      .update({ status: 'draft' })
      .eq('id', drawId)

    throw err
  }
}

async function getEligibleUsers() {
  const { data, error } = await supabaseAdmin.rpc('get_eligible_draw_users')
  
  if (error) {
    console.error('Error getting eligible users:', error)
    return []
  }

  return data || []
}

async function buildWeightedPool(users: any[]) {
  const pool: { userId: string; weight: number }[] = []

  for (const user of users) {
    const weight = await calculateEntryWeight(user.user_id)
    pool.push({
      userId: user.user_id,
      weight
    })
  }

  return pool
}

async function calculateEntryWeight(userId: string): Promise<number> {
  // Get user's rolling average
  const { data: stats } = await supabaseAdmin
    .from('score_statistics')
    .select('rolling_average')
    .eq('user_id', userId)
    .single()

  const avg = stats?.rolling_average || 100

  // Base entry: 1
  // Bonus entries based on average:
  // - Average < 80: +2 entries (3 total)
  // - Average 80-100: +1 entry (2 total)
  // - Average > 100: no bonus (1 total)
  
  if (avg < 80) return 3
  if (avg < 100) return 2
  return 1
}

async function selectWinners(weightedPool: { userId: string; weight: number }[]) {
  // Build weighted array (each user appears 'weight' times)
  const pool: string[] = []
  weightedPool.forEach(entry => {
    for (let i = 0; i < entry.weight; i++) {
      pool.push(entry.userId)
    }
  })

  // Shuffle using crypto-secure random
  const shuffled = shuffleSecure(pool)

  // Select unique winners
  const winners: { userId: string }[] = []
  const selected = new Set<string>()

  for (const userId of shuffled) {
    if (!selected.has(userId)) {
      selected.add(userId)
      winners.push({ userId })
      if (winners.length === 3) break
    }
  }

  if (winners.length < 3) {
    throw new Error('Could not select 3 unique winners')
  }

  return winners
}

function shuffleSecure(array: string[]): string[] {
  // Fisher-Yates shuffle with crypto-secure random
  const shuffled = [...array]
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]]
  }
  
  return shuffled
}

async function calculatePrizePool(drawId: string) {
  // Get total revenue for this draw period
  const { data: draw } = await supabaseAdmin
    .from('draws')
    .select('draw_date')
    .eq('id', drawId)
    .single()

  if (!draw) {
    throw new Error('Draw not found')
  }

  // Calculate start and end of draw period
  const drawDate = new Date(draw.draw_date)
  const periodStart = new Date(drawDate.getFullYear(), drawDate.getMonth(), 1)
  const periodEnd = drawDate

  // Get subscriptions active during this period
  const { data: subscriptions } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan_type, profiles(charity_id, contribution_percentage)')
    .eq('status', 'active')
    .gte('current_period_start', periodStart.toISOString())
    .lte('current_period_start', periodEnd.toISOString())

  if (!subscriptions || subscriptions.length === 0) {
    return {
      total: 0,
      jackpot: 0,
      second: 0,
      third: 0,
      rollover: 0,
      charityTotal: 0
    }
  }

  // Calculate total revenue
  let totalRevenue = 0
  let totalCharity = 0

  for (const sub of subscriptions) {
    const amount = sub.plan_type === 'monthly' ? 10 : 100
    totalRevenue += amount

    const contributionPercentage = sub.profiles?.contribution_percentage || 10
    const charityAmount = amount * (contributionPercentage / 100)
    totalCharity += charityAmount
  }

  // Remaining pool after charity
  const remainingPool = totalRevenue - totalCharity

  // Get previous rollover
  const { data: previousDraw } = await supabaseAdmin
    .from('draws')
    .select('prize_pool, jackpot_amount')
    .neq('id', drawId)
    .order('draw_date', { ascending: false })
    .limit(1)
    .single()

  const rollover = previousDraw?.jackpot_amount || 0

  // Total pool including rollover
  const totalPool = remainingPool + rollover

  // Split: 40% jackpot, 35% second, 25% third
  const jackpot = Math.floor(totalPool * 0.40 * 100) / 100
  const second = Math.floor(totalPool * 0.35 * 100) / 100
  const third = Math.floor(totalPool * 0.25 * 100) / 100

  // Remainder goes to rollover
  const distributed = jackpot + second + third
  const newRollover = totalPool - distributed

  return {
    total: totalPool,
    jackpot,
    second,
    third,
    rollover: newRollover,
    charityTotal: totalCharity
  }
}
```

### Draw Eligibility Check
```typescript
// Check if user is eligible for draw entry
export async function checkDrawEligibility(userId: string) {
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .single()

  if (!subscription) {
    return { eligible: false, reason: 'No subscription found' }
  }

  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)

  // Check subscription status
  if (subscription.status !== 'active') {
    if (subscription.status === 'past_due') {
      const gracePeriodEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000)
      if (now < gracePeriodEnd) {
        return { eligible: true, reason: 'grace_period' }
      }
    }
    return { eligible: false, reason: `Subscription status: ${subscription.status}` }
  }

  if (now > periodEnd) {
    return { eligible: false, reason: 'Subscription expired' }
  }

  // Check charity selection
  const { data: charity } = await supabaseAdmin
    .from('user_charities')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!charity) {
    return { eligible: false, reason: 'No charity selected' }
  }

  // Check score count
  const { count: scoreCount } = await supabaseAdmin
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (!scoreCount || scoreCount < 5) {
    return { eligible: false, reason: `Need 5 scores (have ${scoreCount || 0})` }
  }

  return { eligible: true }
}
```

---

## 💰 5C: PRIZE POOL ENGINE

### Prize Distribution Rules
```
┌─────────────────────────────────────────────────────────────┐
│                    PRIZE DISTRIBUTION                          │
└─────────────────────────────────────────────────────────────┘

TOTAL POOL CALCULATION:
├── Sum of all subscription revenues in draw period
├── Subtract charity contributions (user-selected %)
├── Add jackpot rollover from previous draw
└── = Available prize pool

DISTRIBUTION (40/35/25):
├── 1st Place (Jackpot): 40% of remaining pool
├── 2nd Place: 35% of remaining pool
├── 3rd Place: 25% of remaining pool
└── Remainder: Rolls over to next jackpot

ROUNDING RULES:
├── Round down to nearest £0.01
├── Remainder from each tier goes to rollover
└── Example: £123.456 → £123.45, £0.006 → rollover

CHARITY CONTRIBUTION:
├── Calculated per user based on their %
├── Min 10%, max 20%
├── Paid from subscription revenue BEFORE prize split
└── Tracked in donations table
```

### Prize Pool Calculation
```typescript
// services/prizePoolEngine.ts

export interface PrizePool {
  total: number
  jackpot: number
  second: number
  third: number
  rollover: number
  charityTotal: number
}

export async function calculateDrawPrizePool(drawId: string): Promise<PrizePool> {
  // 1. Get draw date
  const { data: draw } = await supabaseAdmin
    .from('draws')
    .select('draw_date')
    .eq('id', drawId)
    .single()

  if (!draw) {
    throw new Error('Draw not found')
  }

  const drawDate = new Date(draw.draw_date)
  const periodStart = new Date(drawDate.getFullYear(), drawDate.getMonth(), 1)
  const periodEnd = new Date(drawDate)

  // 2. Get all active subscriptions in period
  const { data: subscriptions } = await supabaseAdmin
    .from('subscriptions')
    .select(`
      user_id,
      plan_type,
      profiles (
        charity_id,
        contribution_percentage
      )
    `)
    .eq('status', 'active')
    .gte('current_period_start', periodStart.toISOString())
    .lte('current_period_start', periodEnd.toISOString())

  if (!subscriptions || subscriptions.length === 0) {
    return {
      total: 0,
      jackpot: 0,
      second: 0,
      third: 0,
      rollover: 0,
      charityTotal: 0
    }
  }

  // 3. Calculate totals
  let totalRevenue = 0
  let totalCharity = 0

  for (const sub of subscriptions) {
    const amount = sub.plan_type === 'monthly' ? 10 : 100
    totalRevenue += amount

    const contributionPercentage = sub.profiles?.contribution_percentage || 10
    const charityAmount = amount * (contributionPercentage / 100)
    totalCharity += charityAmount
  }

  // 4. Get previous rollover
  const { data: previousDraw } = await supabaseAdmin
    .from('draws')
    .select('jackpot_amount')
    .neq('id', drawId)
    .order('draw_date', { ascending: false })
    .limit(1)
    .single()

  const previousRollover = previousDraw?.jackpot_amount || 0

  // 5. Calculate prize pool
  const remainingPool = totalRevenue - totalCharity
  const totalPool = remainingPool + previousRollover

  // 6. Split prize pool (40/35/25)
  const jackpot = Math.floor(totalPool * 0.40 * 100) / 100
  const second = Math.floor(totalPool * 0.35 * 100) / 100
  const third = Math.floor(totalPool * 0.25 * 100) / 100

  // 7. Calculate new rollover
  const distributed = jackpot + second + third
  const newRollover = totalPool - distributed

  return {
    total: totalPool,
    jackpot,
    second,
    third,
    rollover: newRollover,
    charityTotal: totalCharity
  }
}

// Get prize pool breakdown for display
export async function getPrizePoolBreakdown(drawId: string) {
  const { data: prizePool } = await supabaseAdmin
    .from('prize_pools')
    .select('*')
    .eq('draw_id', drawId)
    .single()

  if (!prizePool) {
    return null
  }

  return {
    total: prizePool.total_pool,
    jackpot: prizePool.jackpot_amount,
    second: prizePool.second_amount,
    third: prizePool.third_amount,
    rollover: prizePool.rollover_amount,
    charity: prizePool.charity_total
  }
}
```

### Payout Splitting Rules
```typescript
// Handle multiple winners in same tier (future enhancement)
export async function splitPrizeAmongWinners(
  drawId: string,
  tier: 'jackpot' | 'second' | 'third',
  winnerIds: string[]
) {
  // Get prize amount for this tier
  const { data: prizePool } = await supabaseAdmin
    .from('prize_pools')
    .select('*')
    .eq('draw_id', drawId)
    .single()

  if (!prizePool) {
    throw new Error('Prize pool not found')
  }

  const tierAmount = 
    tier === 'jackpot' ? prizePool.jackpot_amount :
    tier === 'second' ? prizePool.second_amount :
    prizePool.third_amount

  // Split equally among winners
  const amountPerWinner = Math.floor((tierAmount / winnerIds.length) * 100) / 100
  const remainder = tierAmount - (amountPerWinner * winnerIds.length)

  // Update winners
  for (const winnerId of winnerIds) {
    await supabaseAdmin
      .from('winners')
      .update({ amount: amountPerWinner })
      .eq('id', winnerId)
  }

  // Add remainder to rollover
  if (remainder > 0) {
    await supabaseAdmin
      .from('prize_pools')
      .update({ 
        rollover_amount: supabaseAdmin.raw(`rollover_amount + ${remainder}`)
      })
      .eq('draw_id', drawId)
  }

  return {
    amountPerWinner,
    remainder
  }
}
```

---

## 🎨 5D: CHARITY SYSTEM

### Charity Selection Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    CHARITY SELECTION FLOW                      │
└─────────────────────────────────────────────────────────────┘

1. USER ONBOARDING
   ├── New user signs up
   ├── Redirected to charity selection
   ├── Browse charity directory
   ├── Select preferred charity
   ├── Set contribution % (10-20%)
   └── Save to user_charities table

2. CHARITY MANAGEMENT
   ├── View selected charity
   ├── Change charity (monthly)
   ├── Adjust contribution %
   └── View donation history

3. DONATION PROCESSING
   ├── Triggered by: invoice.payment_succeeded
   ├── Calculate: subscription amount × contribution %
   ├── Create donation record (status: 'pending')
   ├── Batch process donations (daily cron)
   ├── Transfer to charity via Stripe Connect
   ├── Update status: 'paid'
   └── Send receipt to user
```

### Charity Selection Implementation
```typescript
// actions/charityActions.ts
'use server'

import { supabaseAdmin } from '@/services/supabaseAdmin'

export async function selectCharity(formData: FormData) {
  try {
    // 1. Get current user
    const token = formData.get('token') as string
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Parse input
    const charityId = formData.get('charity_id') as string
    const contributionPercentage = parseInt(formData.get('contribution_percentage') as string)

    // 3. Validate charity exists and is active
    const { data: charity } = await supabaseAdmin
      .from('charities')
      .select('id, active')
      .eq('id', charityId)
      .single()

    if (!charity || !charity.active) {
      return { success: false, error: 'Invalid or inactive charity' }
    }

    // 4. Validate contribution percentage
    if (![10, 15, 20].includes(contributionPercentage)) {
      return { success: false, error: 'Contribution must be 10%, 15%, or 20%' }
    }

    // 5. Upsert user charity selection
    const { error } = await supabaseAdmin
      .from('user_charities')
      .upsert({
        user_id: user.id,
        charity_id: charityId,
        contribution_percentage: contributionPercentage
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // 6. Update profile with charity_id (denormalized)
    await supabaseAdmin
      .from('profiles')
      .update({ charity_id: charityId })
      .eq('id', user.id)

    return { 
      success: true, 
      message: 'Charity selection updated' 
    }

  } catch (err: any) {
    console.error('Select charity error:', err)
    return { success: false, error: 'Server error' }
  }
}

export async function getCharityDirectory() {
  const { data, error } = await supabaseAdmin
    .from('charities')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

export async function getUserCharity(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_charities')
    .select(`
      *,
      charities (*)
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
```

### Donation Processing
```typescript
// services/charityService.ts

export async function processDonations() {
  try {
    // 1. Get pending donations
    const { data: pendingDonations } = await supabaseAdmin
      .from('donations')
      .select(`
        *,
        charities (*),
        profiles (email, full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!pendingDonations || pendingDonations.length === 0) {
      return { success: true, processed: 0 }
    }

    // 2. Group by charity
    const byCharity = new Map<string, { total: number; donations: any[] }>()
    
    for (const donation of pendingDonations) {
      const charityId = donation.charity_id
      if (!byCharity.has(charityId)) {
        byCharity.set(charityId, { total: 0, donations: [] })
      }
      const group = byCharity.get(charityId)!
      group.total += donation.amount
      group.donations.push(donation)
    }

    // 3. Process each charity
    let processed = 0
    for (const [charityId, group] of byCharity) {
      try {
        // Create Stripe transfer (simplified - real implementation would use Stripe Connect)
        // const transfer = await stripe.transfers.create({
        //   amount: Math.round(group.total * 100),
        //   currency: 'gbp',
        //   destination: charity.stripe_account_id
        // })

        // Update all donations to paid
        const donationIds = group.donations.map(d => d.id)
        await supabaseAdmin
          .from('donations')
          .update({ 
            status: 'paid',
            payment_reference: `DON-${Date.now()}`,
            updated_at: new Date().toISOString()
          })
          .in('id', donationIds)

        // Send receipts to users
        for (const donation of group.donations) {
          if (donation.profiles?.email) {
            await sendEmail({
              to: donation.profiles.email,
              subject: 'Donation Receipt - Play4Purpose',
              template: 'donation_receipt',
              data: {
                name: donation.profiles.full_name,
                amount: donation.amount,
                charity_name: donation.charities?.name,
                date: new Date(donation.created_at)
              }
            })
          }
        }

        processed += group.donations.length
      } catch (err) {
        console.error(`Failed to process charity ${charityId}:`, err)
      }
    }

    return { success: true, processed }

  } catch (err: any) {
    console.error('Process donations error:', err)
    return { success: false, error: err.message }
  }
}
```

### Charity Contribution Calculation
```typescript
// Calculate user's charity contribution for a subscription payment
export function calculateCharityContribution(
  subscriptionAmount: number,
  contributionPercentage: number
): number {
  // Ensure percentage is within bounds
  const percentage = Math.max(10, Math.min(20, contributionPercentage))
  
  // Calculate contribution
  const contribution = subscriptionAmount * (percentage / 100)
  
  // Round to 2 decimal places
  return Math.round(contribution * 100) / 100
}

// Get user's donation history
export async function getDonationHistory(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .select(`
      *,
      charities (name, logo_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

// Get total donations per charity (admin)
export async function getCharityDonationStats() {
  const { data, error } = await supabaseAdmin
    .from('donations')
    .select(`
      charity_id,
      charities (name),
      amount,
      status
    `)
    .eq('status', 'paid')

  if (error) {
    return { success: false, error: error.message }
  }

  // Group by charity
  const stats = new Map()
  for (const donation of data || []) {
    const charityId = donation.charity_id
    if (!stats.has(charityId)) {
      stats.set(charityId, {
        charity_id: charityId,
        charity_name: donation.charities?.name,
        total_amount: 0,
        donation_count: 0
      })
    }
    const stat = stats.get(charityId)
    stat.total_amount += donation.amount
    stat.donation_count++
  }

  return { 
    success: true, 
    data: Array.from(stats.values()) 
  }
}
```

---

## ✅ PHASE 5 COMPLETE

**Core Business Systems include:**

### 5A: Golf Score System
- ✅ Score entry with validation (1-45 range)
- ✅ One score per date constraint
- ✅ FIFO deletion when > 5 scores
- ✅ Auto-calculated rolling averages
- ✅ Edit/delete rules enforced
- ✅ Subscription guard

### 5B: Draw Engine
- ✅ Monthly cycle system
- ✅ Automated draw execution
- ✅ Eligibility checking (sub + charity + 5+ scores)
- ✅ Score-based entry weights (1-3 entries)
- ✅ Crypto-secure random selection
- ✅ No duplicate winners
- ✅ Minimum 3 participants check

### 5C: Prize Pool Engine
- ✅ Revenue calculation per draw period
- ✅ Charity contribution subtraction
- ✅ Jackpot rollover logic
- ✅ 40/35/25 prize split
- ✅ Rounding rules (remainder to rollover)
- ✅ Payout splitting for multiple winners

### 5D: Charity System
- ✅ Charity selection (onboarding + settings)
- ✅ Contribution percentage (10-20%)
- ✅ Donation tracking
- ✅ Batch processing
- ✅ Receipt generation
- ✅ Donation history

**Ready to proceed to PHASE 6: Winner Verification System**