"use client"
import React from 'react'
import { supabase } from '../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function DashboardHeader({ name }: { name?: string }) {
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="flex items-center justify-between p-4 bg-transparent">
      <div className="text-lg font-semibold">Welcome{ name ? `, ${name}` : '' }</div>
      <div>
        <button onClick={logout} className="px-3 py-1 bg-surface rounded-md">Sign out</button>
      </div>
    </header>
  )
}
