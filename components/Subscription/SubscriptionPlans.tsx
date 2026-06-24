"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function SubscriptionPlans() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = React.useState<'monthly' | 'yearly' | null>(null)

  const prices = [
    {
      plan: null,
      label: 'Trial',
      eyebrow: 'Explore',
      price: '£0',
      period: '7 days',
      popular: false,
      description: 'Get started, choose your charity, and see how the member console works.',
      cta: 'Continue trial'
    },
    {
      plan: 'monthly' as const,
      label: 'Monthly',
      eyebrow: 'Flexible',
      price: '£10',
      period: '/month',
      popular: false,
      description: 'A simple monthly membership for steady play and monthly prize draw access.',
      cta: 'Choose monthly'
    },
    {
      plan: 'yearly' as const,
      label: 'Yearly',
      eyebrow: 'Best value',
      price: '£100',
      period: '/year',
      popular: true,
      description: 'Two months included compared with paying monthly, with the same full access.',
      cta: 'Choose yearly'
    }
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {prices.map((p) => (
        <div
          key={p.label}
          className={`brutal-card ticket-card relative flex min-h-[31rem] flex-col p-6 ${
            p.popular ? 'border-primary shadow-[0_24px_80px_rgba(23,111,77,0.24)]' : ''
          }`}
        >
          {p.popular && (
            <span className="brutal-badge absolute right-4 top-4 bg-primary text-white">Popular</span>
          )}
          <p className="section-eyebrow">{p.eyebrow}</p>
          <h3 className="mt-2 text-2xl font-black">{p.label}</h3>
          <p className="mt-3 min-h-[3rem] text-sm leading-6 text-muted">{p.description}</p>
          <div className="mb-5 mt-6 rounded-md bg-white/60 p-4">
            <span className="text-4xl font-black">{p.price}</span>
            <span className="text-muted">{p.period}</span>
          </div>
          <ul className="mb-6 space-y-3 text-sm">
            <li className="flex items-center">
              <span className="mr-2 text-green-500">✓</span>
              Unlimited score entries
            </li>
            <li className="flex items-center">
              <span className="mr-2 text-green-500">✓</span>
              Monthly prize draw entry
            </li>
            <li className="flex items-center">
              <span className="mr-2 text-green-500">✓</span>
              Charity contributions
            </li>
            <li className="flex items-center">
              <span className="mr-2 text-green-500">✓</span>
              Win up to 40% of prize pool
            </li>
          </ul>
          <button
            onClick={() => p.plan ? handlePlanSelect(p.plan) : router.push('/dashboard')}
            disabled={Boolean(loadingPlan)}
            className={`brutal-btn mt-auto w-full ${p.popular ? 'brutal-btn-accent' : 'brutal-btn-outline'}`}
          >
            {loadingPlan === p.plan ? 'Redirecting...' : p.cta}
          </button>
        </div>
      ))}
    </div>
  )
}
