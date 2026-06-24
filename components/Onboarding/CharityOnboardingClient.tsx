"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CharitySelector from '../Charity/CharitySelector'
import { supabase } from '../../services/supabaseClient'

export default function CharityOnboardingClient() {
  const router = useRouter()
  const [selectedCharity, setSelectedCharity] = useState<string | null>(null)
  const [contribution, setContribution] = useState(10)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function continueToPlan() {
    if (!selectedCharity) {
      setError('Choose a charity to continue')
      return
    }

    setSaving(true)
    setError(null)

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      router.push('/login?from=/onboarding/charity')
      return
    }

    const res = await fetch('/api/user/select-charity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        charity_id: selectedCharity,
        contribution_percentage: contribution
      })
    })

    setSaving(false)

    if (!res.ok) {
      const json = await res.json().catch(() => null)
      setError(json?.error || 'Unable to save your charity selection')
      return
    }

    router.push('/onboarding/plan')
  }

  return (
    <div className="space-y-8">
      <CharitySelector
        selectedCharity={selectedCharity}
        onSelect={setSelectedCharity}
        contribution={contribution}
        onContributionChange={setContribution}
      />

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={continueToPlan}
        disabled={saving || !selectedCharity}
        className="brutal-btn disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Continue to plan'}
      </button>
    </div>
  )
}
