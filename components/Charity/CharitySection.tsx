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

  if (loading) return <div>Loading charities...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {charities.map((c) => (
        <div key={c.id} className="brutal-card p-6">
          <h3 className="text-xl font-bold">{c.name}</h3>
          <p className="text-sm text-muted">{c.description}</p>
        </div>
      ))}
    </div>
  )
}