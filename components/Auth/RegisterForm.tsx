"use client"
import React, { useState } from 'react'
import { registrationSchema } from '../../validators/auth'
import { supabase } from '../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function RegisterForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsed = registrationSchema.safeParse({ email, password, full_name: fullName })
    if (!parsed.success) return setError('Invalid input')
    setLoading(true)

    // Call server registration to create user + profile
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName })
    })
    const data = await res.json()
    if (!res.ok) {
      setLoading(false)
      return setError(data.error || 'Registration failed')
    }

    // Sign in to create session on client
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      return setError(signInError.message)
    }

    // Redirect to onboarding charity step
    router.push('/onboarding/charity')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      {error && <div className="text-red-400">{error}</div>}
      <div>
        <label className="block text-sm">Full name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface" />
      </div>
      <div>
        <label className="block text-sm">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface" />
      </div>
      <div>
        <label className="block text-sm">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface" />
      </div>
      <div>
        <button className="px-4 py-2 bg-primary rounded-md" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
      </div>
    </form>
  )
}
