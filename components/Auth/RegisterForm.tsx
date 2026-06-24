'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function RegisterForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const submitGuard = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitGuard.current || loading) return
    submitGuard.current = true

    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!termsAccepted || !privacyAccepted) {
      setError('Please accept the terms and privacy policy to continue')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone: phone || undefined,
          privacy_accepted: privacyAccepted,
          terms_accepted: termsAccepted
        })
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.success) {
        setError(payload?.message || `Failed to register (${res.status})`)
        return
      }

      setSuccess(true)

      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message || 'Automatic sign-in failed. Please log in to continue.')
        setSuccess(false)
        return
      }
      if (!sessionData.session?.access_token) {
        setError('Automatic sign-in succeeded but session cookie was missing. Please log in to continue.')
        setSuccess(false)
        return
      }

      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionData.session })
      })

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          Account created. Your 7-day free trial is active.
        </div>
        <p className="text-sm text-muted">Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-bold mb-1">
            Full Name
          </label>
          <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="brutal-input w-full" required minLength={2} />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-bold mb-1">
            Phone Number
          </label>
          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="brutal-input w-full" placeholder="Optional" />
        </div>
      </div>

      <div>
        <label htmlFor="regEmail" className="block text-sm font-bold mb-1">
          Email Address
        </label>
        <input id="regEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="brutal-input w-full" required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="regPassword" className="block text-sm font-bold mb-1">
            Password
          </label>
          <input id="regPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="brutal-input w-full" required minLength={8} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-bold mb-1">
            Confirm Password
          </label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="brutal-input w-full" required minLength={8} />
        </div>
      </div>
      <p className="text-xs text-muted -mt-3">Minimum 8 characters. Passwords are stored through Supabase Auth.</p>

      <div className="space-y-3 text-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1" required />
          <span>
            I accept the <a href="/terms" className="text-primary underline">Terms & Conditions</a> and{' '}
            <a href="/privacy" className="text-primary underline">Privacy Policy</a>. Subscription is mandatory and includes a
            7-day free trial.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-1" required />
          <span>I accept the privacy policy.</span>
        </label>
      </div>

      <button type="submit" className="brutal-btn brutal-btn-primary w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Start 7-day free trial'}
      </button>
    </form>
  )
}
