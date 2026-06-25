"use client"
import React, { useEffect, useState } from 'react'

export default function CharitySelector({ selectedCharity, onSelect, contribution, onContributionChange }: {
  selectedCharity: string | null
  onSelect: (id: string) => void
  contribution: number
  onContributionChange: (value: number) => void
}) {
  const [charities, setCharities] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCharities()
  }, [])

  async function loadCharities() {
    const res = await fetch('/api/charities')
    const json = await res.json().catch(() => null)
    if (json?.success) setCharities(json.charities || [])
    setLoading(false)
  }

  const contributionOptions = [10, 15, 20, 25, 50]
  const filteredCharities = charities.filter((charity) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return [charity.name, charity.description, charity.website]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  if (loading) return <div className="text-center py-8 text-slate-700">Loading charities...</div>
  if (charities.length === 0) {
    return (
      <div className="brutal-card p-6 text-center text-slate-950">
        <h2 className="text-xl font-black mb-2">Charities are being prepared</h2>
        <p className="text-muted">
          No charities are available right now. Please check back shortly or contact support.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Charity Selection */}
      <div>
        <label className="block text-sm font-bold mb-3 text-slate-800">Choose Your Charity</label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="brutal-input mb-4 w-full"
          placeholder="Search charities"
          aria-label="Search charities"
        />
        {filteredCharities.length === 0 && (
          <p className="brutal-card mb-4 p-4 text-center text-sm text-muted">No charities match your search.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCharities.map((charity) => (
            <div
              key={charity.id}
              onClick={() => onSelect(charity.id)}
              className={`brutal-card p-6 cursor-pointer text-slate-950 transition-all duration-300 hover:scale-105 ${
                selectedCharity === charity.id
                  ? 'border-4 border-primary bg-primary/10'
                  : 'border-2 border-transparent hover:border-primary/50'
              }`}
            >
              {(charity.image_url || charity.logo_url) && (
                <img
                  src={charity.image_url || charity.logo_url}
                  alt={charity.name}
                  className="h-16 w-auto mx-auto mb-3 object-contain"
                />
              )}
              <h3 className="text-lg font-bold text-center mb-2 text-slate-950">{charity.name}</h3>
              <p className="text-sm text-muted text-center line-clamp-2">
                {charity.description}
              </p>
              {selectedCharity === charity.id && (
                <div className="mt-3 text-center">
                  <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                    ✓ Selected
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contribution Percentage */}
      {selectedCharity && (
        <div className="animate-fade-in">
          <label className="block text-sm font-bold mb-3">
            Contribution Percentage: <span className="text-primary text-lg">{contribution}%</span>
          </label>
          <div className="flex gap-3">
            {contributionOptions.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => onContributionChange(option)}
                className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${
                  contribution === option
                    ? 'bg-primary text-white scale-105'
                    : 'bg-white text-slate-950 hover:bg-slate-50'
                }`}
              >
                {option}%
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label htmlFor="custom-contribution" className="block text-xs font-bold text-muted">
              Custom contribution
            </label>
            <input
              id="custom-contribution"
              type="number"
              min={10}
              max={100}
              value={contribution}
              onChange={(e) => onContributionChange(Math.max(10, Math.min(100, Number(e.target.value) || 10)))}
              className="brutal-input mt-2 w-full"
            />
          </div>
          <p className="text-xs text-muted mt-2 text-center">
            Minimum contribution is 10%.
          </p>
        </div>
      )}
    </div>
  )
}
