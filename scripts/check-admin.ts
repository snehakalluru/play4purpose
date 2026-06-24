/**
 * Check if a user has admin role
 * Usage: npx tsx scripts/check-admin.ts <email>
 */

import { supabaseAdmin } from '../services/supabaseAdmin'

async function checkAdmin(email?: string) {
  console.log('🔍 Checking admin status...\n')

  if (!email) {
    // List all users
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    console.log('All users:')
    console.log('─'.repeat(60))
    
    for (const user of users?.users || []) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

      console.log(`Email: ${user.email}`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Role: ${profile?.role || 'NOT SET'}`)
      console.log(`  Name: ${profile?.full_name || 'N/A'}`)
      console.log('')
    }
  } else {
    // Check specific user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const user = users?.users.find(u => u.email === email)

    if (!user) {
      console.log(`❌ User not found: ${email}`)
      return
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('User Details:')
    console.log('─'.repeat(60))
    console.log(`Email: ${user.email}`)
    console.log(`ID: ${user.id}`)
    console.log(`Role: ${profile?.role || 'NOT SET'}`)
    console.log(`Name: ${profile?.full_name || 'N/A'}`)
    console.log(`Charity ID: ${profile?.charity_id || 'NONE'}`)
    console.log(`Contribution: ${profile?.contribution_percentage || 0}%`)
    console.log('')

    if (profile?.role === 'admin') {
      console.log('✅ This user IS an admin')
    } else {
      console.log('❌ This user is NOT an admin')
      console.log('\nTo make them admin, run:')
      console.log(`npx tsx scripts/fix-login.ts ${email}`)
    }
  }
}

// Get email from command line
const email = process.argv[2]
checkAdmin(email).catch(console.error)