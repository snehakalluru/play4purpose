"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '⌘' },
  { href: '/scores', label: 'Scores', icon: '◷' },
  { href: '/draws', label: 'Draws', icon: '◇' },
  { href: '/winnings', label: 'Winnings', icon: '£' },
  { href: '/onboarding/plan', label: 'Plan', icon: '◌' }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-black/10 bg-white/60 px-4 py-5 backdrop-blur-xl lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-md px-2">
        <span className="grid h-10 w-10 place-items-center rounded-md premium-gradient font-black text-white shadow-lg shadow-primary/20">
          P4
        </span>
        <span>
          <span className="block text-base font-black leading-tight">Play4Purpose</span>
          <span className="text-xs font-semibold text-muted">Golf that gives back</span>
        </span>
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition ${
                active
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-600 hover:bg-white/90 hover:text-slate-950'
              }`}
            >
              <span className="grid h-7 w-7 place-items-center rounded-md bg-white/20 text-sm">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
