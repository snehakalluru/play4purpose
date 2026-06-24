/**
 * Seed data script for Play4Purpose
 * Creates sample data for testing
 * 
 * Run: npx tsx scripts/seed-data.ts
 */

import { supabaseAdmin } from '../services/supabaseAdmin'

async function seedData() {
  console.log('🌱 Seeding Play4Purpose database...')
  console.log('')

  try {
    // ============================================================
    // 1. CREATE SAMPLE USERS (if needed)
    // ============================================================
    console.log('1. Checking users...')
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const userCount = existingUsers?.users?.length || 0
    console.log(`   Found ${userCount} users`)

    if (userCount < 3) {
      console.log('   Creating sample users...')
      
      const sampleUsers = [
        { email: 'player1@test.com', password: 'Test123456', name: 'John Smith' },
        { email: 'player2@test.com', password: 'Test123456', name: 'Jane Doe' },
        { email: 'player3@test.com', password: 'Test123456', name: 'Bob Wilson' }
      ]

      for (const userData of sampleUsers) {
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          user_metadata: { full_name: userData.name },
          email_confirm: true
        })

        if (error) {
          console.log(`   ⚠️  User ${userData.email} might already exist`)
        } else {
          console.log(`   ✅ Created user: ${userData.email}`)
        }
      }
    }

    // ============================================================
    // 2. CREATE SAMPLE SCORES
    // ============================================================
    console.log('')
    console.log('2. Creating sample scores...')

    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const regularUsers = (users?.users || []).filter(u => !u.email?.includes('admin'))

    if (regularUsers.length > 0) {
      // Get existing scores
      const { data: existingScores } = await supabaseAdmin
        .from('scores')
        .select('user_id')
      
      const usersWithScores = new Set((existingScores || []).map(s => s.user_id))

      for (const user of regularUsers) {
        if (usersWithScores.has(user.id)) {
          console.log(`   ⏭️  ${user.email} already has scores`)
          continue
        }

        // Create 5-10 random scores for each user
        const numScores = Math.floor(Math.random() * 6) + 5
        const scores = []

        for (let i = 0; i < numScores; i++) {
          const daysAgo = Math.floor(Math.random() * 60)
          const date = new Date()
          date.setDate(date.getDate() - daysAgo)

          scores.push({
            user_id: user.id,
            score: Math.floor(Math.random() * 40) + 80, // 80-120 range
            played_date: date.toISOString().split('T')[0]
          })
        }

        const { error: scoresError } = await supabaseAdmin
          .from('scores')
          .insert(scores)

        if (scoresError) {
          console.error(`   ❌ Error creating scores for ${user.email}:`, scoresError.message)
        } else {
          console.log(`   ✅ Created ${numScores} scores for ${user.email}`)
        }
      }
    }

    // ============================================================
    // 3. CREATE SAMPLE DRAW
    // ============================================================
    console.log('')
    console.log('3. Creating sample draw...')

    const { data: existingDraws } = await supabaseAdmin
      .from('draws')
      .select('id')
      .eq('status', 'open')

    if (!existingDraws || existingDraws.length === 0) {
      const { data: draw, error: drawError } = await supabaseAdmin
        .from('draws')
        .insert({
          name: 'Monthly Prize Draw - June 2026',
          draw_date: '2026-06-30',
          status: 'open',
          prize_pool: 1000,
          jackpot_amount: 400,
          second_prize: 350,
          third_prize: 250
        })
        .select()
        .single()

      if (drawError) {
        console.error('   ❌ Error creating draw:', drawError.message)
      } else {
        console.log('   ✅ Created open draw')
      }
    } else {
      console.log('   ⏭️  Open draw already exists')
    }

    // ============================================================
    // 4. SUMMARY
    // ============================================================
    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log('✅ SEED DATA COMPLETE')
    console.log('═══════════════════════════════════════════')
    console.log('')
    console.log('Sample users created:')
    console.log('  Email: player1@test.com / Test123456')
    console.log('  Email: player2@test.com / Test123456')
    console.log('  Email: player3@test.com / Test123456')
    console.log('')
    console.log('Next steps:')
    console.log('1. Login as admin: digitalheros1@gmail.com / digitalheros@prd')
    console.log('2. Go to http://localhost:3002/admin')
    console.log('3. Click "Run Draw" to test the draw system')
    console.log('4. Login as regular user to see winnings')
    console.log('')

  } catch (error) {
    console.error('❌ Seed error:', error)
    process.exit(1)
  }
}

// Run seed
seedData()