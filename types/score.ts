export interface Score {
  id: string
  user_id: string
  score: number
  played_date: string
  created_at: string
}

export interface ScoreStatistics {
  id: string
  user_id: string
  rolling_average: number
  last_five_average: number
  updated_at: string
}
