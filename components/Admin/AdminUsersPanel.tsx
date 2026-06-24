"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchUsers() {
    setLoading(true)
    setError(null)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError('Admin session not found. Please sign in again.')
        return
      }

      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) {
        const msg = json?.error || 'Failed to load users'
        throw new Error(msg)
      }
      setUsers(json.users || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function changeRole(userId: string, newRole: string) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return

    const res = await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, role: newRole })
    })
    const json = await res.json()
    if (res.ok) {
      alert('Role updated!')
      fetchUsers()
    } else {
      alert(json?.error || 'Failed to update role')
    }
  }

  if (loading) return <div>Loading users...</div>
  if (error) return <div className="brutal-card p-6 text-red-400">{error}</div>

  return (
    <div className="brutal-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">Email</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Name</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Role</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Subscription</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Charity</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Activity</th>
              <th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-sm">{user.email}</td>
                <td className="px-4 py-3 text-sm">{user.full_name || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`brutal-badge ${user.role === 'admin' ? 'bg-red-500 text-white' : 'bg-surface'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-bold">{user.subscription?.status || 'none'}</div>
                  <div className="text-xs text-muted">{user.subscription?.plan_type || 'trial'}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div>{user.selected_charity?.charity?.name || 'Not selected'}</div>
                  {user.selected_charity?.contribution_percentage && (
                    <div className="text-xs text-muted">{user.selected_charity.contribution_percentage}% contribution</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div>{user.activity?.score_count || 0} scores</div>
                  <div className="text-xs text-muted">{user.activity?.last_score_at || 'No activity'}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    className="px-2 py-1 rounded bg-surface border-2 border-black"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <div className="p-6 text-center text-muted">No users found</div>}
    </div>
  )
}
