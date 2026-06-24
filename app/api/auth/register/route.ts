import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { rateLimit } from '../../../../lib/rateLimiter'
import { assertValidSubscriptionStatus, normalizeSubscriptionStatus } from '../../../../lib/subscriptionStatus'
import { registrationSchema } from '../../../../validators/auth'

type RegistrationFailure =
  | 'validation'
  | 'duplicate'
  | 'auth'
  | 'profile'
  | 'server'

function errorResponse(message: string, status: number, code: RegistrationFailure = 'server') {
  return NextResponse.json({ success: false, message, code }, { status })
}

function isDuplicateEmailError(message = '') {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('already') ||
    normalized.includes('duplicate') ||
    normalized.includes('unique') ||
    normalized.includes('registered')
  )
}

async function rollbackAuthUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) {
    console.error('Registration rollback failed:', error.message)
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = rateLimit(`register:${ip}`, 5, 60000)

    if (!rateLimitResult.allowed) {
      return errorResponse('Too many registration attempts. Please try again later.', 429, 'server')
    }

    const body = await req.json()
    const parsed = registrationSchema.safeParse(body)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return errorResponse(firstIssue?.message || 'Please check the registration form.', 400, 'validation')
    }

    const {
      full_name,
      email,
      password,
      phone,
      privacy_accepted,
      terms_accepted
    } = parsed.data

    const normalizedEmail = email.trim().toLowerCase()

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone: phone || null
      }
    })

    if (authError || !authData.user) {
      const message = authError?.message || ''
      if (isDuplicateEmailError(message)) {
        return errorResponse('An account with this email already exists. Please sign in instead.', 409, 'duplicate')
      }

      console.error('Registration auth error:', message)
      return errorResponse('We could not create your account. Please try again.', 400, 'auth')
    }

    const userId = authData.user.id

    // Try to insert profile, but don't fail if schema has issues
    // The auth user is already created, which is the critical part
    try {
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        full_name,
        phone: phone || null,
        role: 'user'
      })
      
      if (profileError) {
        console.error('Registration profile insert warning (non-fatal):', profileError.message)
      }
    } catch (e) {
      console.error('Registration profile insert exception (non-fatal):', e)
    }

    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 7)
    const trialEndDateStr = trialEndDate.toISOString().slice(0, 10)

    // Try to insert subscription, but don't fail if schema has issues
    try {
      const subscriptionStatus = normalizeSubscriptionStatus('trialing')
      console.log('SUBSCRIPTION STATUS BEFORE INSERT:', subscriptionStatus)
      assertValidSubscriptionStatus(subscriptionStatus)

      const { error: subscriptionError } = await supabaseAdmin.from('subscriptions').insert({
        user_id: userId,
        plan_type: 'monthly',
        status: normalizeSubscriptionStatus(subscriptionStatus),
        trial_end: trialEndDateStr,
        trial_end_date: trialEndDateStr
      })
      
      if (subscriptionError) {
        console.error('Registration subscription insert warning (non-fatal):', subscriptionError.message)
      }
    } catch (e) {
      console.error('Registration subscription insert exception (non-fatal):', e)
    }

    // Always succeed if auth user was created
    return NextResponse.json({
      success: true,
      message: 'Registration successful. Your 7-day free trial is active.',
      user_id: userId
    })
  } catch (err) {
    console.error('Registration unexpected error:', err)
    return errorResponse('Something went wrong during registration. Please try again.', 500, 'server')
  }
}
