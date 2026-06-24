"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminDrawsPanel() {
  const [draws, setDraws] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    draw_date: '',
    prize_pool: '0'
  })

  async function fetchDraws() {
    setLoading(true)
    setError(null)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError('Admin session not found. Please sign in again.')
        return
      }

      const res = await fetch('/api/admin/draws', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load draws')
      setDraws(json.draws || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load draws')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDraws() }, [])

  async function createDraw(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      setError('Admin session not found. Please sign in again.')
      return
    }

    const res = await fetch('/api/admin/draws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: formData.name,
        draw_date: formData.draw_date,
        prize_pool: Number(formData.prize_pool || 0)
      })
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json?.error || 'Failed to create draw')
      return
    }

    setFormData({ name: '', draw_date: '', prize_pool: '0' })
    fetchDraws()
  }

  async function runDraw() {
    if (!confirm('Run the draw now? This will select winners and cannot be undone.')) return

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    const res = await fetch('/api/admin/run-draw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    if (res.ok) {
      alert(`Draw completed! Winners selected.`)
      fetchDraws()
    } else {
      alert(json?.error || 'Failed to run draw')
    }
  }

  async function updateStatus(drawId: string, newStatus: string) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    const res = await fetch('/api/admin/draws/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ draw_id: drawId, status: newStatus })
    })
    const json = await res.json()
    if (res.ok) {
      alert('Status updated!')
      fetchDraws()
    } else {
      alert(json?.error || 'Failed to update status')
    }
  }

  if (loading) return <div>Loading draws...</div>
  if (error) return <div className="brutal-card p-6 text-red-400">{error}</div>

  return (
    <div className="space-y-4">
      <form onSubmit={createDraw} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-surface rounded-lg">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="brutal-input"
          placeholder="Draw name"
        />
        <input
          type="date"
          value={formData.draw_date}
          onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
          className="brutal-input"
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={formData.prize_pool}
          onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
          className="brutal-input"
          placeholder="Prize pool"
        />
        <button type="submit" className="brutal-btn brutal-btn-primary">
          Create Draw
        </button>
      </form>

      <button onClick={runDraw} className="brutal-btn brutal-btn-primary">
        Run New Draw
      </button>

      <div className="brutal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold">Draw Date</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Prize Pool</th>
                <th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {draws.map((draw) => (
                <tr key={draw.id}>
                  <td className="px-4 py-3 text-sm">{draw.draw_date}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`brutal-badge ${
                      draw.status === 'completed' ? 'bg-green-500 text-white' :
                      draw.status === 'running' ? 'bg-yellow-500 text-black' :
                      'bg-surface'
                    }`}>
                      {draw.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">£{draw.prize_pool?.toFixed(2) || '0.00'}</td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={draw.status}
                      onChange={(e) => updateStatus(draw.id, e.target.value)}
                      className="px-2 py-1 rounded bg-surface border-2 border-black"
                      aria-label="Change draw status"
                    >
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="running">Running</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {draws.length === 0 && <div className="p-6 text-center text-muted">No draws found</div>}
      </div>
    </div>
  )
}
