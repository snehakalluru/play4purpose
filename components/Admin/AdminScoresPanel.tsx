"use client"

import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminScoresPanel() {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDate, setEditDate] = useState('')

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

  function startEdit(score: any) {
    setEditingId(score.id)
    setEditValue(String(score.score_value ?? ''))
    setEditDate(score.score_date ? String(score.score_date).slice(0, 10) : '')
  }

  async function saveScore(scoreId: string) {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setError('Admin session not found. Please sign in again.')
      return
    }

    const res = await fetch('/api/admin/scores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score_id: scoreId, score_value: Number(editValue), score_date: editDate })
    })
    const json = await res.json()
    if (!res.ok || !json.ok) {
      setError(json?.error || 'Failed to update score')
      return
    }

    setEditingId(null)
    setEditValue('')
    setEditDate('')
    fetchScores()
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
              <th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {scores.map((score) => (
              <tr key={score.id}>
                <td className="px-4 py-3 text-sm">{score.user_id}</td>
                <td className="px-4 py-3 text-sm font-bold">
                  {editingId === score.id ? (
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="brutal-input w-24"
                    />
                  ) : score.score_value}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editingId === score.id ? (
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="brutal-input"
                    />
                  ) : new Date(score.score_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">{score.created_at ? new Date(score.created_at).toLocaleString() : '-'}</td>
                <td className="px-4 py-3 text-sm">
                  {editingId === score.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveScore(score.id)} className="brutal-btn bg-green-600 text-white text-xs">Save</button>
                      <button onClick={() => setEditingId(null)} className="brutal-btn brutal-btn-outline text-xs">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(score)} className="brutal-btn brutal-btn-outline text-xs">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scores.length === 0 && <div className="p-6 text-center text-muted">No scores found</div>}
    </div>
  )
}
