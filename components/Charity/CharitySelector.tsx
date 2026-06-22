"use client"
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import CharityCard from './CharityCard'
import { useRouter } from 'next/navigation'

export default function CharitySelector() {
  const [charities, setCharities] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('charities').select('*').eq('active', true).limit(50)
    setCharities(data || [])
    setLoading(false)
  }

  function filtered() {
    if (!query) return charities
    return charities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
  }

  function handleSelect(id: string) {
    // Navigate to contribution selection step with charity id
    router.push(`/onboarding/contribution?charity_id=${encodeURIComponent(id)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search charities" className="flex-1 px-3 py-2 rounded-md bg-surface" />
      </div>
      {loading && <div>Loading...</div>}
      <div className="grid grid-cols-1 gap-3">
        {filtered().map((c) => (
          <CharityCard key={c.id} charity={c} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  )
}
