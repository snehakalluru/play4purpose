"use client"

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

const publicPrefixes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/success',
  '/cancel'
]

function isPublicRoute(pathname: string) {
  if (pathname === '/') return true
  return publicPrefixes.some((prefix) => prefix !== '/' && (pathname === prefix || pathname.startsWith(`${prefix}/`)))
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <TopNav />
        <main>{children}</main>
      </div>
    </div>
  )
}
