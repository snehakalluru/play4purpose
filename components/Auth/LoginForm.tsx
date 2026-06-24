'use client'
import React, { useRef, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const submitGuard = useRef(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function persistSession(session: any) {
    if (!session?.access_token) return

    await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session })
    })
  }

  async function redirectForRole() {
    // Validate session exists before routing
    const { data: after } = await supabase.auth.getSession()
    if (!after?.session) {
      router.replace('/dashboard')
      return
    }

    const roleRes = await fetch('/api/auth/role', {
      headers: { Authorization: `Bearer ${after.session.access_token}` }
    })

    if (!roleRes.ok) {
      router.replace('/dashboard')
      return
    }

    const roleJson = await roleRes.json()
    router.replace(roleJson?.role === 'admin' ? '/admin' : '/dashboard')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitGuard.current || loading) return
    submitGuard.current = true
    setError(null)
    setLoading(true)
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        // If email is not confirmed and dev confirm is enabled server-side, try to confirm and retry once
        if (signInError.message?.toLowerCase().includes('email not confirmed')) {
          try {
            // add timeout to avoid hanging
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 5000)
            const resp = await fetch('/api/auth/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
              signal: controller.signal
            })
            clearTimeout(timer)

            if (!resp.ok) {
              const body = await resp.text().catch(() => '')
              setError(`Auto-confirm failed: ${resp.status} ${body || resp.statusText}`)
              return
            }

            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password })
            if (retryError) {
              setError(retryError.message)
            } else {
              await persistSession((retryData as any)?.session)
              const { data: after, error: afterErr } = await supabase.auth.getSession()
              if (afterErr || !after?.session) {
                setError('Login succeeded but session was not found. Please try again.')
                return
              }
              await redirectForRole()
            }
            return
          } catch (e: any) {
            if (e.name === 'AbortError') setError('Auto-confirm request timed out')
            else setError('Auto-confirm attempt failed: ' + (e?.message || String(e)))
            return
          }
        }

        setError(signInError.message)
      } else {
        // Persist session server-side so middleware can see it
        try {
          const session = (signInData as any)?.session
          await persistSession(session)
          await redirectForRole()
          return
        } catch (e) {
          console.warn('Failed to set session cookie', e)
          router.replace('/dashboard')
        }
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
