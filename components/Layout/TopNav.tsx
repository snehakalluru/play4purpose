"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mobileNav = [
  { href: '/dashboard', label: 'Home' },
  { href: '/scores', label: 'Scores' },
  { href: '/draws', label: 'Draws' },
  { href: '/winnings', label: 'Wins' }
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-3 lg:hidden">
          <span className="grid h-9 w-9 place-items-center rounded-md premium-gradient text-sm font-black text-white">
            P4
          </span>
          <span className="font-black">Play4Purpose</span>
        </Link>

        <div className="hidden lg:block">
          <p className="text-sm font-bold text-slate-500">Member console</p>
          <p className="text-xs text-muted">Scorecards, prize tickets, and giving impact.</p>
        </div>

        <nav className="hidden items-center gap-1 md:flex lg:hidden">
          {mobileNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-bold ${
                  active ? 'bg-primary text-white' : 'text-slate-600 hover:bg-white/80'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/scores" className="brutal-btn brutal-btn-outline hidden sm:inline-flex">
            Add score
          </Link>
          <Link href="/onboarding/plan" className="brutal-btn brutal-btn-accent">
            Upgrade
          </Link>
        </div>
      </div>

      <nav className="grid grid-cols-4 gap-1 border-t border-black/10 px-2 py-2 md:hidden">
        {mobileNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-2 py-2 text-center text-xs font-bold ${
                active ? 'bg-primary text-white' : 'text-slate-600'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
