'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const accessToken = params.get('access_token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionSet, setSessionSet] = useState(false)

  useEffect(() => {
    if (accessToken) {
      ;(async () => {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: '',
        } as any)
        if (!sessionError) setSessionSet(true)
      })()
    }
  }, [accessToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password } as any)
      if (updateError) {
        setError(updateError.message)
      } else {
        await supabase.auth.signOut()
        router.push('/login')
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
      {!accessToken && !sessionSet && (
        <div className="bg-yellow-100 border-2 border-yellow-600 text-yellow-800 px-4 py-3 font-bold text-sm shadow-[2px_2px_0px_rgba(202,138,4,0.8)]">
          No reset token found. Please use the link from your email.
        </div>
      )}
      <div>
        <label htmlFor="newPassword" className="block text-sm font-bold mb-1">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="brutal-input w-full"
          required
          minLength={6}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-bold mb-1">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="brutal-input w-full"
          required
          minLength={6}
        />
      </div>
      <button
        type="submit"
        className="brutal-btn brutal-btn-primary w-full"
        disabled={loading || (!accessToken && !sessionSet)}
      >
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
  )
}