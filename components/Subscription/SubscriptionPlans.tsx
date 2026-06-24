"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function SubscriptionPlans() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = React.useState<'monthly' | 'yearly' | null>(null)

  const prices = [
    { plan: 'monthly' as const, label: 'Monthly', price: '£10', period: '/month' },
    { plan: 'yearly' as const, label: 'Yearly', price: '£100', period: '/year' }
  ]

  async function handlePlanSelect(plan: 'monthly' | 'yearly') {
    if (loadingPlan) return
    setLoadingPlan(plan)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data?.session?.access_token
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan })
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      window.location.assign(data.url)
    } catch (err: any) {
      alert(err?.message || 'Failed to start checkout')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {prices.map((p) => (
        <div key={p.plan} className="brutal-card p-6">
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
            onClick={() => handlePlanSelect(p.plan)}
            disabled={Boolean(loadingPlan)}
            className="brutal-btn brutal-btn-primary w-full"
          >
            {loadingPlan === p.plan ? 'Redirecting...' : `Choose ${p.label}`}
          </button>
        </div>
      ))}
    </div>
  )
}
