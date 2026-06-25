import Link from 'next/link'
import CharitySection from '../components/Charity/CharitySection'
import { createClient } from '@supabase/supabase-js'

// Revalidate every 60 seconds
export const revalidate = 60

async function getStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function fetchWinnerAmounts() {
    const amountResult = await supabase.from('winners').select('amount')
    if (!amountResult.error) return amountResult.data || []

    const prizeAmountResult = await supabase.from('winners').select('prize_amount')
    if (!prizeAmountResult.error) return prizeAmountResult.data || []

    return []
  }

  const [
    { count: totalPlayers },
    { count: totalScores },
    winners,
    { data: charities }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('scores').select('*', { count: 'exact', head: true }),
    fetchWinnerAmounts(),
    supabase.from('charities').select('*')
  ])

  const totalRaised = winners?.reduce((sum, w: any) => sum + Number(w.amount ?? w.prize_amount ?? 0), 0) || 0

  return {
    totalPlayers: totalPlayers || 0,
    totalScores: totalScores || 0,
    totalRaised: totalRaised.toFixed(2),
    charityCount: charities?.length || 0
  }
}


export default async function HomePage() {
  const stats = await getStats()
  const raisedValue = Number(stats.totalRaised)
  const headlineStats = [
    {
      value: stats.totalPlayers > 0 ? stats.totalPlayers.toLocaleString() : 'Founding',
      label: 'player access'
    },
    {
      value: stats.totalScores > 0 ? stats.totalScores.toLocaleString() : 'Scorecards',
      label: 'logged to enter'
    },
    {
      value: raisedValue > 0 ? `£${raisedValue.toFixed(2)}` : 'Monthly',
      label: 'draw rhythm'
    },
    {
      value: stats.charityCount > 0 ? stats.charityCount.toLocaleString() : '10%+',
      label: 'giving choice'
    }
  ]

  return (
    <div className="min-h-screen bg-background text-slate-950 overflow-hidden">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/10 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-black uppercase tracking-tight">
            Play4Purpose
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="#charities" className="hidden text-sm font-bold text-muted hover:text-primary sm:inline">
              Charities
            </Link>
            <Link href="#how-it-works" className="hidden text-sm font-bold text-muted hover:text-primary sm:inline">
              How It Works
            </Link>
            <Link href="/login" className="rounded-full border-2 border-black/10 bg-white/70 px-4 py-2 text-sm font-bold text-slate-950 hover:border-primary">
              Login
            </Link>
            <Link href="/register" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="course-hero relative min-h-screen px-6 pb-16 pt-28 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,255,248,0.84)_0%,rgba(244,247,241,0.78)_58%,rgba(234,240,229,0.92)_100%)]" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/90 px-4 py-2 text-slate-950 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              <span className="text-sm font-semibold">Golf scores. Prize draws. Charity impact.</span>
            </div>

            <h1 className="mt-7 max-w-4xl text-6xl font-black leading-[0.95] text-slate-950 md:text-8xl lg:text-9xl">
              Play.
              <br />
              <span className="text-primary">Win.</span>
              <br />
              Give.
            </h1>

            <p className="mt-7 max-w-2xl text-xl leading-8 text-muted md:text-2xl">
              A sharper golf charity app where every scorecard feeds a monthly prize ticket and every member chooses the cause their play supports.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-primary px-9 py-4 text-lg font-black text-white shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90"
              >
                Start Free Trial
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border-2 border-black/10 bg-white px-9 py-4 text-lg font-black text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-primary"
              >
                See The Loop
              </Link>
            </div>
            <div className="mt-5 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center">
              <span className="font-bold text-primary">7-day trial, no card required</span>
              <span className="hidden sm:inline">|</span>
              <Link href="/login" className="font-bold text-slate-950 hover:text-primary">
                Existing player login
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-2 gap-3">
              {headlineStats.map((item) => (
                <div key={item.label} className="rounded-md border border-black/10 bg-white/82 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-black leading-tight text-slate-950">{item.value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="ticket-showcase rounded-md border border-black/10 bg-white/82 p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4">
                <div>
                  <p className="section-eyebrow">Live ticket</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">July Prize Draw</h2>
                </div>
                <span className="brutal-badge bg-primary text-white">Active</span>
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2">
                {[7, 14, 22, 31, 40].map((number) => (
                  <div key={number} className="grid aspect-square place-items-center rounded-full bg-slate-950 text-xl font-black text-white shadow-inner">
                    {number}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-md bg-primary/10 p-4">
                  <p className="text-xs font-bold uppercase text-muted">Jackpot</p>
                  <p className="mt-1 text-2xl font-black text-primary">40%</p>
                </div>
                <div className="rounded-md bg-accent/20 p-4">
                  <p className="text-xs font-bold uppercase text-muted">Second</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">35%</p>
                </div>
                <div className="rounded-md bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase text-muted">Third</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">25%</p>
                </div>
              </div>

              <div className="mt-6 rounded-md bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between text-sm font-bold text-white/70">
                  <span>Entry readiness</span>
                  <span>4 / 5 cards</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-4/5 rounded-full bg-accent" />
                </div>
                <p className="mt-4 text-sm leading-6 text-white/78">
                  The member dashboard keeps scores, draw status, prize tiers, and charity choice in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-eyebrow">Player journey</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Built around the same simple promise: play golf, win prizes, and give back.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-black">
                1
              </div>
              <div className="brutal-card p-8 pt-12 hover:scale-105 transition-transform duration-300">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-xl font-black text-primary">P</div>
                <h3 className="text-2xl font-bold mb-3">Play and log scores</h3>
                <p className="text-muted leading-relaxed">
                  Enter your golf scores after each round. Your latest score history helps determine monthly draw eligibility.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-black">
                2
              </div>
              <div className="brutal-card p-8 pt-12 hover:scale-105 transition-transform duration-300">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-accent/20 text-xl font-black text-slate-950">G</div>
                <h3 className="text-2xl font-bold mb-3">Choose your cause</h3>
                <p className="text-muted leading-relaxed">
                  Pick the charity you want to support and set a contribution percentage before continuing with membership.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-black">
                3
              </div>
              <div className="brutal-card p-8 pt-12 hover:scale-105 transition-transform duration-300">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-xl font-black text-primary">W</div>
                <h3 className="text-2xl font-bold mb-3">Enter prize draws</h3>
                <p className="text-muted leading-relaxed">
                  Eligible players can join monthly draws, track prize pools, and review winnings from the member console.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-eyebrow">Why players return</p>
              <h2 className="mt-2 text-4xl font-black text-slate-950 md:text-6xl">Built around the next card.</h2>
            </div>
            <p className="max-w-xl text-muted">
              The real habit is simple: log a score, watch draw readiness improve, keep the charity impact visible, then come back for the next round.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="course-card rounded-md p-7 text-white">
              <p className="text-sm font-bold uppercase tracking-widest text-white/70">This month</p>
              <h3 className="mt-3 text-3xl font-black">One more score unlocks momentum.</h3>
              <div className="mt-8 space-y-4">
                {[
                  { label: 'Scores logged', value: '4 of 5', width: '80%' },
                  { label: 'Charity selected', value: 'Ready', width: '100%' },
                  { label: 'Draw ticket', value: 'Almost live', width: '68%' }
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm font-bold text-white/80">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-accent" style={{ width: item.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[
                {
                  title: 'Score streaks',
                  text: 'Recent scorecards stay close to the prize draw journey, so players can see what to do next.'
                },
                {
                  title: 'Prize visibility',
                  text: 'Prize pool, jackpot tier, and draw state are visible before the player decides to enter.'
                },
                {
                  title: 'Cause ownership',
                  text: 'Charity selection is not hidden in settings. It stays part of the member identity.'
                },
                {
                  title: 'Fast return paths',
                  text: 'Score entry, draws, and winnings are one click away from the dashboard.'
                }
              ].map((item) => (
                <div key={item.title} className="brutal-card p-6">
                  <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Charities Section */}
      <section id="charities" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-eyebrow">Giving partners</p>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Charities Players Support
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Keep charity choice visible from the first visit, then let members select their cause during onboarding.
            </p>
          </div>

          <CharitySection />
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-md border border-black/10 bg-white/74 shadow-xl backdrop-blur md:grid-cols-3">
          <div className="p-8 md:col-span-2">
            <p className="section-eyebrow">Prize draw clarity</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">A member console built for repeat play.</h2>
            <p className="mt-4 max-w-2xl text-muted">
              Players can submit scores, review active draws, see prize pools, manage charity selection, and track winnings without hunting through separate pages.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {['Score history', 'Prize pools', 'Giving impact'].map((item) => (
                <div key={item} className="rounded-md border border-black/10 bg-white/80 p-4 text-sm font-bold text-slate-950">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="premium-gradient p-8 text-white">
            <p className="text-sm font-bold uppercase text-white/75">Monthly rhythm</p>
            <p className="mt-6 text-5xl font-black">40%</p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Current prize allocation highlights the jackpot tier while keeping second and third prize tiers visible in admin and draw views.
            </p>
            <Link href="/draws" className="mt-8 inline-flex rounded-md bg-white px-4 py-3 text-sm font-black text-slate-950">
              View Draws
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="section-eyebrow">Ready to play</p>
          <h2 className="text-4xl md:text-6xl font-black mb-6">
            Make your next round count.
          </h2>
          <p className="text-xl text-muted mb-12 max-w-2xl mx-auto">
            Start with a free trial, choose your charity, and use the member console to keep scores, draws, and winnings in one place.
          </p>
          <Link
            href="/register"
            className="inline-block px-12 py-5 bg-primary text-white font-bold text-xl rounded-full hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-primary/50"
          >
            Start your 7-day free trial
          </Link>
          <p className="text-sm text-muted mt-6">
            No card required. Choose monthly or yearly during registration.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted text-sm">
            © 2026 Play4Purpose. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
