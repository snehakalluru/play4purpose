"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

function isMissingDrawEntries(error: any) {
  const message = String(error?.message || '')
  return message.includes('draw_entries') && (
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('Could not find the table')
  )
}

export default function ActiveDraw() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draw, setDraw] = useState<any | null>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)

      const sessionResp = await supabase.auth.getSession()
      const session = sessionResp.data?.session
      if (!session || !session.user) {
        setError('You must be signed in to view draw info')
        setLoading(false)
        return
      }
      const uid = session.user.id
      if (!mounted) return
      setUserId(uid)

      const drawsRes = await fetch('/api/draws?limit=1', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const drawsJson = await drawsRes.json()

      if (!drawsRes.ok || !drawsJson.ok) {
        setError(drawsJson.error || 'Unable to load draw')
        setLoading(false)
        return
      }

      const draws = drawsJson.data || []
      if (!draws || draws.length === 0) {
        setError('No active draw at the moment')
        setLoading(false)
        return
      }
      const active = draws[0]
      setDraw(active)

      const { data: userEntries, error: entriesErr } = await supabase
        .from('draw_entries')
        .select('*')
        .eq('draw_id', active.id)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (entriesErr) {
        if (isMissingDrawEntries(entriesErr)) {
          setEntries([])
          setLoading(false)
          return
        }

        setError(entriesErr.message)
        setLoading(false)
        return
      }
      setEntries(userEntries ?? [])
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Loading draw...</div>
  if (error) return <div className="text-red-400">{error}</div>

  return (
    <div className="mb-6 p-4 bg-surface rounded">
      <h2 className="text-xl font-semibold mb-2">Active Draw</h2>
      <div className="text-sm mb-2">Status: <strong>{draw.status}</strong></div>
      {draw.name && <div className="text-sm mb-2">Name: {draw.name}</div>}
      {draw.entry_deadline && <div className="text-sm mb-2">Entry deadline: {new Date(draw.entry_deadline).toLocaleString()}</div>}
      {draw.prize_pool && <div className="text-sm mb-2">Prize pool: ${draw.prize_pool}</div>}

      <h3 className="mt-4 font-medium">Your Entries</h3>
      {entries.length === 0 ? (
        <div className="text-sm text-muted">You have not entered this draw yet.</div>
      ) : (
        <ul className="mt-2 space-y-2">
          {entries.map((e) => {
            let nums: number[] = []
            try {
              nums = typeof e.numbers === 'string' ? JSON.parse(e.numbers) : e.numbers
            } catch (err) {
              nums = []
            }
            return (
              <li key={e.id} className="p-2 bg-background/20 rounded">
                <div className="text-sm">Entry: {e.entry_number || nums.join(', ')}</div>
                <div className="text-xs text-muted">Entered: {new Date(e.created_at).toLocaleString()}</div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
