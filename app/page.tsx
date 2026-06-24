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

  const [
    { count: totalPlayers },
    { count: totalScores },
    { data: winners },
    { data: charities }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('scores').select('*', { count: 'exact', head: true }),
    supabase.from('winners').select('amount'),
    supabase.from('charities').select('*')
  ])

  const totalRaised = winners?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

  return {
    totalPlayers: totalPlayers || 0,
    totalScores: totalScores || 0,
    totalRaised: totalRaised.toFixed(2),
    charityCount: charities?.length || 0
  }
}


export default async function HomePage() {
  const stats = await getStats()

  return (
    <div className="min-h-screen bg-background text-white overflow-hidden">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-black uppercase tracking-tight">
            Play4Purpose
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="#charities" className="hidden text-sm font-bold text-muted hover:text-white sm:inline">
              Charities
            </Link>
            <Link href="#how-it-works" className="hidden text-sm font-bold text-muted hover:text-white sm:inline">
              How It Works
            </Link>
            <Link href="/login" className="rounded-full border-2 border-white/20 px-4 py-2 text-sm font-bold hover:border-primary">
              Login
            </Link>
            <Link href="/register" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border-2 border-primary mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-semibold">Monthly Prize Draws Active</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            Play Golf.
            <br />
            <span className="text-primary">Support Charity.</span>
            <br />
            Win Big.
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted max-w-3xl mx-auto mb-12 leading-relaxed">
            Join thousands of golfers turning their passion into purpose. 
            Start your 7-day free trial with no card required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="group relative px-8 py-4 bg-primary text-white font-bold text-lg rounded-full hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-primary/50"
            >
              <span className="relative z-10">Start Playing Today</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 bg-surface text-white font-bold text-lg rounded-full border-2 border-white/20 hover:border-primary hover:scale-105 transition-all duration-300"
            >
              See How It Works
            </Link>
          </div>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 text-sm text-muted sm:flex-row">
            <Link href="/register" className="font-bold text-primary hover:underline">
              Register for your free trial
            </Link>
            <span className="hidden sm:inline">|</span>
            <Link href="/login" className="font-bold text-white hover:text-primary">
              Existing player login
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            <div className="brutal-card p-6 hover:scale-105 transition-transform duration-300">
              <div className="text-4xl md:text-5xl font-black text-primary mb-2">
                {stats.totalPlayers}
              </div>
              <div className="text-sm text-muted uppercase tracking-wider">Active Players</div>
            </div>
            <div className="brutal-card p-6 hover:scale-105 transition-transform duration-300">
              <div className="text-4xl md:text-5xl font-black text-accent mb-2">
                {stats.totalScores}
              </div>
              <div className="text-sm text-muted uppercase tracking-wider">Scores Submitted</div>
            </div>
            <div className="brutal-card p-6 hover:scale-105 transition-transform duration-300">
              <div className="text-4xl md:text-5xl font-black text-primary mb-2">
                £{stats.totalRaised}
              </div>
              <div className="text-sm text-muted uppercase tracking-wider">Total Raised</div>
            </div>
            <div className="brutal-card p-6 hover:scale-105 transition-transform duration-300">
              <div className="text-4xl md:text-5xl font-black text-accent mb-2">
                {stats.charityCount}
              </div>
              <div className="text-sm text-muted uppercase tracking-wider">Charities</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Three simple steps to make every round count
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-black">
                1
              </div>
              <div className="brutal-card p-8 pt-12 hover:scale-105 transition-transform duration-300">
                <div className="text-6xl mb-4">⛳</div>
                <h3 className="text-2xl font-bold mb-3">Submit Your Scores</h3>
                <p className="text-muted leading-relaxed">
                  Enter your golf scores after each round. We track your last 5 scores 
                  to calculate your rolling average.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-black">
                2
              </div>
              <div className="brutal-card p-8 pt-12 hover:scale-105 transition-transform duration-300">
                <div className="text-6xl mb-4">❤️</div>
                <h3 className="text-2xl font-bold mb-3">Support Charity</h3>
                <p className="text-muted leading-relaxed">
                  Choose your favorite charity and set your contribution percentage. 
                  Every subscription makes a difference.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-black">
                3
              </div>
              <div className="brutal-card p-8 pt-12 hover:scale-105 transition-transform duration-300">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-2xl font-bold mb-3">Win Prizes</h3>
                <p className="text-muted leading-relaxed">
                  Enter monthly draws automatically. Win up to 40% of the prize pool 
                  while supporting causes you care about.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Charities Section */}
      <section id="charities" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Charities We Support
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Your membership directly supports these amazing organizations
            </p>
          </div>

          <CharitySection />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6">
            Ready to Make an Impact?
          </h2>
          <p className="text-xl text-muted mb-12 max-w-2xl mx-auto">
            Join Play4Purpose today and transform your golf game into force for good. 
            Subscribe now and start winning while giving back.
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
