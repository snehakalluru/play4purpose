export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-black uppercase">Privacy Policy</h1>
        <p className="text-muted">
          Play4Purpose collects the account, subscription, charity, score, draw, and payout information needed to run
          the service.
        </p>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Information We Use</h2>
          <p>
            We use your profile details, selected plan, charity contribution, score entries, draw results, and payout
            verification details to provide account access and administer draws.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Service Providers</h2>
          <p>
            Authentication, database, payment, and email providers may process data on our behalf only to operate the
            platform and related support workflows.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Your Choices</h2>
          <p>
            You may request correction or deletion of eligible account data, subject to security, legal, financial, and
            fraud-prevention retention requirements.
          </p>
        </section>
      </div>
    </main>
  )
}
