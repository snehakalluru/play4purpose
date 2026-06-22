'use client'
import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) {
        setError(resetError.message)
      } else {
        setMessage('Check your email for the reset link')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-100 border-2 border-red-600 text-red-700 px-4 py-3 font-bold text-sm shadow-[2px_2px_0px_rgba(220,38,38,0.8)]">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-100 border-2 border-green-600 text-green-800 px-4 py-3 font-bold text-sm shadow-[2px_2px_0px_rgba(22,163,74,0.8)]">
          {message}
        </div>
      )}
      <div>
        <label htmlFor="forgotEmail" className="block text-sm font-bold mb-1">
          Email address
        </label>
        <input
          id="forgotEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="brutal-input w-full"
          required
        />
      </div>
      <button
        type="submit"
        className="brutal-btn brutal-btn-primary w-full"
        disabled={loading}
      >
        {loading ? 'Sending link...' : 'Send reset link'}
      </button>
    </form>
  )
}