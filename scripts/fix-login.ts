/**
 * Comprehensive login fix script
 * This will:
 * 1. Check if admin account exists
 * 2. Create it if missing
 * 3. Fix any issues (email confirmation, profile, role)
 * 4. Provide clear next steps
 * 
 * Run: npx tsx scripts/fix-login.ts
 */

import { supabaseAdmin } from '../services/supabaseAdmin'

async function fixLogin() {
  const email = process.argv[2] || 'digitalhereos@gmail.com'
  const password = process.argv[3] || 'digitalheros@pdr'

  async function upsertAdminProfile(userId: string) {
    return supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: 'Admin User',
        role: 'admin'
      }, { onConflict: 'id' })
  }

  console.log('🔧 Play4Purpose Login Fix Tool')
  console.log('═══════════════════════════════════════════')
  console.log('')

  // Check if Supabase is configured
  if (!supabaseAdmin || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: Supabase not configured')
    console.error('')
    console.error('Check your .env file has:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...')
    console.error('')
    console.error('Get these from: Supabase Dashboard → Settings → API')
    process.exit(1)
  }

  console.log('✅ Supabase configured')
  console.log('')

  // Step 1: Check if user exists
  console.log('Step 1: Checking if user exists...')
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  
  if (listError) {
    console.error('❌ Error listing users:', listError.message)
    process.exit(1)
  }

  const users = usersData?.users || []
  const existingUser = users.find(u => u.email === email)

  let userId: string

  if (!existingUser) {
    console.log('   ❌ User not found - creating now...')
    console.log('')

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name: 'Admin', last_name: 'User' },
      email_confirm: true // Auto-confirm
    })

    if (createError) {
      console.error('❌ Failed to create user:', createError.message)
      process.exit(1)
    }

    userId = newUser.user?.id || (newUser as any).id
    console.log('   ✅ User created:', userId)
  } else {
    console.log('   ✅ User found:', existingUser.id)
    console.log('   Email confirmed:', existingUser.email_confirmed_at ? 'Yes' : 'No')
    userId = existingUser.id

    // Ensure email is confirmed
    if (!existingUser.email_confirmed_at) {
      console.log('   ⚠️  Email not confirmed - confirming now...')
      
      // Update user to confirm email
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true
      })

      if (confirmError) {
        console.error('   ❌ Failed to confirm email:', confirmError.message)
      } else {
        console.log('   ✅ Email confirmed')
      }
    }
  }

  console.log('')

  // Step 2: Create/update profile
  console.log('Step 2: Creating/updating profile...')
  
  const { error: profileError } = await upsertAdminProfile(userId)

  if (profileError) {
    console.error('   ❌ Failed to upsert admin profile:', profileError.message)
    process.exit(1)
  }

  console.log('   ✅ Profile upserted with admin role')

  console.log('')

  // Step 3: Verify everything
  console.log('Step 3: Verifying setup...')
  
  const { data: verifyUser } = await supabaseAdmin.auth.admin.getUserById(userId)
  const { data: verifyProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (!verifyUser?.user) {
    console.error('   ❌ User verification failed')
    process.exit(1)
  }

  if (!verifyProfile) {
    console.error('   ❌ Profile verification failed')
    process.exit(1)
  }

  console.log('   ✅ User verified')
  console.log('   ✅ Profile verified')
  console.log('   ✅ Role:', verifyProfile.role)
  console.log('')

  // Success!
  console.log('═══════════════════════════════════════════')
  console.log('✅ LOGIN FIX COMPLETE')
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('Login credentials:')
  console.log('  Email:    ', email)
  console.log('  Password: ', password)
  console.log('  User ID:  ', userId)
  console.log('  Role:     ', verifyProfile.role)
  console.log('')
  console.log('Login at: http://localhost:3002/login')
  console.log('')
  console.log('⚠️  If login still fails:')
  console.log('1. Clear browser cookies (F12 → Application → Cookies)')
  console.log('2. Try incognito mode (Ctrl+Shift+N)')
  console.log('3. Check Supabase Dashboard → Authentication → Users')
  console.log('   to verify user exists and is confirmed')
  console.log('4. Try resetting password in Supabase Dashboard')
  console.log('')
  console.log('✅ Admin account is ready to use!')
}

// Run the fix
fixLogin().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
