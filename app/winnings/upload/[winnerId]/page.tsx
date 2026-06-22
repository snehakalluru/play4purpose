"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../services/supabaseClient'
import { useRouter } from 'next/navigation'

export default function UploadProofPage() {
  const params = useParams()
  const winnerId = params.winnerId as string
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const result = await supabase.auth.getUser()
      const user = (result.data as any)?.user
      if (!user) router.push('/login')
    }
    checkAuth()
  }, [router])

  async function uploadProof() {
    if (!file) return setError('Please select a file')
    setUploading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `winner-proofs/${session.user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('winner-proofs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('winner-proofs')
        .getPublicUrl(filePath)

      // Save proof URL to winner record
      const res = await fetch('/api/winners/upload-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ winner_id: winnerId, file_url: publicUrl })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save proof')

      alert('Proof uploaded successfully!')
      router.push('/winnings')
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-6 uppercase">Upload Verification Proof</h1>

        <div className="brutal-card p-6">
          <p className="mb-4 text-muted">
            Please upload a photo or PDF of your verification document (ID, proof of address, etc.).
            Accepted formats: JPG, PNG, PDF
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-600 text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="proof-file" className="block text-sm font-bold mb-2">Select File</label>
              <input
                id="proof-file"
                title="Upload verification proof"
                placeholder="Choose a file..."
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 rounded-md bg-surface"
              />
            </div>

            {file && (
              <div className="p-3 bg-surface rounded">
                <p className="text-sm">Selected: {file.name}</p>
                <p className="text-xs text-muted">Size: {(file.size / 1024).toFixed(2)} KB</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={uploadProof}
                disabled={!file || uploading}
                className="brutal-btn brutal-btn-primary"
              >
                {uploading ? 'Uploading...' : 'Upload Proof'}
              </button>
              <button
                onClick={() => router.back()}
                className="brutal-btn brutal-btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}