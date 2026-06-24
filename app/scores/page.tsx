"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function ScoresPage() {
  const router = useRouter()
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ score: '', played_date: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({ score: '', played_date: '' })

  const loadScores = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/scores?limit=100', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Failed to load scores')

      setScores(json.data || json.scores || [])
    } catch (err: any) {
      console.error('[scores page] Failed to load scores:', err)
      setError(err?.message || 'Failed to load scores')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadScores()
  }, [loadScores])

  function startEdit(score: any) {
    setEditingId(score.id)
    setEditFormData({ score: String(score.score_value ?? ''), played_date: score.score_date || '' })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditFormData({ score: '', played_date: '' })
  }

  async function saveEdit(id: string) {
    setSubmitting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch(`/api/scores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          score: Number(editFormData.score),
          score_date: editFormData.played_date
        })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Failed to update score')

      setEditingId(null)
      setEditFormData({ score: '', played_date: '' })
      await loadScores()
    } catch (err: any) {
      console.error('[scores page] Failed to update score:', err)
      setError(err?.message || 'Failed to update score')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteScore(id: string) {
    if (!confirm('Are you sure you want to delete this score?')) return
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch(`/api/scores/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Failed to delete score')

      await loadScores()
    } catch (err: any) {
      console.error('[scores page] Failed to delete score:', err)
      setError(err?.message || 'Failed to delete score')
    }
  }

  async function submitScore(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          score: Number(formData.score),
          score_date: formData.played_date
        })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Failed to add score')

      setFormData({ score: '', played_date: '' })
      await loadScores()
    } catch (err: any) {
      console.error('[scores page] Failed to add score:', err)
      setError(err?.message || 'Failed to add score')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const lastFive = scores.slice(0, 5)
  const average = lastFive.length > 0
    ? (lastFive.reduce((sum, score) => sum + Number(score.score_value || 0), 0) / lastFive.length).toFixed(1)
    : '-'

  if (loading) return <div className="app-page flex items-center justify-center text-muted">Loading scores...</div>

  return (
    <div className="app-page">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-eyebrow">Performance</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-5xl">My Scores</h1>
            <p className="mt-2 text-muted">Log rounds, tune your form, and keep your prize draw profile current.</p>
          </div>
          <div className="brutal-card score-spark px-5 py-4">
            <p className="text-sm font-bold text-muted">Last 5 average</p>
            <p className="text-3xl font-black text-primary">{average}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="brutal-card p-6">
              <p className="section-eyebrow">New round</p>
              <h2 className="mb-4 text-xl font-black">Add Score</h2>
              <form onSubmit={submitScore} className="space-y-4">
                <div>
                  <label htmlFor="score" className="block text-sm font-bold mb-2">Score (1-45)</label>
                  <input
                    id="score"
                    type="number"
                    min="1"
                    max="45"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    className="brutal-input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="played_date" className="block text-sm font-bold mb-2">Date Played</label>
                  <input
                    id="played_date"
                    type="date"
                    value={formData.played_date}
                    onChange={(e) => setFormData({ ...formData, played_date: e.target.value })}
                    className="brutal-input"
                    required
                    max={today}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="brutal-btn brutal-btn-primary w-full"
                >
                  {submitting ? 'Saving...' : 'Add Score'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="brutal-card mb-6 p-6">
              <p className="section-eyebrow">Snapshot</p>
              <h2 className="mb-4 text-xl font-black">Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md bg-white/55 p-3">
                  <p className="text-sm text-muted">Total Scores</p>
                  <p className="text-2xl font-black">{scores.length}</p>
                </div>
                <div className="rounded-md bg-white/55 p-3">
                  <p className="text-sm text-muted">Last 5 Average</p>
                  <p className="text-2xl font-black text-primary">{average}</p>
                </div>
              </div>
            </div>

            <div className="brutal-card p-6">
              <p className="section-eyebrow">Timeline</p>
              <h2 className="mb-4 text-xl font-black">Score History</h2>
              {scores.length === 0 ? (
                <p className="text-muted text-center py-8">No scores recorded yet. Add your first score.</p>
              ) : (
                <div className="space-y-2">
                  {scores.map((score) => (
                    <div key={score.id} className="flex flex-col gap-3 rounded-md border border-black/10 bg-white/65 p-3 md:flex-row md:items-center md:justify-between">
                      {editingId === score.id ? (
                        <div className="flex-1 grid grid-cols-1 gap-2 md:grid-cols-2">
                          <input
                            id={`edit-score-${score.id}`}
                            type="number"
                            min="1"
                            max="45"
                            value={editFormData.score}
                            onChange={(e) => setEditFormData({ ...editFormData, score: e.target.value })}
                            className="brutal-input text-sm"
                            title="Score from 1 to 45"
                          />
                          <input
                            id={`edit-date-${score.id}`}
                            type="date"
                            value={editFormData.played_date}
                            onChange={(e) => setEditFormData({ ...editFormData, played_date: e.target.value })}
                            className="brutal-input text-sm"
                            title="Date played"
                            max={today}
                          />
                          <div className="md:col-span-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(score.id)}
                              disabled={submitting}
                              className="brutal-btn bg-green-600 text-white text-xs flex-1"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="brutal-btn brutal-btn-outline text-xs flex-1"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="font-bold text-lg">{score.score_value}</span>
                            <span className="text-muted text-sm ml-2">strokes</span>
                          </div>
                          <div className="text-sm text-muted">
                            {new Date(score.score_date).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(score)}
                              className="brutal-btn bg-blue-600 text-white text-xs"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteScore(score.id)}
                              className="brutal-btn bg-red-600 text-white text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
