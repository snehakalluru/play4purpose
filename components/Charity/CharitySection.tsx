"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

export default function CharitySection() {
  const [charities, setCharities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function load() {
      const { data } = await supabase
        .from("charities")
        .select("*")
        .limit(3)

      setCharities(data || [])
      setLoading(false)
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {charities.map((c) => (
        <div key={c.id} className="brutal-card flex h-full flex-col p-6 text-slate-950">
          <div className="mb-5 flex h-16 items-center">
          {(c.image_url || c.logo_url) && (
            <img
              src={c.image_url || c.logo_url}
              alt={c.name}
              className="h-14 w-auto max-w-full object-contain"
            />
          )}
            {!c.image_url && !c.logo_url && (
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-lg font-black text-primary">
                {String(c.name || 'C').slice(0, 1)}
              </div>
            )}
          </div>
          <p className="section-eyebrow">Supported cause</p>
          <h3 className="text-xl font-bold text-slate-950">{c.name}</h3>
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
      ))}
    </div>
  )
}
