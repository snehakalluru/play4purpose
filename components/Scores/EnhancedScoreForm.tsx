"use client"
import React, { useState, useEffect } from 'react'

export default function EnhancedScoreForm({ onSubmit, loading }: { onSubmit: (score: number, date: string) => void, loading: boolean }) {
  const [score, setScore] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    setAnimateIn(true)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const scoreNum = parseInt(score)
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 45) {
      alert('Score must be between 1 and 45')
      return
    }
    onSubmit(scoreNum, date)
    setScore('')
    setDate(new Date().toISOString().split('T')[0])
  }

  const getScoreEmoji = (s: number) => {
  if (s <= 10) return '😢'
  if (s <= 20) return '😐'
  if (s <= 30) return '🙂'
  if (s <= 40) return '🔥'
  return '🏆'
  }

  const getScoreColor = (s: number) => {
  if (s <= 10) return 'text-red-400'
  if (s <= 20) return 'text-orange-400'
  if (s <= 30) return 'text-yellow-400'
  if (s <= 40) return 'text-blue-400'
  return 'text-green-400'
}

  return (
    <div className={`brutal-card p-8 transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black mb-2">Submit Your Score</h2>
        <p className="text-muted">Every round counts towards your next draw entry</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Score Input with Visual Feedback */}
        <div className="space-y-2">
          <label htmlFor="score" className="block text-sm font-bold text-center">
            Your Score
          </label>
          <div className="relative">
            <input
              id="score"
              type="number"
              min="1"
              max="45"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="brutal-input text-center text-4xl font-black h-24"
              placeholder="85"
              required
            />
            {score && parseInt(score) >= 1 && parseInt(score) <= 45 && (
              <div className="absolute -right-4 -top-4 text-4xl animate-bounce">
                {getScoreEmoji(parseInt(score))}
              </div>
            )}
          </div>
          {score && parseInt(score) >= 1 && parseInt(score) <= 45 && (
            <p className={`text-center text-sm font-semibold ${getScoreColor(parseInt(score))}`}>
              {parseInt(score) < 80 ? 'Amazing round!' :
               parseInt(score) < 90 ? 'Great score!' :
               parseInt(score) < 100 ? 'Good round!' :
               parseInt(score) < 110 ? 'Nice game!' :
               'Keep practicing!'}
            </p>
          )}
        </div>

        {/* Date Input */}
        <div>
          <label htmlFor="played_date" className="block text-sm font-bold mb-2">
            Date Played
          </label>
          <input
            id="played_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="brutal-input"
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !score}
          className="brutal-btn brutal-btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Submit Score'
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-surface/50 rounded-lg border border-white/10">
        <p className="text-xs text-muted text-center">
          💡 Your last 5 scores determine your draw entry. Keep playing to improve your average!
        </p>
      </div>
    </div>
  )
}
