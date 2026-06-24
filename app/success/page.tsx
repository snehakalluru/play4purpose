import Link from 'next/link'

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-background text-white p-8">
      <div className="max-w-2xl mx-auto brutal-card p-8">
        <h1 className="text-3xl font-black mb-3">Payment successful</h1>
        <p className="text-muted mb-6">
          Thanks. Your payment is being confirmed and your account will update as soon as Stripe sends the webhook.
        </p>
        <Link href="/dashboard" className="brutal-btn brutal-btn-primary inline-block">
          Go to dashboard
        </Link>
      </div>
    </main>
  )
}
