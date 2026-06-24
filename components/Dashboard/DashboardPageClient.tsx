"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../services/supabaseClient'

export default function DashboardPageClient() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [charity, setCharity] = useState<any>(null)
  const [scores, setScores] = useState<any[]>([])
  const [draws, setDraws] = useState<any[]>([])
  const [winnings, setWinnings] = useState<any[]>([])
  const [allCharities, setAllCharities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCharityModal, setShowCharityModal] = useState(false)
  const [selectedCharityId, setSelectedCharityId] = useState('')
  const [contribution, setContribution] = useState(10)
  const [savingCharity, setSavingCharity] = useState(false)
  const [currentSession, setCurrentSession] = useState<any>(null)

  // Load charity from localStorage on mount
  useEffect(() => {
    const savedCharityId = localStorage.getItem('charity_id')
    const savedCharityName = localStorage.getItem('charity_name')
    const savedContribution = localStorage.getItem('charity_contribution')
    if (savedCharityId && savedCharityName) {
      setCharity({ id: savedCharityId, name: savedCharityName })
      setProfile((prev: any) => ({ ...prev, charity_id: savedCharityId, contribution_percentage: Number(savedContribution) || 10 }))
    }
    loadDashboardData()
  }, [])

  // Show charity modal once - only on first visit, check localStorage AND DB
  useEffect(() => {
    if (localStorage.getItem('charity_selected') === 'true') return
    if (!loading && allCharities.length > 0 && !charity && !profile?.charity_id) {
      setShowCharityModal(true)
    }
  }, [loading, allCharities, charity, profile])

  // Restore charity from localStorage on mount (survives logout/relogin)
  useEffect(() => {
    const savedName = localStorage.getItem('charity_name')
    if (savedName && (!charity || !charity.name)) {
      setCharity({ 
        id: localStorage.getItem('charity_id') || '', 
        name: savedName 
      })
    }
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleCharitySelect() {
    if (!selectedCharityId || !currentSession) return
    
    setSavingCharity(true)
    
    // Find the selected charity data
    const selectedCharity = allCharities.find(c => c.id === selectedCharityId)
    const charityName = selectedCharity?.name || 'Charity'

    // Always set charity locally and dismiss modal
    setCharity({ id: selectedCharityId, name: charityName })
    setProfile((prev: any) => ({ ...prev, charity_id: selectedCharityId, contribution_percentage: contribution }))
    
    // Save to localStorage so modal never shows again
    localStorage.setItem('charity_selected', 'true')
    setShowCharityModal(false)

    // Try to save to DB (non-blocking - user can proceed even if DB fails)
    try {
      await fetch('/api/user/select-charity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({
          charity_id: selectedCharityId,
          contribution_percentage: contribution
        })
      })
    } catch (e) {
      console.error('Charity DB save failed (non-fatal):', e)
    } finally {
      setSavingCharity(false)
    }
  }

  async function loadDashboardData() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    router.replace('/login')
    return
  }

  const token = session.access_token
  setCurrentSession(session)

    const profileRes = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const profileJson = await profileRes.json()
    if (profileJson.ok) {
      setProfile(profileJson.data.profile)
      setSubscription(profileJson.data.subscription)
      setCharity(profileJson.data.charity)
    }

    const scoresRes = await fetch('/api/scores?limit=5', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const scoresJson = await scoresRes.json()
    if (scoresJson.ok) setScores(scoresJson.data || [])

    const drawsRes = await fetch('/api/draws', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const drawsJson = await drawsRes.json()
    if (drawsJson.ok) setDraws(drawsJson.data || [])

    const winningsRes = await fetch('/api/winnings', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const winningsJson = await winningsRes.json()
    if (winningsJson.ok) setWinnings(winningsJson.data || [])

    const charitiesRes = await fetch('/api/charities')
    const charitiesJson = await charitiesRes.json()
    if (charitiesJson.success) setAllCharities(charitiesJson.charities || [])

    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400'
      case 'trial_active': return 'text-primary'
      case 'expired': return 'text-red-400'
      default: return 'text-muted'
    }
  }

  const trialEndDate = subscription?.trial_end_date || subscription?.current_period_end || subscription?.expires_at
  const showTrialBanner = subscription?.status === 'trial_active' && trialEndDate
  const totalWinnings = winnings.reduce((sum, w) => sum + (w.prize_amount || w.amount || 0), 0)
  const latestScore = scores[0]?.score_value ?? '-'
  const activeDraws = draws.filter((d) => d.status === 'scheduled' || d.status === 'running').length
  const contributionLabel = profile?.contribution_percentage != null ? `${profile.contribution_percentage}%` : '10%'
  const firstName = profile?.full_name?.split(' ')?.[0] || 'golfer'

  if (loading) return <div className="app-page flex items-center justify-center text-muted">Loading dashboard...</div>

  return (
    <div className="app-page">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="course-card rounded-md p-6 text-white shadow-2xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-widest text-white/75">Member dashboard</p>
              <h1 className="mt-3 text-3xl font-black md:text-5xl">Welcome back, {firstName}.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 md:text-base">
                Your scores, prize draw entries, giving impact, and subscription status are all in one place.
              </p>
              <div className="mt-6 grid max-w-xl grid-cols-3 gap-2 text-xs font-bold text-white/85">
                <div className="rounded-md border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <span className="block text-lg font-black">{scores.length}</span>
                  Cards logged
                </div>
                <div className="rounded-md border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <span className="block text-lg font-black">{activeDraws}</span>
                  Live draws
                </div>
                <div className="rounded-md border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <span className="block text-lg font-black">{contributionLabel}</span>
                  To charity
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push('/scores')} className="brutal-btn bg-white text-slate-950">
                Add score
              </button>
          <button onClick={handleLogout} className="brutal-btn brutal-btn-outline">
            Logout
          </button>
            </div>
          </div>
        </div>

        {showTrialBanner && (
          <div className="glass-panel p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black">Trial active</p>
                <p className="text-sm text-muted">
                  Trial ends on {new Date(trialEndDate).toLocaleDateString()}. Subscribe now to keep playing.
                </p>
              </div>
              <button 
                onClick={() => {
                  if (!charity) {
                    alert('Please select a charity first before subscribing.')
                    setShowCharityModal(true)
                  } else {
                    router.push('/onboarding/plan')
                  }
                }} 
                className="brutal-btn brutal-btn-primary"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        )}

        {showCharityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="brutal-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
              <h2 className="mb-2 text-2xl font-black">Choose Your Charity</h2>
              <p className="text-muted mb-6">Please select a charity to support. This is required before you can subscribe.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Select Charity</label>
                  <select 
                    value={selectedCharityId} 
                    onChange={(e) => setSelectedCharityId(e.target.value)}
                    className="brutal-input w-full"
                    required
                  >
                    <option value="">-- Choose a charity --</option>
                    {allCharities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Contribution: {contribution}%</label>
                  <input 
                    type="range" 
                    min={10} 
                    max={50} 
                    step={5} 
                    value={contribution} 
                    onChange={(e) => setContribution(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted mt-1">Minimum 10% contribution required.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={handleCharitySelect}
                    disabled={!selectedCharityId || savingCharity}
                    className="brutal-btn brutal-btn-primary flex-1"
                  >
                    {savingCharity ? 'Saving...' : 'Confirm Selection'}
                  </button>
                  <button 
                    onClick={() => setShowCharityModal(false)}
                    className="brutal-btn brutal-btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Scores', value: scores.length, hint: `Latest: ${latestScore}` },
            { label: 'Active Draws', value: activeDraws, hint: `${draws.length} total draws` },
            { label: 'Winnings', value: `£${totalWinnings.toFixed(2)}`, hint: `${winnings.length} prize records` },
            { label: 'Charity Share', value: contributionLabel, hint: charity?.name || 'Choose your cause' }
          ].map((metric) => (
            <div key={metric.label} className="brutal-card ticket-card p-5">
              <p className="text-sm font-bold text-muted">{metric.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{metric.value}</p>
              <p className="mt-2 text-sm text-muted">{metric.hint}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel impact-strip p-4">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="font-black text-slate-950">Play</p>
              <p className="text-muted">Every score keeps your monthly activity alive.</p>
            </div>
            <div>
              <p className="font-black text-slate-950">Purpose</p>
              <p className="text-muted">{charity?.name || 'Your selected charity'} receives your chosen share.</p>
            </div>
            <div>
              <p className="font-black text-slate-950">Prize</p>
              <p className="text-muted">Draws turn participation into a proper reason to check back.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="brutal-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="section-eyebrow">Plan</p>
                <h2 className="text-xl font-black">Subscription</h2>
              </div>
              <span className={`brutal-badge ${subscription?.status === 'active' ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}>
                {subscription?.status || 'none'}
              </span>
            </div>
            {subscription ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted">Plan</p>
                  <p className="text-lg font-bold capitalize">{subscription.plan_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted">Status</p>
                  <p className={`text-lg font-bold capitalize ${getStatusColor(subscription.status)}`}>
                    {subscription.status}
                  </p>
                </div>
                {subscription.renewal_date && (
                  <div>
                    <p className="text-sm text-muted">Renewal Date</p>
                    <p className="text-lg font-bold">
                      {new Date(subscription.renewal_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {subscription.status !== 'active' && subscription.status !== 'trial_active' && (
                  <button
                    onClick={() => router.push('/onboarding/plan')}
                    className="brutal-btn brutal-btn-primary w-full mt-4"
                  >
                    Subscribe Now
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-muted mb-4">No active subscription</p>
                <button
                  onClick={() => router.push('/onboarding/plan')}
                  className="brutal-btn brutal-btn-primary w-full"
                >
                  Subscribe Now
                </button>
              </div>
            )}
          </div>

          <div className="brutal-card p-6">
            <p className="section-eyebrow">Impact</p>
            <h2 className="mb-4 text-xl font-black">My Charity</h2>
            {charity ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted">Selected Charity</p>
                  <p className="text-lg font-bold">{charity.name}</p>
                </div>
                {profile?.contribution_percentage != null && (
                  <div>
                    <p className="text-sm text-muted">Contribution</p>
                    <p className="text-lg font-bold text-primary">
                      {profile.contribution_percentage}%
                    </p>
                  </div>
                )}
                <button
                  onClick={() => router.push('/onboarding/charity')}
                  className="brutal-btn brutal-btn-outline w-full mt-4"
                >
                  Change Charity
                </button>
              </div>
            ) : (
              <div>
                <p className="text-muted mb-4">No charity selected</p>
                <button
                  onClick={() => router.push('/onboarding/charity')}
                  className="brutal-btn brutal-btn-primary w-full"
                >
                  Select Charity
                </button>
              </div>
            )}
          </div>

          <div className="brutal-card p-6">
            <p className="section-eyebrow">Momentum</p>
            <h2 className="mb-5 text-xl font-black">Activity Pulse</h2>
            <div className="space-y-4">
              {[
                { label: 'Scores logged', value: scores.length, width: Math.min(100, scores.length * 18) },
                { label: 'Draw coverage', value: draws.length, width: Math.min(100, draws.length * 25) },
                { label: 'Prize progress', value: `£${totalWinnings.toFixed(0)}`, width: Math.min(100, totalWinnings) }
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-muted">{item.label}</span>
                    <span className="font-black">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(8, item.width)}%` }} />
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="brutal-card p-6 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="section-eyebrow">Performance</p>
                <h2 className="text-xl font-black">Recent Scores</h2>
              </div>
              <button
                onClick={() => router.push('/scores')}
                className="text-sm text-primary hover:underline"
              >
                View All
              </button>
            </div>
            {scores.length === 0 ? (
              <p className="text-muted text-center py-4">No scores yet</p>
            ) : (
              <div className="space-y-2">
                {scores.slice(0, 5).map((s) => (
                  <div key={s.id} className="score-spark flex items-center justify-between rounded-md border border-black/10 p-3">
                    <div>
                      <span className="font-bold text-lg">{s.score_value}</span>
                      <span className="text-muted text-sm ml-2">strokes</span>
                    </div>
                    <div className="text-sm text-muted">
                      {new Date(s.score_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push('/scores')}
              className="brutal-btn brutal-btn-primary w-full mt-4"
            >
              Add Score
            </button>
          </div>

          <div className="brutal-card p-6">
            <p className="section-eyebrow">Prize room</p>
            <h2 className="mb-4 text-xl font-black">Draws</h2>
            {draws.length === 0 ? (
              <p className="text-muted text-center py-4">No draws available</p>
            ) : (
              <div className="space-y-3">
                {draws.slice(0, 3).map((d) => (
                  <div key={d.id} className="rounded-md bg-white/65 p-3">
                    <p className="font-bold">{d.name || `Draw ${d.id.slice(0, 8)}`}</p>
                    <p className="text-sm text-muted">
                      {new Date(d.draw_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted mt-1 capitalize">Status: {d.status}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push('/draws')}
              className="brutal-btn brutal-btn-outline w-full mt-4"
            >
              View All Draws
            </button>
          </div>

          {winnings.length > 0 && (
            <div className="brutal-card p-6 xl:col-span-3">
              <p className="section-eyebrow">Prize history</p>
              <h2 className="mb-4 text-xl font-black">Recent Winnings</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {winnings.slice(0, 3).map((w) => (
                  <div key={w.id} className="rounded-md bg-white/65 p-4">
                    <p className="text-2xl font-black text-primary">£{w.prize_amount}</p>
                    <p className="text-sm text-muted mt-1">
                      {new Date(w.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted mt-2 capitalize">
                      {w.verification_status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="brutal-card p-6 xl:col-span-3">
            <p className="section-eyebrow">Giving network</p>
            <h2 className="mb-2 text-xl font-black">Available Charities</h2>
            <p className="text-sm text-muted mb-4">Support these charities with your contributions</p>
            {allCharities.length === 0 ? (
              <p className="text-muted text-center py-4">No charities available at the moment</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCharities.map((c) => (
                  <div key={c.id} className="rounded-md border border-black/10 bg-white/65 p-4">
                    <p className="font-bold text-lg">{c.name}</p>
                    {c.description && (
                      <p className="text-sm text-muted mt-2">{c.description}</p>
                    )}
                    {c.website && (
                      <a 
                        href={c.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline mt-2 inline-block"
                      >
                        Learn more
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
