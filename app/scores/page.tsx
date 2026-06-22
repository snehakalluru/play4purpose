"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function ScoresPage() {
  const router = useRouter()
  const [scoreValue, setScoreValue] = useState<number>(0)
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = (data as any)?.user
      if (!user) {
        router.push('/login')
        return
      }

      await fetchScores()
      if (mounted) setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [router])

  async function fetchScores() {
    const res = await fetch('/api/scores')
    const json = await res.json()
    if (json.ok) setScores(json.data || [])
  }

  async function submitScore(e?: React.FormEvent) {
    e?.preventDefault()
    const { data } = await supabase.auth.getUser()
    const user = (data as any)?.user
    if (!user) return router.push('/login')

    await fetch('/api/scores/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: scoreValue, user_id: user.id })
    })
    setScoreValue(0)
    await fetchScores()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Scores</h1>
      <form onSubmit={submitScore}>
        <input type="number" value={scoreValue} onChange={(e) => setScoreValue(Number(e.target.value))} />
        <button type="submit">Add score</button>
      </form>

      <h2>Your scores</h2>
      <ul>
        {scores.map((s: any) => (
          <li key={s.id || s.created_at}>{s.user_id} — {s.score}</li>
        ))}
      </ul>
    </div>
  )
}
