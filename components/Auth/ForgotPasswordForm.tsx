"use client"
import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    } as any)
    setLoading(false)
    if (error) setMessage(error.message)
    else setMessage('Check your email for password reset instructions.')
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      {message && <div className="text-sm">{message}</div>}
      <div>
        <label className="block text-sm">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface" />
      </div>
      <div>
        <button className="px-4 py-2 bg-primary rounded-md" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
      </div>
    </form>
  )
}
