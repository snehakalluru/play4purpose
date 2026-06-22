"use client"
import React, { useEffect, useState } from 'react'

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([])
  const [draws, setDraws] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])

  async function fetchAll() {
    const [u, d, w, p] = await Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/draws').then(r => r.json()),
      fetch('/api/admin/winners').then(r => r.json()),
      fetch('/api/admin/payouts').then(r => r.json())
    ])
    if (u.success) setUsers(u.users || [])
    if (d.success) setDraws(d.draws || [])
    if (w.success) setWinners(w.winners || [])
    if (p.success) setPayouts(p.payouts || [])
  }

  useEffect(() => {
    fetchAll()
  }, [])

  async function makeAdmin(userId: string) {
    await fetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify({ user_id: userId, role: 'admin' }), headers: { 'Content-Type': 'application/json' } })
    fetchAll()
  }

  async function runDraw(drawId: string) {
    await fetch('/api/admin/run-draw', { method: 'POST', body: JSON.stringify({ draw_id: drawId }), headers: { 'Content-Type': 'application/json' } })
    fetchAll()
  }

  async function markPaid(payoutId: string) {
    await fetch('/api/admin/payouts', { method: 'PATCH', body: JSON.stringify({ payout_id: payoutId, status: 'paid' }), headers: { 'Content-Type': 'application/json' } })
    fetchAll()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <section className="mb-8">
        <h2 className="font-bold">Users</h2>
        <table className="w-full border">
          <thead><tr><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.role !== 'admin' && <button onClick={() => makeAdmin(u.id)}>Make Admin</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="font-bold">Draws</h2>
        <table className="w-full border">
          <thead><tr><th>ID</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {draws.map(d => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.draw_date}</td>
                <td>{d.status}</td>
                <td>{d.status !== 'completed' && <button onClick={() => runDraw(d.id)}>Run Draw</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="font-bold">Winners</h2>
        <table className="w-full border">
          <thead><tr><th>User</th><th>Draw</th><th>Prize</th><th>Verified</th></tr></thead>
          <tbody>
            {winners.map(w => (
              <tr key={w.id}><td>{w.user_id}</td><td>{w.draw_id}</td><td>{w.prize}</td><td>{String(w.verified)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-bold">Payouts</h2>
        <table className="w-full border">
          <thead><tr><th>User</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {payouts.map(p => (
              <tr key={p.id}><td>{p.user_id}</td><td>{p.amount}</td><td>{p.status}</td><td>{p.status !== 'paid' && <button onClick={() => markPaid(p.id)}>Mark Paid</button>}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
