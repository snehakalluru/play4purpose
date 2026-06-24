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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-4xl font-black uppercase">My Dashboard</h1>
          <button onClick={handleLogout} className="brutal-btn brutal-btn-outline">
            Logout
          </button>
        </div>

        {showTrialBanner && (
          <div className="mb-6 rounded-md border-2 border-primary bg-primary/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black uppercase">Trial active</p>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border-4 border-black p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black mb-4">Choose Your Charity</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="brutal-card p-6">
            <h2 className="text-xl font-bold mb-4">Subscription</h2>
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
            <h2 className="text-xl font-bold mb-4">My Charity</h2>
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
            <h2 className="text-xl font-bold mb-4">My Stats</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted">Total Scores</p>
                <p className="text-2xl font-black">{scores.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Draws Entered</p>
                <p className="text-2xl font-black">{draws.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Total Winnings</p>
                <p className="text-2xl font-black text-primary">
                  £{winnings.reduce((sum, w) => sum + (w.prize_amount || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="brutal-card p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Scores</h2>
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
                  <div key={s.id} className="flex justify-between items-center p-3 bg-surface rounded">
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
            <h2 className="text-xl font-bold mb-4">Draws</h2>
            {draws.length === 0 ? (
              <p className="text-muted text-center py-4">No draws available</p>
            ) : (
              <div className="space-y-3">
                {draws.slice(0, 3).map((d) => (
                  <div key={d.id} className="p-3 bg-surface rounded">
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
            <div className="brutal-card p-6 lg:col-span-3">
              <h2 className="text-xl font-bold mb-4">Recent Winnings</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {winnings.slice(0, 3).map((w) => (
                  <div key={w.id} className="p-4 bg-surface rounded-lg">
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

          <div className="brutal-card p-6 lg:col-span-3">
            <h2 className="text-xl font-bold mb-4">Available Charities</h2>
            <p className="text-sm text-muted mb-4">Support these charities with your contributions</p>
            {allCharities.length === 0 ? (
              <p className="text-muted text-center py-4">No charities available at the moment</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCharities.map((c) => (
                  <div key={c.id} className="p-4 bg-surface rounded-lg">
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
