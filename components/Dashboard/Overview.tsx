import React from 'react'

export default function DashboardOverview({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="brutal-card p-6">
        <h2 className="text-xl font-bold mb-3">Account</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted">Name:</span>
            <span className="font-semibold">{data?.full_name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Charity:</span>
            <span className="font-semibold">{data?.charity?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Contribution:</span>
            <span className="font-semibold">{data?.contribution_percentage ?? '—'}%</span>
          </div>
        </div>
      </div>

      <div className="brutal-card p-6">
        <h2 className="text-xl font-bold mb-3">Subscription</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted">Status:</span>
            <span className={`brutal-badge ${data?.subscription?.status === 'active' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
              {data?.subscription?.status ?? 'inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Plan:</span>
            <span className="font-semibold capitalize">{data?.subscription?.plan_type ?? '—'}</span>
          </div>
          {data?.subscription?.current_period_end && (
            <div className="flex justify-between">
              <span className="text-muted">Renewal:</span>
              <span className="font-semibold">{new Date(data.subscription.current_period_end).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        {data?.subscription?.status !== 'active' && (
          <a href="/onboarding/plan" className="brutal-btn brutal-btn-primary mt-4 inline-block">
            Subscribe Now
          </a>
        )}
      </div>

      <div className="brutal-card p-6">
        <h2 className="text-xl font-bold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <a href="/scores" className="brutal-btn brutal-btn-outline text-center">Enter Scores</a>
          <a href="/draws" className="brutal-btn brutal-btn-outline text-center">View Draws</a>
          <a href="/winnings" className="brutal-btn brutal-btn-outline text-center">My Winnings</a>
          <a href="/onboarding/charity" className="brutal-btn brutal-btn-outline text-center">Change Charity</a>
        </div>
      </div>
    </div>
  )
}