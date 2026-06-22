import type { DrawStatus } from './db'

export interface Draw {
  id: string
  name: string
  draw_date: string
  status: DrawStatus
  prize_pool: number
  jackpot_amount: number
  second_prize: number
  third_prize: number
  winning_number?: string | null
  created_by?: string | null
  created_at: string
}