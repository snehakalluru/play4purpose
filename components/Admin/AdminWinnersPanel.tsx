"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminWinnersPanel() {
  const [winners, setWinners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchWinners() {
    setLoading(true)
    const token = (document.cookie.match(/sb-access-token=([^;]+)/)||[])[1]
    const res = await fetch('/api/admin/winners/list', { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (res.ok) setWinners(json.winners || [])
    setLoading(false)
  }

  useEffect(() => { fetchWinners() }, [])

  async function review(proofId: string, action: 'approve' | 'reject') {
    const token = (document.cookie.match(/sb-access-token=([^;]+)/)||[])[1]
    const res = await fetch('/api/admin/winners/review', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ proof_id: proofId, action }) })
    const json = await res.json()
    if (!res.ok) return alert(json?.error || 'Failed')
    fetchWinners()
  }

  async function payout(winnerId: string) {
    const token = (document.cookie.match(/sb-access-token=([^;]+)/)||[])[1]
    const res = await fetch('/api/admin/winners/payout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ winner_id: winnerId }) })
    const json = await res.json()
    if (!res.ok) return alert(json?.error || 'Payout failed')
    fetchWinners()
  }

  if (loading) return <div>Loading winners...</div>

  return (
    <div className="space-y-4">
      {winners.length === 0 && <div>No winners found</div>}
      {winners.map((w) => (
        <div key={w.id} className="p-3 bg-background/20 rounded">
          <div className="font-semibold">Winner: {w.user_id} — ${w.prize_amount}</div>
          <div>Match: {w.match_count}</div>
          <div>Status: {w.status}</div>
          <div className="mt-2">
            {w.winner_proofs && w.winner_proofs.length > 0 ? (
              w.winner_proofs.map((p: any) => (
                <div key={p.id} className="mt-2">
                  <a href={p.file_url} target="_blank" rel="noreferrer" className="text-primary">View proof</a>
                  <div className="inline-block ml-4">
                    <button onClick={() => review(p.id, 'approve')} className="px-2 py-1 bg-green-600 rounded mr-2">Approve</button>
                    <button onClick={() => review(p.id, 'reject')} className="px-2 py-1 bg-red-600 rounded">Reject</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted">No proof uploaded yet</div>
            )}
            <div className="mt-2">
              {w.payouts && w.payouts.length > 0 ? (
                <div className="text-sm">Payouts: {w.payouts.length}</div>
              ) : (
                w.status === 'approved' && (
                  <div className="mt-2">
                    <button onClick={() => payout(w.id)} className="px-2 py-1 bg-blue-600 rounded">Trigger Payout</button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
