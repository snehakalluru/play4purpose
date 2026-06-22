"use client"
import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function EntryForm() {
  const router = useRouter()
  const [numbers, setNumbers] = useState<string[]>(['', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateAt(i: number, v: string) {
    const copy = [...numbers]
    copy[i] = v
    setNumbers(copy)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = numbers.map((n) => Number(n))
    if (parsed.some((n) => !Number.isInteger(n) || n < 1 || n > 45)) return setError('Numbers must be integers between 1 and 45')
    const uniq = new Set(parsed)
    if (uniq.size !== 5) return setError('Numbers must be unique')

    setLoading(true)
    const session = await supabase.auth.getSession()
    const token = session.data?.session?.access_token
    if (!token) {
      setLoading(false)
      return router.push('/login')
    }

    const res = await fetch('/api/draws/enter', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ numbers: parsed }) })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) return setError(json?.error || 'Failed to enter draw')
    router.push('/dashboard')
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      {error && <div className="text-red-400">{error}</div>}
      <div className="flex gap-2">
        {numbers.map((n, i) => (
          <input key={i} value={n} onChange={(e) => updateAt(i, e.target.value)} className="w-16 px-2 py-1 rounded bg-surface" />
        ))}
      </div>
      <div>
        <button className="px-4 py-2 bg-primary rounded-md" disabled={loading}>{loading ? 'Entering...' : 'Enter Draw'}</button>
      </div>
    </form>
  )
}
