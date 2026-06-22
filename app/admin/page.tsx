import React from 'react'
import { supabaseAdmin } from '../../services/supabaseAdmin'
import AdminWinnersPanel from '../../components/Admin/AdminWinnersPanel'
import RunDrawButton from '../../components/Admin/RunDrawButton'

export default async function AdminPage() {
  // Fetch a short list of users for admin view
  const { data: users } = await supabaseAdmin.from('profiles').select('id,full_name,email,role').limit(50)

  return (
    <div className="min-h-screen p-8 bg-background text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl mb-6">Admin</h1>
        <div className="mb-6">
          <RunDrawButton />
        </div>

        <section className="bg-surface p-4 rounded-md mb-6">
          <h2 className="text-xl mb-3">Users</h2>
          <div className="grid grid-cols-1 gap-2">
            {users?.map((u: any) => (
              <div key={u.id} className="p-2 bg-background/20 rounded">
                <div className="font-semibold">{u.full_name || u.email}</div>
                <div className="text-sm">{u.email}</div>
                <div className="text-xs text-muted">role: {u.role}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface p-4 rounded-md">
          <h2 className="text-xl mb-3">Winners & Proofs</h2>
          <AdminWinnersPanel />
        </section>
      </div>
    </div>
  )
}
