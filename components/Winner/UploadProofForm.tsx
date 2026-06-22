"use client"
import React, { useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function UploadProofForm({ winnerId }: { winnerId: string }) {
  const router = useRouter()
  const [fileUrl, setFileUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fileUrl) return setError('Provide a file URL (S3 or public URL)')
    setLoading(true)
    const session = await supabase.auth.getSession()
    const token = session.data?.session?.access_token
    if (!token) {
      setLoading(false)
      return router.push('/login')
    }

    const res = await fetch('/api/winners/upload-proof', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ winner_id: winnerId, file_url: fileUrl }) })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) return setError(json?.error || 'Upload failed')
    alert('Proof uploaded — awaiting review')
    router.push('/dashboard')
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-md">
      {error && <div className="text-red-400">{error}</div>}
      <div>
        <label className="block text-sm">Proof file URL</label>
        <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="w-full px-3 py-2 rounded-md bg-surface" />
      </div>
      <div>
        <button className="px-4 py-2 bg-primary rounded-md" disabled={loading}>{loading ? 'Uploading...' : 'Upload Proof'}</button>
      </div>
    </form>
  )
}
