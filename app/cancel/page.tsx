import Link from 'next/link'

export default function PaymentCancelPage() {
  return (
    <main className="min-h-screen bg-background text-white p-8">
      <div className="max-w-2xl mx-auto brutal-card p-8">
        <h1 className="text-3xl font-black mb-3">Payment cancelled</h1>
        <p className="text-muted mb-6">
          Checkout was cancelled before payment completed. You can choose a plan again whenever you are ready.
        </p>
        <Link href="/onboarding/plan" className="brutal-btn brutal-btn-primary inline-block">
          Choose a plan
        </Link>
      </div>
    </main>
  )
}
