// Minimal in-memory store as fallback when Supabase is not configured.
type Score = { id: string; user_id: string; score: number; score_date: string; created_at: string }
type Winner = { id: string; draw_id: string; user_id: string; prize_amount: number; created_at: string }

const scores: Score[] = []
const winners: Winner[] = []

export const SimpleStore = {
  getScores: async () => scores,
  addScore: async (s: Omit<Score, 'created_at'>) => {
    const item = { ...s, created_at: new Date().toISOString() }
    scores.push(item as Score)
    return item as Score
  },
  getWinners: async () => winners,
  addWinner: async (w: Omit<Winner, 'created_at'>) => {
    const item = { ...w, created_at: new Date().toISOString() }
    winners.push(item as Winner)
    return item as Winner
  }
}

export default SimpleStore
