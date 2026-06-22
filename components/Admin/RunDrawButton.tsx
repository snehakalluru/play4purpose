"use client"

export default function RunDrawButton() {
  async function runDraw() {
    const token = (document.cookie.match(/sb-access-token=([^;]+)/) || [])[1]
    const res = await fetch('/api/admin/run-draw', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    alert(json.ok ? `Draw run: ${json.draw_id}` : `Error: ${json.error}`)
  }

  return (
    <button id="run-draw" className="px-4 py-2 bg-accent rounded-md" onClick={runDraw}>
      Run Draw
    </button>
  )
}
