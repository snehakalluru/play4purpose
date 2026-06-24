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

  if (loading) return <div className="app-page flex items-center justify-center text-muted">Loading winnings...</div>

  return (
    <div className="app-page">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="section-eyebrow">Prize history</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-5xl">My Winnings</h1>
          <p className="mt-2 text-muted">Track verification, payouts, and proof uploads for your prizes.</p>
        </div>

        {winners.length === 0 ? (
          <div className="brutal-card p-8 text-center">
            <p className="text-muted">No winnings yet. Keep playing!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {winners.map((w) => (
              <div key={w.id} className="brutal-card ticket-card p-6">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">{w.draw?.name || 'Draw'}</h2>
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
