import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../services/supabaseAdmin'
import { registrationSchema } from '../../../../validators/auth'
import { rateLimit } from '../../../../lib/rateLimiter'

export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = rateLimit(`register:${ip}`, 5, 60000) // 5 requests per minute

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for IP: ${ip}`)
      return NextResponse.json(
        { success: false, error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const parse = registrationSchema.safeParse(body)
    if (!parse.success) {
      console.error('Registration validation error:', parse.error.flatten())
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parse.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, full_name } = parse.data
    const nameParts = (full_name || '').split(' ')
    const first_name = nameParts[0] || ''
    const last_name = nameParts.slice(1).join(' ') || ''

    console.log('Attempting registration for:', email)

    // Create user via admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name, last_name },
      email_confirm: false // User will verify via email
    })

    if (userError) {
      console.error('Supabase auth error:', userError)
      return NextResponse.json(
        { success: false, error: userError.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    const user = userData.user || userData
    const userId = user.id

    console.log('User created:', userId)

    // Create profile record using service role (bypasses RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: full_name || email,
        first_name,
        last_name,
        role: 'user'
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Cleanup: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { success: false, error: 'Failed to create profile: ' + profileError.message },
        { status: 500 }
      )
    }

    console.log('Profile created successfully for:', userId)

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user_id: userId
    })
  } catch (err: any) {
    console.error('Registration catch error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}