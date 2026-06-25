import { supabaseAdmin } from '../services/supabaseAdmin'

export type DrawMode = 'random' | 'algorithmic'
export type DrawAction = 'simulate' | 'publish'

export type DrawEntrySnapshot = {
  user_id: string
  numbers: number[]
}

export type DrawWinnerSnapshot = DrawEntrySnapshot & {
  match_count: 3 | 4 | 5
  match_type: '3-match' | '4-match' | '5-match'
  prize_amount: number
}

const DRAW_SIZE = 5
const MIN_NUMBER = 1
const MAX_NUMBER = 45

export function monthBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  return {
    start: start.toISOString().slice(0, 10),
    next: next.toISOString().slice(0, 10),
    label: start.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
}

function randomInt(maxExclusive: number) {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] % maxExclusive
}

function uniqueRandomNumbers(excluded: Set<number> = new Set()) {
  const numbers: number[] = []
  while (numbers.length < DRAW_SIZE) {
    const value = MIN_NUMBER + randomInt(MAX_NUMBER)
    if (!excluded.has(value) && !numbers.includes(value)) numbers.push(value)
  }
  return numbers.sort((a, b) => a - b)
}

function normalizeFiveNumbers(rawScores: number[]) {
  const picked: number[] = []
  for (const value of rawScores) {
    if (Number.isInteger(value) && value >= MIN_NUMBER && value <= MAX_NUMBER && !picked.includes(value)) {
      picked.push(value)
    }
    if (picked.length === DRAW_SIZE) break
  }

  const excluded = new Set(picked)
  while (picked.length < DRAW_SIZE) {
    const value = MIN_NUMBER + randomInt(MAX_NUMBER)
    if (!excluded.has(value)) {
      picked.push(value)
      excluded.add(value)
    }
  }

  return picked.sort((a, b) => a - b)
}

function scoreValue(row: any) {
  return Number(row.score_value ?? row.score ?? row.scoreValue)
}

async function fetchScores(): Promise<any[]> {
  const selectAttempts = [
    'user_id,score_value,score_date,created_at',
    'user_id,score,score_date,created_at'
  ]

  for (const select of selectAttempts) {
    const result = await supabaseAdmin
      .from('scores')
      .select(select)
      .order('score_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (!result.error) return (result.data || []) as any[]
    const message = String(result.error.message || '')
    if (!message.includes('score_value') && !message.includes('score')) throw result.error
  }

  return []
}

export async function getEligibleDrawEntries() {
  const rows = await fetchScores()
  const byUser = new Map<string, number[]>()

  for (const row of rows) {
    if (!row.user_id) continue
    const value = scoreValue(row)
    if (!Number.isInteger(value) || value < MIN_NUMBER || value > MAX_NUMBER) continue
    const scores = byUser.get(row.user_id) || []
    if (scores.length < DRAW_SIZE) scores.push(value)
    byUser.set(row.user_id, scores)
  }

  return [...byUser.entries()]
    .filter(([, scores]) => scores.length >= DRAW_SIZE)
    .map(([user_id, scores]) => ({ user_id, numbers: normalizeFiveNumbers(scores) }))
}

function weightedPick(weightByNumber: Map<number, number>, excluded: Set<number>) {
  const candidates = [...weightByNumber.entries()].filter(([value]) => !excluded.has(value))
  const total = candidates.reduce((sum, [, weight]) => sum + Math.max(0.0001, weight), 0)
  let cursor = Math.random() * total

  for (const [value, weight] of candidates) {
    cursor -= Math.max(0.0001, weight)
    if (cursor <= 0) return value
  }

  return candidates[0]?.[0] ?? MIN_NUMBER
}

export function generateWinningNumbers(entries: DrawEntrySnapshot[], mode: DrawMode) {
  if (mode === 'random' || entries.length === 0) return uniqueRandomNumbers()

  const frequencies = new Map<number, number>()
  for (let value = MIN_NUMBER; value <= MAX_NUMBER; value += 1) frequencies.set(value, 1)
  for (const entry of entries) {
    for (const value of entry.numbers) frequencies.set(value, (frequencies.get(value) || 1) + 1)
  }

  const maxFrequency = Math.max(...frequencies.values())
  const mostFrequent = new Map([...frequencies.entries()].map(([value, count]) => [value, count]))
  const leastFrequent = new Map([...frequencies.entries()].map(([value, count]) => [value, maxFrequency + 1 - count]))
  const picked = new Set<number>()

  while (picked.size < DRAW_SIZE) {
    const weights = picked.size % 2 === 0 ? mostFrequent : leastFrequent
    picked.add(weightedPick(weights, picked))
  }

  return [...picked].sort((a, b) => a - b)
}

export function matchCount(entryNumbers: number[], winningNumbers: number[]) {
  const winning = new Set(winningNumbers)
  return entryNumbers.filter((value) => winning.has(value)).length
}

export async function getLatestRolloverAmount() {
  const result = await supabaseAdmin
    .from('prize_pools')
    .select('rollover_amount,created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (result.error) return 0
  return Number(result.data?.[0]?.rollover_amount || 0)
}

export function calculateWinners(
  entries: DrawEntrySnapshot[],
  winningNumbers: number[],
  basePrizePool: number,
  rolloverAmount: number
) {
  const totalPool = Math.max(0, basePrizePool) + Math.max(0, rolloverAmount)
  const pool5 = Math.round(totalPool * 0.4 * 100) / 100
  const pool4 = Math.round(totalPool * 0.35 * 100) / 100
  const pool3 = Math.round(totalPool * 0.25 * 100) / 100
  const matched = entries
    .map((entry) => ({ ...entry, match_count: matchCount(entry.numbers, winningNumbers) }))
    .filter((entry) => entry.match_count >= 3) as Array<DrawEntrySnapshot & { match_count: 3 | 4 | 5 }>

  const counts = {
    5: matched.filter((entry) => entry.match_count === 5).length,
    4: matched.filter((entry) => entry.match_count === 4).length,
    3: matched.filter((entry) => entry.match_count === 3).length
  }

  const winners: DrawWinnerSnapshot[] = matched.map((entry) => {
    const tierPool = entry.match_count === 5 ? pool5 : entry.match_count === 4 ? pool4 : pool3
    const tierCount = counts[entry.match_count]
    const prizeAmount = tierCount > 0 ? Math.round((tierPool / tierCount) * 100) / 100 : 0
    return {
      ...entry,
      match_type: `${entry.match_count}-match` as DrawWinnerSnapshot['match_type'],
      prize_amount: prizeAmount
    }
  })

  return {
    winners,
    counts,
    totalPool,
    pools: { pool5, pool4, pool3 },
    rolloverAmount: counts[5] === 0 ? pool5 : 0
  }
}
