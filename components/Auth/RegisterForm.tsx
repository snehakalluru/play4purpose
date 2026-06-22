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
      // Use Supabase client signUp so Supabase will send verification email
      // Ensure verification links redirect back to this running app
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : process.env.NEXT_PUBLIC_APP_URL
      const { data: signData, error: signError } = await supabase.auth.signUp({ email, password }, { options: { emailRedirectTo: redirectTo } })
      if (signError) {
        console.error('Sign up error:', signError)
        setError(signError.message)
        setLoading(false)
        return
      }

      // Attempt to create a profile record server-side (idempotent)
      try {
        const userId = (signData as any)?.user?.id || null
        if (userId) {
          await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, email, full_name: fullName })
          })
        }
      } catch (e) {
        // non-fatal
        console.warn('Failed to create profile record:', e)
      }

      setSuccess(true)
      setError(null)
      setTimeout(() => {
        router.push('/login?message=' + encodeURIComponent('Registration successful! Please check your email to verify your account before signing in.'))
      }, 2000)
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