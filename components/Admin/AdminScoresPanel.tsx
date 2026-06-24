"use client"

import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminScoresPanel() {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchScores()
  }, [])

  async function fetchScores() {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('Admin session not found. Please sign in again.')
        return
      }

      const scoresRes = await fetch('/api/admin/scores?limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      const scoresJson = await scoresRes.json()
      console.log('[admin/scores] response', { status: scoresRes.status, ok: scoresRes.ok, json: scoresJson })
      if (!scoresRes.ok || !scoresJson.ok) throw new Error(scoresJson?.error || 'Failed to load scores')

      setScores(scoresJson.scores || scoresJson.data || [])
    } catch (err: any) {
      console.error('[admin scores] Failed to load scores:', err)
      setError(err?.message || 'Failed to load scores')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading scores...</div>
  if (error) return <div className="brutal-card p-6 text-red-400">{error}</div>

  return (
    <div className="brutal-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">User ID</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Score</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Date Played</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {scores.map((score) => (
              <tr key={score.id}>
                <td className="px-4 py-3 text-sm">{score.user_id}</td>
                <td className="px-4 py-3 text-sm font-bold">{score.score_value}</td>
                <td className="px-4 py-3 text-sm">{new Date(score.score_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">{score.created_at ? new Date(score.created_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scores.length === 0 && <div className="p-6 text-center text-muted">No scores found</div>}
    </div>
  )
}
