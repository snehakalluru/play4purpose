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

  if (loading) return <div className="app-page flex items-center justify-center text-muted">Loading draws...</div>

  const totalPrizePool = draws.reduce((sum, draw) => sum + Number(draw.prize_pool || 0), 0)
  const enteredDraws = draws.filter((draw) => draw.hasEntry).length

  return (
    <div className="app-page">
      <div className="mx-auto max-w-6xl">
        <div className="course-card mb-6 rounded-md p-6 text-white md:p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-white/75">Prize room</p>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black md:text-5xl">Prize Draws</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 md:text-base">
                Play, win, and give through monthly draws tied to your member activity.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-bold sm:min-w-80">
              <div className="rounded-md border border-white/20 bg-white/10 p-3 backdrop-blur">
                <span className="block text-2xl font-black">£{totalPrizePool.toFixed(2)}</span>
                Listed prize pool
              </div>
              <div className="rounded-md border border-white/20 bg-white/10 p-3 backdrop-blur">
                <span className="block text-2xl font-black">{enteredDraws}</span>
                Entered draws
              </div>
            </div>
          </div>
        </div>

        {draws.length === 0 ? (
          <div className="brutal-card p-8 text-center">
            <p className="text-muted">No draws available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {draws.map((draw) => (
              <div key={draw.id} className="brutal-card ticket-card p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">{draw.name || `Draw - ${draw.draw_date}`}</h2>
                    <p className="text-sm text-muted mt-1">Date: {draw.draw_date}</p>
                    <p className="text-sm text-muted">Status: <span className="capitalize font-semibold">{draw.status}</span></p>
                  </div>
                  {draw.hasEntry ? (
                    <div className="brutal-badge bg-green-500 text-white">
                      Entered
                    </div>
                  ) : (
                    <div className="brutal-badge bg-yellow-500 text-black">
                      Not Entered
                    </div>
                  )}
                </div>

                <div className="mb-4 rounded-md bg-white/70 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-bold text-muted">Prize Pool</p>
                    <p className="text-2xl font-black text-slate-950">£{Number(draw.prize_pool || 0).toFixed(2)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold text-muted">
                    <div className="rounded-md bg-white/80 p-2">Jackpot<br />£{Number(draw.jackpot_amount || 0).toFixed(2)}</div>
                    <div className="rounded-md bg-white/80 p-2">2nd<br />£{Number(draw.second_prize || 0).toFixed(2)}</div>
                    <div className="rounded-md bg-white/80 p-2">3rd<br />£{Number(draw.third_prize || 0).toFixed(2)}</div>
                  </div>
                </div>

                {draw.hasEntry && draw.entryNumber && (
                  <div className="mb-4 rounded-md border border-accent/30 bg-accent/10 p-3">
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
                  <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3">
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
