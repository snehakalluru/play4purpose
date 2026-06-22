import { supabaseAdmin } from '../../services/supabaseAdmin'
import { stripe } from '../../services/stripeClient'
import type { RegisterInput, CharitySelectionInput, ScoreEntryInput } from '../../lib/validators/onboarding'
import { registerSchema, charitySelectionSchema, initialScoresSchema } from '../../lib/validators/onboarding'
import type { Profile, Subscription, UserCharity, Score } from '../../types/db'

// Register a user via Supabase Auth (admin). Returns created user id.
export async function registerUser(input: RegisterInput) {
  const parsed = registerSchema.parse(input)

  // Create auth user with email + password via service role
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    user_metadata: { full_name: parsed.full_name, avatar_url: parsed.avatar_url }
  } as any)

  if (error) throw error

  const user = data?.user
  if (!user) throw new Error('Failed to create user')

  // Insert initial profile row
  const profilePayload: Partial<Profile> = {
    id: user.id,
    email: parsed.email,
    full_name: parsed.full_name,
    avatar_url: parsed.avatar_url || null,
    role: 'user',
    email_verified: false,
    terms_accepted: false,
    onboarding_completed: false
  }

  const up = await supabaseAdmin.from('profiles').upsert(profilePayload)
  if (up.error) throw up.error

  return user.id
}

export async function verifyEmail(userId: string) {
  // Called after Supabase confirms email verification (via webhook or callback)
  const { error } = await supabaseAdmin.from('profiles').update({ email_verified: true }).eq('id', userId)
  if (error) throw error
  return true
}

export async function acceptTerms(userId: string) {
  const { error } = await supabaseAdmin.from('profiles').update({ terms_accepted: true, terms_accepted_at: new Date().toISOString() }).eq('id', userId)
  if (error) throw error
  return true
}

export async function saveCharitySelection(userId: string, input: CharitySelectionInput) {
  const parsed = charitySelectionSchema.parse(input)

  // Upsert user_charities (one per user)
  const { error } = await supabaseAdmin.from('user_charities').upsert({
    user_id: userId,
    charity_id: parsed.charity_id,
    contribution_percentage: parsed.contribution_percentage
  }, { onConflict: 'user_id' })

  if (error) throw error
  return true
}

export async function saveHandicap(userId: string, handicap?: number | null) {
  const payload: Partial<Profile> = { handicap: handicap ?? null }
  const { error } = await supabaseAdmin.from('profiles').update(payload).eq('id', userId)
  if (error) throw error
  return true
}

export async function saveInitialScores(userId: string, scores: ScoreEntryInput[]) {
  const parsed = initialScoresSchema.parse(scores)

  // Insert scores; rely on DB unique constraint and retention trigger
  const rows = parsed.map((s) => ({ user_id: userId, score: s.score, score_date: s.score_date }))
  const { error } = await supabaseAdmin.from('scores').insert(rows)
  if (error) throw error
  return true
}

export async function createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string) {
  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    success_url: successUrl,
    cancel_url: cancelUrl
  })
  return session
}

export async function activateSubscription(userId: string, stripeCustomerId: string, stripeSubscriptionId: string, plan: Subscription['plan'], status: Subscription['status'] | any = 'active', startedAt?: string, expiresAt?: string) {
  const payload: Partial<Subscription> = {
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    plan,
    status,
    started_at: startedAt ?? new Date().toISOString(),
    expires_at: expiresAt ?? null
  }

  const { error } = await supabaseAdmin.from('subscriptions').upsert(payload, { onConflict: 'stripe_subscription_id' })
  if (error) throw error
  return true
}

export async function completeOnboarding(userId: string) {
  const { error } = await supabaseAdmin.from('profiles').update({ onboarding_completed: true }).eq('id', userId)
  if (error) throw error
  return true
}
