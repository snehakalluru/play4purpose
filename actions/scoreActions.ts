import type { ScoreInput } from '../validators/score'
import { supabase } from '../services/supabaseClient'

export async function submitScore(payload: ScoreInput) {
  const session = await supabase.auth.getSession()
  const token = session.data?.session?.access_token
  if (!token) return { ok: false, error: 'Not authenticated' }

  const res = await fetch('/api/scores/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  const json = await res.json()
  if (!res.ok) return { ok: false, error: json?.error || 'Failed to submit score' }
  return { ok: true, scores: json.scores }
}

export async function getScores(): Promise<{ ok: boolean; scores?: any[]; error?: string }> {
  const session = await supabase.auth.getSession()
  const token = session.data?.session?.access_token
  if (!token) return { ok: false, error: 'Not authenticated' }

  const res = await fetch('/api/scores', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  if (!res.ok) return { ok: false, error: json?.error || 'Failed to fetch scores' }
  return { ok: true, scores: json.data }
}
