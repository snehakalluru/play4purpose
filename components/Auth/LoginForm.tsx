"use client"
import React, { useState } from 'react'
import { loginSchema } from '../../validators/auth'
import { supabase } from '../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const parse = loginSchema.safeParse({ email, password })
    if (!parse.success) return setError('Invalid input')
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) return setError(signInError.message)
    router.push('/onboarding/charity')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      {error && <div className="text-red-400">{error}</div>}
      <div>
        <label className="block text-sm">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface" />
      </div>
      <div>
        <label className="block text-sm">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface" />
      </div>
      <div>
        <button className="px-4 py-2 bg-primary rounded-md" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </div>
    </form>
  )
}
