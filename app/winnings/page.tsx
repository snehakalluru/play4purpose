"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function WinningsPage() {
  const router = useRouter()
  const [winners, setWinners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = (data as any)?.user
      if (!user) return router.push('/login')
      await fetchWinners()
      setLoading(false)
    })()
  }, [router])

  async function fetchWinners() {
    const res = await fetch('/api/winnings')
    const json = await res.json()
    if (json.ok) setWinners(json.data || [])
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Winnings</h1>
      <ul>
        {winners.length === 0 && <li>No winners yet</li>}
        {winners.map((w: any) => (
          <li key={w.id || w.created_at}>{w.user_id} — {w.prize_amount ?? 0} — {w.created_at}</li>
        ))}
      </ul>
    </div>
  )
}
