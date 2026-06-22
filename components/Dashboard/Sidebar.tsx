"use client"
import React from 'react'
import Link from 'next/link'

export default function DashboardSidebar() {
  return (
    <aside className="w-64 bg-surface p-4 min-h-screen hidden md:block">
      <div className="mb-6 font-bold">Play4Purpose</div>
      <nav className="flex flex-col gap-2">
        <Link href="/dashboard">Overview</Link>
        <Link href="/scores">Scores</Link>
        <Link href="/draws">Draws</Link>
        <Link href="/winnings">Winnings</Link>
      </nav>
    </aside>
  )
}
