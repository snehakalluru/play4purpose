'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function RegisterForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      // Use server-side register endpoint which creates a confirmed user (no email verification)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      })
      const payload = await res.json()
      if (!res.ok || !payload.success) {
        console.error('Server registration error:', payload)
        setError(payload.error || 'Failed to register')
        setLoading(false)
        return
      }

      // Profile is created server-side by the register endpoint
      setSuccess(true)
      setError(null)
      setTimeout(() => {
        router.push('/login?message=' + encodeURIComponent('Registration successful! You can sign in now.'))
      }, 1200)
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="bg-green-100 border-2 border-green-600 text-green-700 px-4 py-3 font-bold text-sm">
          ✓ Registration successful! Please check your email to verify your account.
        </div>
        <p className="text-sm text-muted">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-100 border-2 border-red-600 text-red-700 px-4 py-3 font-bold text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="fullName" className="block text-sm font-bold mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="brutal-input w-full"
          required
          minLength={2}
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
          minLength={8}
        />
        <p className="text-xs text-muted mt-1">Minimum 8 characters</p>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-bold mb-1">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="brutal-input w-full"
          required
          minLength={8}
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