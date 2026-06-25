"use client"

import { useEffect, useState } from "react"
import { getCharityImage } from "../../lib/charityImages"

export default function CharitySection() {
  const [charities, setCharities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/charities")
        const payload = await response.json()
        setCharities(payload.charities || [])
      } catch {
        setCharities([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="brutal-card h-48 animate-pulse p-6">
            <div className="mb-5 h-10 w-24 rounded-md bg-slate-200" />
            <div className="h-5 w-2/3 rounded-md bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded-md bg-slate-200" />
            <div className="mt-2 h-4 w-5/6 rounded-md bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  if (charities.length === 0) {
    return (
      <div className="brutal-card mx-auto max-w-2xl p-8 text-center">
        <p className="section-eyebrow">Charity partners</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Partner charities are being prepared.</h3>
        <p className="mt-3 text-sm leading-6 text-muted">
          Members can still complete onboarding, and available charities will appear here as soon as they are active.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {charities.map((c, index) => {
        const imageUrl = getCharityImage(c)

        return (
          <div key={c.id || c.name} className="brutal-card flex h-full flex-col overflow-hidden text-slate-950">
            <div className="relative aspect-[4/3] overflow-hidden bg-primary/10">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${c.name} charity`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={`charity-image-fallback charity-tone-${index % 4}`}>
                  <span>{String(c.name || 'C').slice(0, 1)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 brutal-badge bg-white/92 text-slate-950">
                Supported cause
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-xl font-black text-slate-950">{c.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                {c.description || 'Players can select this charity during onboarding and direct their chosen contribution toward it.'}
              </p>
              {c.website && (
                <a
                  href={c.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 text-sm font-bold text-primary hover:underline"
                >
                  Learn more
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
