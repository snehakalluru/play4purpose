"use client"
import React, { useState } from 'react'
import { submitScore } from '../../actions/scoreActions'

export default function ScoreForm() {
  const [score, setScore] = useState<number | ''>('')
  const [playedDate, setPlayedDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [latest, setLatest] = useState<any[] | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (score === '' || !playedDate) return setError('Score and date are required')
    if (!Number.isInteger(score) || score < 40 || score > 200) return setError('Score must be between 40 and 200')

    setLoading(true)
    const res = await submitScore({ score: Number(score), played_date: playedDate })
    setLoading(false)
    if (!res.ok) return setError(res.error || 'Failed to submit score')
    setSuccess(true)
    setLatest(res.scores || null)
    setScore('')
    setPlayedDate('')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-md p-6 bg-surface border-2 border-black rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
      <form onSubmit={onSubmit} className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tight">Enter Your Score</h2>
        {error && <div className="p-2 bg-red-500 text-white font-bold text-sm border-2 border-black">{error}</div>}
        {success && <div className="p-2 bg-green-500 text-white font-bold text-sm border-2 border-black">Score saved!</div>}
        <div>
          <label className="block text-sm font-bold uppercase mb-1">Score (40–200)</label>
          <input
            type="number"
            min={40}
            max={200}
            value={score as any}
            onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full px-3 py-2 border-2 border-black rounded-md bg-white text-black font-bold"
            placeholder="e.g. 95"
          />
        </div>
        <div>
          <label className="block text-sm font-bold uppercase mb-1">Date Played</label>
          <input
            type="date"
            max={today}
            value={playedDate}
            onChange={(e) => setPlayedDate(e.target.value)}
            className="w-full px-3 py-2 border-2 border-black rounded-md bg-white text-black font-bold"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-primary text-white font-black uppercase border-2 border-black rounded-md shadow-[3px_3px_0px_rgba(0,0,0,0.8)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_rgba(0,0,0,0.8)] transition-all"
        >
          {loading ? 'SAVING...' : 'SAVE SCORE'}
        </button>
      </form>

      {latest && (
        <div className="mt-6 border-t-2 border-black pt-4">
          <h3 className="font-black uppercase text-sm mb-2">Last 5 Scores</h3>
          <ul className="space-y-1">
            {latest.map((s: any) => (
              <li key={s.id} className="flex justify-between text-sm font-bold">
                <span>Round: {s.score}</span>
                <span className="text-muted">{new Date(s.played_date || s.score_date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 p-2 bg-accent/20 border-2 border-black font-black text-sm">
            Average: {(latest.reduce((sum: number, s: any) => sum + s.score, 0) / latest.length).toFixed(1)}
          </div>
        </div>
      )}
    </div>
  )
}
