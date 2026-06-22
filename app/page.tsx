export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Play4Purpose</h1>
        <p className="mt-4 text-muted">MVP foundation — Phase 2 in progress</p>
        <div className="mt-6 space-x-4">
          <a href="/register" className="px-4 py-2 bg-primary rounded-md">Register</a>
          <a href="/login" className="px-4 py-2 bg-surface rounded-md">Login</a>
        </div>
      </div>
    </main>
  )
}
