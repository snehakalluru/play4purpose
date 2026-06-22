import React from 'react'

export default function DashboardOverview({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="p-6 bg-surface rounded-lg">
        <h2 className="text-xl font-semibold">Account</h2>
        <div className="mt-2">Name: {data?.full_name ?? '—'}</div>
        <div>Charity: {data?.charity?.name ?? '—'}</div>
        <div>Contribution: {data?.contribution_percentage ?? '—'}%</div>
      </div>
      <div className="p-6 bg-surface rounded-lg">
        <h2 className="text-xl font-semibold">Subscription</h2>
        <div className="mt-2">Status: {data?.subscription?.status ?? 'inactive'}</div>
        <div>Plan: {data?.subscription?.tier ?? '—'}</div>
        <div>Renewal: {data?.subscription?.current_period_end ?? '—'}</div>
      </div>
    </div>
  )
}
