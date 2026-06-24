"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminPayoutsPanel() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchPayouts() {
    setLoading(true)
    setError(null)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError('Admin session not found. Please sign in again.')
        return
      }

      const res = await fetch('/api/admin/payouts', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load payouts')
      setPayouts(json.payouts || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load payouts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayouts() }, [])

  async function markAsPaid(payoutId: string) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    const res = await fetch('/api/admin/payouts/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ payout_id: payoutId })
    })
    const json = await res.json()
    if (res.ok) {
      alert('Payout marked as paid!')
      fetchPayouts()
    } else {
      alert(json?.error || 'Failed to update payout')
    }
  }

  if (loading) return <div>Loading payouts...</div>
  if (error) return <div className="brutal-card p-6 text-red-400">{error}</div>

  return (
    <div className="brutal-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">Winner</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payouts.map((payout) => (
              <tr key={payout.id}>
                <td className="px-4 py-3 text-sm">
                  {payout.winner?.profile?.full_name || payout.winner?.user_id || '—'}
                </td>
                <td className="px-4 py-3 text-sm font-bold">£{payout.amount?.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`brutal-badge ${
                    payout.status === 'paid' ? 'bg-green-500 text-white' :
                    payout.status === 'failed' ? 'bg-red-500 text-white' :
                    'bg-yellow-500 text-black'
                  }`}>
                    {payout.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {payout.status !== 'paid' && (
                    <button
                      onClick={() => markAsPaid(payout.id)}
                      className="brutal-btn bg-green-600 text-white text-xs"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payouts.length === 0 && <div className="p-6 text-center text-muted">No payouts found</div>}
    </div>
  )
}
