"use client"
import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordForm() {
  const params = useSearchParams()
  const router = useRouter()
  const accessToken = params.get('access_token') || ''
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (accessToken) {
      // set session if token present
      ;(async () => {
        try {
          await supabase.auth.setSession({ access_token: accessToken } as any)
        } catch (e) {
          // ignore
        }
      })()
    }
  }, [accessToken])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password } as any)
      setLoading(false)
      if (error) setMessage(error.message)
      else {
        setMessage('Password updated — signing you in')
        router.push('/login')
      }
    } catch (err: any) {
      setLoading(false)
      setMessage(err.message)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      {message && <div className="text-sm">{message}</div>}
      <div>
        <label className="block text-sm">New password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface" />
      </div>
      <div>
        <button className="px-4 py-2 bg-primary rounded-md" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</button>
      </div>
    </form>
  )
}
