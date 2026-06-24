"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function DrawsPage() {
  const router = useRouter()
  const [draws, setDraws] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [entering, setEntering] = useState<string | null>(null)

  useEffect(() => {
    loadDraws()
  }, [])

  async function loadDraws() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.push('/login')

    const res = await fetch('/api/draws', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const json = await res.json()
    if (json.ok) setDraws(json.data || [])
    setLoading(false)
  }

  async function enterDraw(drawId: string) {
    setEntering(drawId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.push('/login')

    const res = await fetch('/api/draws/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({})
    })
    const json = await res.json()
    if (res.ok) {
      alert('Successfully entered the draw!')
      loadDraws()
    } else {
      alert(json.error || 'Failed to enter draw')
    }
    setEntering(null)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-6 uppercase">Prize Draws</h1>

        {draws.length === 0 ? (
          <div className="brutal-card p-8 text-center">
            <p className="text-muted">No draws available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {draws.map((draw) => (
              <div key={draw.id} className="brutal-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{draw.name || `Draw - ${draw.draw_date}`}</h2>
                    <p className="text-sm text-muted mt-1">Date: {draw.draw_date}</p>
                    <p className="text-sm text-muted">Status: <span className="capitalize font-semibold">{draw.status}</span></p>
                  </div>
                  {draw.hasEntry ? (
                    <div className="brutal-badge bg-green-500 text-white">
                      ✓ Entered
                    </div>
                  ) : (
                    <div className="brutal-badge bg-yellow-500 text-black">
                      Not Entered
                    </div>
                  )}
                </div>

                {draw.prize_pool > 0 && (
                  <div className="mb-4 p-3 bg-surface rounded">
                    <p className="text-sm font-semibold">Prize Pool: £{draw.prize_pool.toFixed(2)}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>Jackpot: £{draw.jackpot_amount?.toFixed(2)}</div>
                      <div>2nd: £{draw.second_prize?.toFixed(2)}</div>
                      <div>3rd: £{draw.third_prize?.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {draw.hasEntry && draw.entryNumber && (
                  <div className="mb-4 p-3 bg-accent/20 rounded border-2 border-accent">
                    <p className="text-sm font-semibold">Your Entry Number:</p>
                    <p className="text-lg font-mono font-bold">{draw.entryNumber}</p>
                  </div>
                )}

                {!draw.hasEntry && (draw.status === 'scheduled' || draw.status === 'running') && (
                  <button
                    onClick={() => enterDraw(draw.id)}
                    disabled={entering === draw.id}
                    className="brutal-btn brutal-btn-primary"
                  >
                    {entering === draw.id ? 'Entering...' : 'Enter Draw'}
                  </button>
                )}

                {draw.status === 'completed' && draw.winning_number && (
                  <div className="mt-4 p-3 bg-primary/20 rounded border-2 border-primary">
                    <p className="text-sm font-semibold">Winning Entry:</p>
                    <p className="text-lg font-mono font-bold">{draw.winning_number}</p>
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
