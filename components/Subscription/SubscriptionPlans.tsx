"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function SubscriptionPlans() {
  const router = useRouter()

  const prices = [
    { id: 'price_monthly_placeholder', label: 'Monthly', price: '$9' },
    { id: 'price_yearly_placeholder', label: 'Yearly', price: '$90' }
  ]

  async function handleCheckout(priceId: string) {
    const session = await supabase.auth.getSession()
    const token = session.data?.session?.access_token
    if (!token) return router.push('/login')

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ priceId, returnUrl: window.location.origin + '/dashboard' })
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {prices.map((p) => (
        <div key={p.id} className="p-6 bg-surface rounded-lg">
          <div className="text-xl font-semibold">{p.label}</div>
          <div className="text-3xl my-4">{p.price}</div>
          <button onClick={() => handleCheckout(p.id)} className="px-4 py-2 bg-primary rounded-md">Choose {p.label}</button>
        </div>
      ))}
    </div>
  )
}
