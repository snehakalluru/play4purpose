"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function ScoresPage() {
  const router = useRouter()
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ score: '', played_date: '' })

  useEffect(() => {
    loadScores()
  }, [])

  async function loadScores() {
    const { data } = await supabase.auth.getUser()
    const user = (data as any)?.user
    if (!user) return router.push('/login')

    const token = (data as any).session?.access_token
    const res = await fetch('/api/scores', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    if (json.ok) setScores(json.data || [])
    setLoading(false)
  }

  async function submitScore(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const { data } = await supabase.auth.getUser()
    const user = (data as any)?.user
    if (!user) return router.push('/login')

    const token = (data as any).session?.access_token
    const res = await fetch('/api/scores/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        score: parseInt(formData.score),
        played_date: formData.played_date,
        user_id: user.id
      })
    })

    const json = await res.json()
    if (res.ok) {
      setFormData({ score: '', played_date: '' })
      loadScores()
    } else {
      alert(json.error || 'Failed to add score')
    }
    setSubmitting(false)
  }

  // Calculate rolling average from last 5 scores
  const lastFive = scores.slice(0, 5)
  const average = lastFive.length > 0
    ? (lastFive.reduce((sum, s) => sum + s.score, 0) / lastFive.length).toFixed(1)
    : '—'

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-6 uppercase">My Scores</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Entry Form */}
          <div className="lg:col-span-1">
            <div className="brutal-card p-6">
              <h2 className="text-xl font-bold mb-4">Add New Score</h2>
              <form onSubmit={submitScore} className="space-y-4">
                <div>
                  <label htmlFor="score" className="block text-sm font-bold mb-2">Score (40-200)</label>
                  <input
                    id="score"
                    type="number"
                    min="40"
                    max="200"
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
                    max={new Date().toISOString().split('T')[0]}
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

          {/* Scores List */}
          <div className="lg:col-span-2">
            {/* Stats Card */}
            <div className="brutal-card p-6 mb-6">
              <h2 className="text-xl font-bold mb-3">Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted">Total Scores</p>
                  <p className="text-2xl font-black">{scores.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Last 5 Average</p>
                  <p className="text-2xl font-black text-primary">{average}</p>
                </div>
              </div>
            </div>

            {/* Scores Table */}
            <div className="brutal-card p-6">
              <h2 className="text-xl font-bold mb-4">Score History</h2>
              {scores.length === 0 ? (
                <p className="text-muted text-center py-8">No scores recorded yet. Add your first score!</p>
              ) : (
                <div className="space-y-2">
                  {scores.map((s) => (
                    <div key={s.id} className="flex justify-between items-center p-3 bg-surface rounded">
                      <div>
                        <span className="font-bold text-lg">{s.score}</span>
                        <span className="text-muted text-sm ml-2">strokes</span>
                      </div>
                      <div className="text-sm text-muted">
                        {new Date(s.played_date).toLocaleDateString()}
                      </div>
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