export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-black uppercase">Terms &amp; Conditions</h1>
        <p className="text-muted">
          By creating a Play4Purpose account, you agree that a subscription plan is mandatory for gameplay access. New
          subscriptions include a 7-day free trial before paid billing begins.
        </p>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Subscription And Trial</h2>
          <p>
            You must choose a monthly or yearly plan during registration. Your account starts with trial_active status
            for 7 days. After the trial, continued score entry, draw access, and winnings features require an active
            subscription.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Charity Contribution</h2>
          <p>
            You must select a charity and commit at least 10% of eligible winnings or contributions to that charity.
            You can update your charity selection where account settings allow it.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Draws And Payouts</h2>
          <p>
            Draw participation depends on account eligibility, score submission rules, and subscription status. Winners
            may be required to complete verification before a payout is processed.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Account Responsibility</h2>
          <p>
            You are responsible for keeping your account information accurate and complying with all applicable rules.
            Play4Purpose may restrict access for misuse, fraud, or policy violations.
          </p>
        </section>
      </div>
    </main>
  )
}
