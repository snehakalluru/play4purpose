"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import AdminUsersPanel from './AdminUsersPanel'
import AdminDrawsPanel from './AdminDrawsPanel'
import AdminWinnersPanel from './AdminWinnersPanel'
import AdminPayoutsPanel from './AdminPayoutsPanel'

type Tab = 'overview' | 'users' | 'draws' | 'winners' | 'payouts' | 'charities'

export default function AdminPageClient() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscribers: 0,
    totalScores: 0,
    totalDraws: 0,
    totalWinners: 0,
    totalPrizePool: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function readJsonSafely(res: Response) {
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return null
    }

    try {
      return await res.json()
    } catch {
      return null
    }
  }

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    try {
      const token = session.access_token

      const [usersRes, subsRes, scoresRes, drawsRes, winnersRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/scores', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/draws', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/winners', { headers: { Authorization: `Bearer ${token}` } })
      ])

      const [usersJson, subsJson, scoresJson, drawsJson, winnersJson] = await Promise.all([
        readJsonSafely(usersRes),
        readJsonSafely(subsRes),
        readJsonSafely(scoresRes),
        readJsonSafely(drawsRes),
        readJsonSafely(winnersRes)
      ])

      const totalPrizePool = (winnersJson?.winners || []).reduce(
        (sum: number, w: any) => sum + Number(w.amount ?? w.prize_amount ?? 0), 0
      )

      setStats({
        totalUsers: usersJson?.users?.length || 0,
        activeSubscribers: (subsJson?.subscriptions || []).filter((s: any) => s.status === 'active').length,
        totalScores: scoresJson?.scores?.length || 0,
        totalDraws: drawsJson?.draws?.length || 0,
        totalWinners: winnersJson?.winners?.length || 0,
        totalPrizePool
      })
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: '📊' },
    { id: 'users' as Tab, label: 'Users', icon: '👥' },
    { id: 'draws' as Tab, label: 'Draws', icon: '🎰' },
    { id: 'winners' as Tab, label: 'Winners', icon: '🏆' },
    { id: 'payouts' as Tab, label: 'Payouts', icon: '💰' },
    { id: 'charities' as Tab, label: 'Charities', icon: '❤️' }
  ]

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-black uppercase">Admin Dashboard</h1>
          <button onClick={handleLogout} className="brutal-btn brutal-btn-outline">
            Logout
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="brutal-card p-6">
              <div className="text-sm text-muted mb-2">Total Users</div>
              <div className="text-4xl font-black text-primary">{stats.totalUsers}</div>
            </div>
            <div className="brutal-card p-6">
              <div className="text-sm text-muted mb-2">Active Subscribers</div>
              <div className="text-4xl font-black text-green-400">{stats.activeSubscribers}</div>
            </div>
            <div className="brutal-card p-6">
              <div className="text-sm text-muted mb-2">Total Scores</div>
              <div className="text-4xl font-black text-accent">{stats.totalScores}</div>
            </div>
            <div className="brutal-card p-6">
              <div className="text-sm text-muted mb-2">Total Draws</div>
              <div className="text-4xl font-black text-primary">{stats.totalDraws}</div>
            </div>
            <div className="brutal-card p-6">
              <div className="text-sm text-muted mb-2">Total Winners</div>
              <div className="text-4xl font-black text-yellow-400">{stats.totalWinners}</div>
            </div>
            <div className="brutal-card p-6">
              <div className="text-sm text-muted mb-2">Total Prize Pool</div>
              <div className="text-4xl font-black text-green-400">£{stats.totalPrizePool.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-bold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-surface text-white hover:bg-surface/80'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="brutal-card p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Welcome to Admin Panel</h2>
              <p className="text-muted mb-6">Select a tab above to manage different aspects of the platform.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-surface rounded-lg">
                  <h3 className="text-lg font-bold mb-2">User Management</h3>
                  <p className="text-sm text-muted">View users, change roles, manage subscriptions</p>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                  <h3 className="text-lg font-bold mb-2">Draw Management</h3>
                  <p className="text-sm text-muted">Create draws, run simulations, publish results</p>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                  <h3 className="text-lg font-bold mb-2">Winners Management</h3>
                  <p className="text-sm text-muted">View winners, verify submissions, manage payouts</p>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                  <h3 className="text-lg font-bold mb-2">Charity Management</h3>
                  <p className="text-sm text-muted">Add, edit, and manage charity listings</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && <AdminUsersPanel />}
          {activeTab === 'draws' && <AdminDrawsPanel />}
          {activeTab === 'winners' && <AdminWinnersPanel />}
          {activeTab === 'payouts' && <AdminPayoutsPanel />}
          {activeTab === 'charities' && <CharityManagement />}
        </div>
      </div>
    </div>
  )
}

function CharityManagement() {
  const [charities, setCharities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    website: '',
    is_active: true
  })

  useEffect(() => {
    loadCharities()
  }, [])

  async function loadCharities() {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('Admin session not found. Please sign in again.')
        return
      }

      const res = await fetch('/api/admin/charities', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load charities')
      setCharities(json.charities || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load charities')
    } finally {
      setLoading(false)
    }
  }

  async function saveCharity(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Admin session not found. Please sign in again.')
      return
    }

    const token = session.access_token

    const res = editingId
      ? await fetch(`/api/admin/charities/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      })
      : await fetch('/api/admin/charities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      })

    const json = await res.json()
    if (!res.ok) {
      setError(json?.error || 'Failed to save charity')
      return
    }

    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', description: '', image_url: '', website: '', is_active: true })
    loadCharities()
  }

  function startEdit(charity: any) {
    setEditingId(charity.id)
    const events = charity.events && typeof charity.events === 'object' ? charity.events : {}
    setFormData({
      name: charity.name,
      description: charity.description || '',
      image_url: charity.image_url || charity.logo_url || '',
      website: events.website || charity.website || '',
      is_active: charity.is_active ?? charity.active ?? true
    })
    setShowForm(true)
  }

  async function toggleCharity(charity: any) {
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Admin session not found. Please sign in again.')
      return
    }

    const isActive = !(charity.is_active ?? charity.active ?? true)
    const events = charity.events && typeof charity.events === 'object' ? charity.events : {}
    const res = await fetch(`/api/admin/charities/${charity.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        name: charity.name,
        description: charity.description || '',
        image_url: charity.image_url || charity.logo_url || '',
        website: events.website || charity.website || '',
        is_active: isActive
      })
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json?.error || 'Failed to update charity')
      return
    }

    loadCharities()
  }

  async function deleteCharity(id: string) {
    if (!confirm('Delete this charity? If users already selected it, it will be disabled instead.')) return
    setError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Admin session not found. Please sign in again.')
      return
    }

    const token = session.access_token
    const res = await fetch(`/api/admin/charities/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json?.error || 'Failed to delete charity')
      return
    }

    loadCharities()
  }

  if (loading) return <div>Loading charities...</div>

  return (
    <div>
      {error && <div className="brutal-card p-4 mb-4 text-red-400">{error}</div>}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Charity Management</h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({ name: '', description: '', image_url: '', website: '', is_active: true })
          }}
          className="brutal-btn brutal-btn-primary"
        >
          {showForm ? 'Cancel' : 'Add Charity'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveCharity} className="mb-6 p-6 bg-surface rounded-lg space-y-4">
          <div>
            <label htmlFor="charity-name" className="block text-sm font-bold mb-2">Name</label>
            <input
              id="charity-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="brutal-input"
              required
              placeholder="Enter charity name"
            />
          </div>
          <div>
            <label htmlFor="charity-desc" className="block text-sm font-bold mb-2">Description</label>
            <textarea
              id="charity-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="brutal-input"
              rows={3}
              placeholder="Enter charity description"
            />
          </div>
          <div>
            <label htmlFor="charity-logo" className="block text-sm font-bold mb-2">Logo URL</label>
            <input
              id="charity-logo"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="brutal-input"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div>
            <label htmlFor="charity-website" className="block text-sm font-bold mb-2">Website</label>
            <input
              id="charity-website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="brutal-input"
              placeholder="https://example.org"
            />
          </div>
          <label className="flex items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            Active
          </label>
          <button type="submit" className="brutal-btn brutal-btn-primary">
            {editingId ? 'Update' : 'Create'} Charity
          </button>
        </form>
      )}

      <div className="space-y-4">
        {charities.map((charity) => (
          <div key={charity.id} className="p-4 bg-surface rounded-lg flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold">{charity.name}</h3>
                <span className={`brutal-badge ${(charity.is_active ?? charity.active ?? true) ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                  {(charity.is_active ?? charity.active ?? true) ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-sm text-muted mt-1">{charity.description}</p>
              {(charity.image_url || charity.logo_url) && (
                <img src={charity.image_url || charity.logo_url} alt={charity.name} className="h-12 w-auto mt-2 object-contain" />
              )}
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => toggleCharity(charity)}
                className="brutal-btn bg-yellow-500 text-black text-xs"
              >
                {(charity.is_active ?? charity.active ?? true) ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => startEdit(charity)}
                className="brutal-btn bg-blue-600 text-white text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => deleteCharity(charity.id)}
                className="brutal-btn bg-red-600 text-white text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
