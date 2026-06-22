"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function DrawsPage() {
  const router = useRouter()
  const [result, setResult] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = (data as any)?.user
      if (!user) return router.push('/login')
      setLoading(false)
    })()
  }, [router])

  async function runDraw() {
    const res = await fetch('/api/draws/run', { method: 'POST' })
    const json = await res.json()
    if (json.ok) setResult(json.winner || json.data || null)
    else setResult({ error: json.error })
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Draws</h1>
      <button onClick={runDraw}>Run Draw</button>

      <h2>Result</h2>
      <pre>{result ? JSON.stringify(result, null, 2) : 'No result yet'}</pre>
    </div>
  )
}
