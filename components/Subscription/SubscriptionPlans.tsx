"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function SubscriptionPlans() {
  const router = useRouter()

  const prices = [
    { id: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_monthly', label: 'Monthly', price: '£10', period: '/month' },
    { id: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || 'price_yearly', label: 'Yearly', price: '£100', period: '/year' }
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
    } else {
      alert(data.error || 'Failed to start checkout')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {prices.map((p) => (
        <div key={p.id} className="brutal-card p-6">
          <h3 className="text-2xl font-black mb-2">{p.label}</h3>
          <div className="mb-4">
            <span className="text-4xl font-black">{p.price}</span>
            <span className="text-muted">{p.period}</span>
          </div>
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Unlimited score entries
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Monthly prize draw entry
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Charity contributions
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Win up to 40% of prize pool
            </li>
          </ul>
          <button
            onClick={() => handleCheckout(p.id)}
            className="brutal-btn brutal-btn-primary w-full"
          >
            Choose {p.label}
          </button>
        </div>
      ))}
    </div>
  )
}