"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminWinnersPanel() {
  const [winners, setWinners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchWinners() {
    setLoading(true)
    setError(null)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError('Admin session not found. Please sign in again.')
        return
      }

      const res = await fetch('/api/admin/winners/list', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load winners')
      setWinners(json.winners || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load winners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWinners() }, [])

  async function review(winnerId: string, action: 'approve' | 'reject') {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    const res = await fetch('/api/admin/winners/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ winner_id: winnerId, action })
    })
    const json = await res.json()
    if (!res.ok) return alert(json?.error || 'Failed')
    fetchWinners()
  }

  async function payout(winnerId: string) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    const paymentMethod = prompt('Enter payment method (bank_transfer, paypal, etc.):') || 'bank_transfer'
    const res = await fetch('/api/admin/winners/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ winner_id: winnerId, payment_method: paymentMethod })
    })
    const json = await res.json()
    if (!res.ok) return alert(json?.error || 'Payout failed')
    alert(`Payout processed! Ref: ${json.transaction_reference}`)
    fetchWinners()
  }

  if (loading) return <div>Loading winners...</div>
  if (error) return <div className="brutal-card p-6 text-red-400">{error}</div>

  return (
    <div className="space-y-4">
      {winners.length === 0 && <div className="brutal-card p-6">No winners found</div>}
      {winners.map((w) => (
        <div key={w.id} className="brutal-card p-6">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold">Winner: {w.profile?.full_name || w.user_id}</h3>
              <p className="text-sm text-muted">{w.profile?.email}</p>
              <p className="text-sm">Draw: {w.draw?.name} ({w.draw?.draw_date})</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">£{w.amount?.toFixed(2)}</div>
              <div className="text-sm">Position: {w.position === 1 ? 'Jackpot' : w.position === 2 ? '2nd Prize' : '3rd Prize'}</div>
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

          {w.proof_url && (
            <div className="mt-3">
              <a href={w.proof_url} target="_blank" rel="noreferrer" className="text-accent hover:underline text-sm">
                View Proof Document
              </a>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {w.verification_status === 'pending' && (
              <>
                <button onClick={() => review(w.id, 'approve')} className="brutal-btn bg-green-600 text-white">Approve</button>
                <button onClick={() => review(w.id, 'reject')} className="brutal-btn bg-red-600 text-white">Reject</button>
              </>
            )}
            {w.verification_status === 'approved' && w.payment_status !== 'paid' && (
              <button onClick={() => payout(w.id)} className="brutal-btn brutal-btn-primary">Process Payout</button>
            )}
            {w.payouts && w.payouts.length > 0 && (
              <div className="text-sm text-muted mt-2">
                Payout: {w.payouts[0].status} | Ref: {w.payouts[0].transaction_reference}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
