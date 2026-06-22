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
    const { data } = await supabase.auth.getUser()
    const token = (data as any)?.session?.access_token
    if (!token) return

    const res = await fetch('/api/winnings', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    if (json.ok) setWinners(json.data || [])
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-6 uppercase">My Winnings</h1>

        {winners.length === 0 ? (
          <div className="brutal-card p-8 text-center">
            <p className="text-muted">No winnings yet. Keep playing!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {winners.map((w) => (
              <div key={w.id} className="brutal-card p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="text-xl font-bold">{w.draw?.name || 'Draw'}</h2>
                    <p className="text-sm text-muted">Date: {w.draw?.draw_date}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-primary">£{w.amount?.toFixed(2)}</div>
                    <div className="text-sm text-muted">Position: {w.position === 1 ? 'Jackpot' : w.position === 2 ? '2nd Prize' : '3rd Prize'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <span className="text-sm text-muted">Verification:</span>
                    <span className={`ml-2 brutal-badge ${w.verification_status === 'approved' ? 'bg-green-500 text-white' : w.verification_status === 'rejected' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'}`}>
                      {w.verification_status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-muted">Payment:</span>
                    <span className={`ml-2 brutal-badge ${w.payment_status === 'paid' ? 'bg-green-500 text-white' : w.payment_status === 'failed' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'}`}>
                      {w.payment_status}
                    </span>
                  </div>
                </div>

                {w.verification_status === 'pending' && !w.proof_url && (
                  <div className="mt-4">
                    <a href={`/winnings/upload/${w.id}`} className="brutal-btn brutal-btn-primary">
                      Upload Verification Proof
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}