/**
 * ONE-TIME ADMIN ACCOUNT CREATION SCRIPT
 * 
 * Run this script to create the initial admin account:
 * npx tsx scripts/create-admin.ts
 * 
 * IMPORTANT: Delete or disable this script after use for security!
 */

import { supabaseAdmin } from '../services/supabaseAdmin'

async function createAdminAccount() {
  const email = process.argv[2] || 'digitalhereos@gmail.com'
  const password = process.argv[3] || 'digitalheros@pdr'
  const fullName = 'Admin User'

  async function upsertAdminProfile(userId: string) {
    return supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        role: 'admin'
      }, { onConflict: 'id' })
  }

  console.log('Creating admin account...')
  console.log('Email:', email)
  console.log('')

  try {
    // Step 1: Create auth user
    console.log('1. Creating auth user...')
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        first_name: 'Admin',
        last_name: 'User'
      },
      email_confirm: true // Auto-confirm for admin
    })

    if (userError) {
      console.error('❌ Error creating user:', userError.message)
      
      // Check if user already exists
      if (userError.message.includes('already registered')) {
        console.log('⚠️  User already exists. Attempting to update role...')
        
        // Get existing user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users.find(u => u.email === email)
        
        if (existingUser) {
          const { error: updateError } = await upsertAdminProfile(existingUser.id)
          
          if (updateError) {
            console.error('❌ Error updating role:', updateError.message)
            process.exit(1)
          }
          
          console.log('✅ Admin role assigned to existing user!')
          console.log('   User ID:', existingUser.id)
          console.log('   Email:', email)
          console.log('')
          console.log('You can now login at: http://localhost:3000/login')
          process.exit(0)
        }
      }
      
      process.exit(1)
    }

    const user = userData.user || userData
    const userId = user.id

    console.log('✅ Auth user created:', userId)

    // Step 2: Create/update profile with admin role
    console.log('2. Creating profile with admin role...')
    const { error: profileError } = await upsertAdminProfile(userId)

    if (profileError) {
      console.error('❌ Error creating profile:', profileError.message)
      // Cleanup: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      process.exit(1)
    }

    console.log('✅ Admin profile created!')
    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log('✅ ADMIN ACCOUNT CREATED SUCCESSFULLY')
    console.log('═══════════════════════════════════════════')
    console.log('')
    console.log('Login credentials:')
    console.log('  Email:    ', email)
    console.log('  Password: ', password)
    console.log('  User ID:  ', userId)
    console.log('  Role:     admin')
    console.log('')
    console.log('Login at: http://localhost:3000/login')
    console.log('')
    console.log('⚠️  IMPORTANT: Delete this script after use!')
    console.log('')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
createAdminAccount()
