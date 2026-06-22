'use client'
import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        // If email is not confirmed and dev confirm is enabled server-side, try to confirm and retry once
        if (signInError.message?.toLowerCase().includes('email not confirmed')) {
          try {
            await fetch('/api/auth/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            })
            // retry sign in
            const { error: retryError } = await supabase.auth.signInWithPassword({ email, password })
            if (retryError) {
              setError(retryError.message)
            } else {
              router.push('/dashboard')
            }
            return
          } catch (e) {
            console.warn('Auto-confirm attempt failed', e)
            setError(signInError.message)
            return
          }
        }

        setError(signInError.message)
      } else {
        router.push('/dashboard')
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
      <div>
        <label htmlFor="email" className="block text-sm font-bold mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="brutal-input w-full"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-bold mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="brutal-input w-full"
          required
        />
      </div>
      <button
        type="submit"
        className="brutal-btn brutal-btn-primary w-full"
        disabled={loading}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}