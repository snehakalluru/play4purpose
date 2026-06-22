import type { ScoreInput } from '../validators/score'

export async function submitScore(payload: ScoreInput) {
  // server action will validate and insert score into Supabase
  return { ok: true }
}
