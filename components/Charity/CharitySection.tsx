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

  if (loading) return <div className="text-center text-slate-700">Loading charities...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {charities.map((c) => (
        <div key={c.id} className="brutal-card p-6 text-slate-950">
          {(c.image_url || c.logo_url) && (
            <img
              src={c.image_url || c.logo_url}
              alt={c.name}
              className="mb-4 h-14 w-auto max-w-full object-contain"
            />
          )}
          <h3 className="text-xl font-bold text-slate-950">{c.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{c.description}</p>
        </div>
      ))}
    </div>
  )
}
