"use client"
import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ContributionSelector() {
  const router = useRouter()
  const params = useSearchParams()
  const charityId = params.get('charity_id') || ''
  const [selected, setSelected] = useState<number>(10)
  const [loading, setLoading] = useState(false)
  const options = [10, 15, 20, 25, 50]

  async function submit() {
    if (!charityId) return
    setLoading(true)
    const session = await supabase.auth.getSession()
    const token = session.data?.session?.access_token
    if (!token) return router.push('/login')

    const res = await fetch('/api/user/select-charity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ charity_id: charityId, contribution_percentage: selected })
    })
    setLoading(false)
    if (res.ok) router.push('/onboarding/plan')
    else {
      const data = await res.json()
      alert(data?.error || 'Failed to save selection')
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="text-sm text-muted">Choose how much of your winnings you want to donate to the selected charity.</div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button key={opt} onClick={() => setSelected(opt)} className={`px-4 py-2 rounded-md ${selected === opt ? 'bg-primary' : 'bg-surface'}`}>
            {opt}%
          </button>
        ))}
      </div>
      <div>
        <button onClick={submit} className="px-4 py-2 bg-accent rounded-md" disabled={loading}>{loading ? 'Saving...' : 'Continue to plan'}</button>
      </div>
    </div>
  )
}
