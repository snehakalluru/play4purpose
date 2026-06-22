'use client'
import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function RegisterForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // POST to registration API
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      // Auto-login: sign in with the same credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
      router.push('/onboarding/charity')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
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
      <div>
        <label htmlFor="fullName" className="block text-sm font-bold mb-1">
          Full name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="brutal-input w-full"
          required
        />
      </div>
      <div>
        <label htmlFor="regEmail" className="block text-sm font-bold mb-1">
          Email
        </label>
        <input
          id="regEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="brutal-input w-full"
          required
        />
      </div>
      <div>
        <label htmlFor="regPassword" className="block text-sm font-bold mb-1">
          Password
        </label>
        <input
          id="regPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="brutal-input w-full"
          required
          minLength={6}
        />
      </div>
      <button
        type="submit"
        className="brutal-btn brutal-btn-primary w-full"
        disabled={loading}
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}