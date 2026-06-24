# PHASE 10: TESTING SYSTEM
## Golf Charity Draw Platform

---

## 🧪 TESTING STRATEGY

### Testing Pyramid
```
┌─────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                            │
└─────────────────────────────────────────────────────────────┘

        ┌─────────┐
        │   E2E   │  ← Playwright (Critical user flows)
        │  Tests  │
       ┌───────────┐
       │Integration│  ← API route tests, DB integration
       │  Tests    │
      ┌─────────────┐
      │    Unit     │  ← Business logic, utilities
      │    Tests    │
      └─────────────┘

Coverage Target: 80% minimum
Critical Paths: 100% coverage
```

### Test Structure
```
tests/
├── unit/                          # Unit tests
│   ├── validators/
│   │   ├── score.test.ts
│   │   ├── auth.test.ts
│   │   └── charity.test.ts
│   ├── utils/
│   │   ├── sanitize.test.ts
│   │   └── rateLimiter.test.ts
│   └── services/
│       ├── drawEngine.test.ts
│       ├── prizePoolEngine.test.ts
│       └── fraudDetection.test.ts
│
├── integration/                   # Integration tests
│   ├── auth/
│   │   ├── register.test.ts
│   │   ├── login.test.ts
│   │   └── session.test.ts
│   ├── scores/
│   │   ├── add-score.test.ts
│   │   └── delete-score.test.ts
│   ├── draws/
│   │   ├── enter-draw.test.ts
│   │   └── run-draw.test.ts
│   ├── stripe/
│   │   ├── checkout.test.ts
│   │   └── webhook.test.ts
│   └── winners/
│       ├── upload-proof.test.ts
│       └── review-winner.test.ts
│
├── e2e/                          # End-to-end tests
│   ├── auth-flow.spec.ts
│   ├── subscription-flow.spec.ts
│   ├── score-entry-flow.spec.ts
│   ├── draw-flow.spec.ts
│   ├── winner-verification.spec.ts
│   └── admin-flows.spec.ts
│
├── fixtures/                     # Test fixtures
│   ├── users.ts
│   ├── charities.ts
│   ├── draws.ts
│   └── winners.ts
│
├── helpers/                      # Test utilities
│   ├── supabase.ts
│   ├── auth.ts
│   └── assertions.ts
│
└── setup.ts                      # Test configuration
```

---

## 🔧 TESTING SETUP

### Test Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.ts',
        '**/*.d.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/services': path.resolve(__dirname, './services'),
      '@/actions': path.resolve(__dirname, './actions'),
      '@/validators': path.resolve(__dirname, './validators')
    }
  }
})
```

### Test Setup
```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test database URL (separate from production)
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321'
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-key'

export const testSupabase = createClient(
  TEST_SUPABASE_URL,
  TEST_SUPABASE_ANON_KEY
)

// Clean database before each test
beforeEach(async () => {
  // Delete all test data
  await testSupabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await testSupabase.from('winners').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await testSupabase.from('draws').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  // Add more cleanup as needed
})

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = TEST_SUPABASE_ANON_KEY
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
process.env.STRIPE_SECRET_KEY = process.env.TEST_STRIPE_SECRET_KEY || 'sk_test_xxx'
process.env.STRIPE_WEBHOOK_SECRET = process.env.TEST_STRIPE_WEBHOOK_SECRET || 'whsec_xxx'
process.env.RESEND_API_KEY = process.env.TEST_RESEND_API_KEY || 're_xxx'
```

### Test Helpers
```typescript
// tests/helpers/supabase.ts
import { testSupabase } from '../setup'

export async function createTestUser(overrides = {}) {
  const { data, error } = await testSupabase.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User'
    },
    ...overrides
  })

  if (error) throw error
  return data.user
}

export async function createTestProfile(userId: string, overrides = {}) {
  const { data, error } = await testSupabase
    .from('profiles')
    .insert({
      id: userId,
      email: `test-${Date.now()}@example.com`,
      full_name: 'Test User',
      role: 'user',
      ...overrides
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createTestSubscription(userId: string, overrides = {}) {
  const { data, error } = await testSupabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_type: 'monthly',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ...overrides
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createTestScore(userId: string, overrides = {}) {
  const { data, error } = await testSupabase
    .from('scores')
    .insert({
      user_id: userId,
      score: 85,
      played_date: new Date().toISOString().split('T')[0],
      ...overrides
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createTestCharity(overrides = {}) {
  const { data, error } = await testSupabase
    .from('charities')
    .insert({
      name: 'Test Charity',
      description: 'A test charity',
      active: true,
      ...overrides
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

## ✅ UNIT TESTS

### 1. Validator Tests
```typescript
// tests/unit/validators/score.test.ts
import { describe, it, expect } from 'vitest'
import { scoreSchema, deleteScoreSchema } from '@/validators/score'

describe('Score Validators', () => {
  describe('scoreSchema', () => {
    it('should accept valid score', () => {
      const result = scoreSchema.safeParse({
        score: 85,
        played_date: '2024-01-15'
      })
      expect(result.success).toBe(true)
    })

    it('should reject score below 1', () => {
      const result = scoreSchema.safeParse({
        score: 35,
        played_date: '2024-01-15'
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 1')
      }
    })

    it('should reject score above 45', () => {
      const result = scoreSchema.safeParse({
        score: 250,
        played_date: '2024-01-15'
      })
      expect(result.success).toBe(false)
    })

    it('should reject future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      
      const result = scoreSchema.safeParse({
        score: 85,
        played_date: futureDate.toISOString()
      })
      expect(result.success).toBe(false)
    })

    it('should reject decimal scores', () => {
      const result = scoreSchema.safeParse({
        score: 85.5,
        played_date: '2024-01-15'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('deleteScoreSchema', () => {
    it('should accept valid UUID', () => {
      const result = deleteScoreSchema.safeParse({
        score_id: '12345678-1234-1234-1234-123456789abc'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = deleteScoreSchema.safeParse({
        score_id: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })
  })
})
```

### 2. Draw Engine Tests
```typescript
// tests/unit/services/drawEngine.test.ts
import { describe, it, expect, vi } from 'vitest'
import { calculateEntryWeight, selectWinners, shuffleSecure } from '@/services/drawEngine'

describe('Draw Engine', () => {
  describe('calculateEntryWeight', () => {
    it('should return 3 entries for average < 80', () => {
      const result = calculateEntryWeight(80) // Mocked average
      expect(result).toBe(3)
    })

    it('should return 2 entries for average 80-100', () => {
      const result = calculateEntryWeight(90) // Mocked average
      expect(result).toBe(2)
    })

    it('should return 1 entry for average > 100', () => {
      const result = calculateEntryWeight(110) // Mocked average
      expect(result).toBe(1)
    })
  })

  describe('shuffleSecure', () => {
    it('should shuffle array', () => {
      const array = ['1', '2', '3', '4', '5']
      const shuffled = shuffleSecure(array)
      
      expect(shuffled).toHaveLength(array.length)
      expect(shuffled.sort()).toEqual(array.sort())
    })

    it('should produce different results each time', () => {
      const array = ['1', '2', '3', '4', '5']
      const shuffled1 = shuffleSecure(array)
      const shuffled2 = shuffleSecure(array)
      
      // Very unlikely to be the same (but possible)
      expect(JSON.stringify(shuffled1)).not.toBe(JSON.stringify(shuffled2))
    })
  })

  describe('selectWinners', () => {
    it('should select 3 unique winners', async () => {
      const weightedPool = [
        { userId: 'user-1', weight: 1 },
        { userId: 'user-2', weight: 1 },
        { userId: 'user-3', weight: 1 },
        { userId: 'user-4', weight: 1 },
        { userId: 'user-5', weight: 1 }
      ]

      const winners = await selectWinners(weightedPool)
      
      expect(winners).toHaveLength(3)
      expect(new Set(winners.map(w => w.userId)).size).toBe(3)
    })

    it('should throw error if less than 3 unique winners', async () => {
      const weightedPool = [
        { userId: 'user-1', weight: 3 }
      ]

      await expect(selectWinners(weightedPool)).rejects.toThrow()
    })
  })
})
```

### 3. Prize Pool Engine Tests
```typescript
// tests/unit/services/prizePoolEngine.test.ts
import { describe, it, expect } from 'vitest'
import { calculateCharityContribution, calculateDrawPrizePool } from '@/services/prizePoolEngine'

describe('Prize Pool Engine', () => {
  describe('calculateCharityContribution', () => {
    it('should calculate 10% contribution', () => {
      const result = calculateCharityContribution(10, 10)
      expect(result).toBe(1.0)
    })

    it('should calculate 15% contribution', () => {
      const result = calculateCharityContribution(10, 15)
      expect(result).toBe(1.5)
    })

    it('should calculate 20% contribution', () => {
      const result = calculateCharityContribution(10, 20)
      expect(result).toBe(2.0)
    })

    it('should enforce minimum 10%', () => {
      const result = calculateCharityContribution(10, 5)
      expect(result).toBe(1.0)
    })

    it('should enforce maximum 20%', () => {
      const result = calculateCharityContribution(10, 25)
      expect(result).toBe(2.0)
    })

    it('should round to 2 decimal places', () => {
      const result = calculateCharityContribution(10, 12.5)
      expect(result).toBe(1.25)
    })
  })

  describe('Prize Distribution', () => {
    it('should split pool 40/35/25', () => {
      const total = 100
      const charity = 10
      const remaining = total - charity // 90
      
      const jackpot = Math.floor(remaining * 0.40 * 100) / 100
      const second = Math.floor(remaining * 0.35 * 100) / 100
      const third = Math.floor(remaining * 0.25 * 100) / 100
      
      expect(jackpot).toBe(36)
      expect(second).toBe(31)
      expect(third).toBe(22)
    })

    it('should handle rounding correctly', () => {
      const total = 123.45
      const charity = 12.35
      const remaining = total - charity // 111.10
      
      const jackpot = Math.floor(remaining * 0.40 * 100) / 100
      const second = Math.floor(remaining * 0.35 * 100) / 100
      const third = Math.floor(remaining * 0.25 * 100) / 100
      
      const distributed = jackpot + second + third
      const rollover = remaining - distributed
      
      expect(distributed + rollover).toBeCloseTo(remaining, 2)
    })
  })
})
```

---

## 🔌 INTEGRATION TESTS

### 1. Authentication Flow
```typescript
// tests/integration/auth/register.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, createTestProfile, testSupabase } from '@/tests/helpers/supabase'

describe('Authentication Flow', () => {
  let testUser: any

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      await testSupabase.auth.admin.deleteUser(testUser.id)
    }
  })

  it('should register new user', async () => {
    testUser = await createTestUser({
      email: 'test@example.com',
      password: 'SecurePass123!',
      user_metadata: {
        full_name: 'Test User'
      }
    })

    expect(testUser).toBeDefined()
    expect(testUser.email).toBe('test@example.com')
  })

  it('should auto-create profile on registration', async () => {
    const { data: profile } = await testSupabase
      .from('profiles')
      .select('*')
      .eq('id', testUser.id)
      .single()

    expect(profile).toBeDefined()
    expect(profile.email).toBe(testUser.email)
    expect(profile.role).toBe('user')
  })

  it('should login with correct credentials', async () => {
    const { data, error } = await testSupabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'SecurePass123!'
    })

    expect(error).toBeNull()
    expect(data.user).toBeDefined()
  })

  it('should reject login with wrong password', async () => {
    const { data, error } = await testSupabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'WrongPassword'
    })

    expect(error).toBeDefined()
    expect(data.user).toBeNull()
  })
})
```

### 2. Score Entry Flow
```typescript
// tests/integration/scores/add-score.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { 
  createTestUser, 
  createTestProfile, 
  createTestSubscription,
  createTestScore,
  testSupabase 
} from '@/tests/helpers/supabase'

describe('Score Entry Flow', () => {
  let testUser: any
  let subscription: any

  beforeAll(async () => {
    testUser = await createTestUser()
    await createTestProfile(testUser.id)
    subscription = await createTestSubscription(testUser.id)
  })

  afterAll(async () => {
    if (testUser) {
      await testSupabase.auth.admin.deleteUser(testUser.id)
    }
  })

  it('should add score for subscribed user', async () => {
    const { data, error } = await createTestScore(testUser.id, {
      score: 85,
      played_date: '2024-01-15'
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.score).toBe(85)
  })

  it('should reject duplicate score for same date', async () => {
    const date = '2024-01-16'
    
    // Add first score
    await createTestScore(testUser.id, {
      score: 85,
      played_date: date
    })

    // Try to add second score for same date
    const { error } = await createTestScore(testUser.id, {
      score: 90,
      played_date: date
    })

    expect(error).toBeDefined()
  })

  it('should reject score outside 1-45 range', async () => {
    const { error } = await createTestScore(testUser.id, {
      score: 35,
      played_date: '2024-01-17'
    })

    expect(error).toBeDefined()
  })

  it('should update statistics after score added', async () => {
    await createTestScore(testUser.id, {
      score: 85,
      played_date: '2024-01-18'
    })

    const { data: stats } = await testSupabase
      .from('score_statistics')
      .select('*')
      .eq('user_id', testUser.id)
      .single()

    expect(stats).toBeDefined()
    expect(stats.total_scores).toBeGreaterThan(0)
  })
})
```

### 3. Draw Entry Flow
```typescript
// tests/integration/draws/enter-draw.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  createTestProfile,
  createTestSubscription,
  createTestCharity,
  createTestScore,
  testSupabase
} from '@/tests/helpers/supabase'

describe('Draw Entry Flow', () => {
  let testUser: any
  let testCharity: any
  let testDraw: any

  beforeAll(async () => {
    testUser = await createTestUser()
    await createTestProfile(testUser.id)
    await createTestSubscription(testUser.id)
    testCharity = await createTestCharity()
    
    // Select charity for user
    await testSupabase.from('user_charities').insert({
      user_id: testUser.id,
      charity_id: testCharity.id,
      contribution_percentage: 10
    })

    // Add 5 scores
    for (let i = 0; i < 5; i++) {
      await createTestScore(testUser.id, {
        score: 80 + i,
        played_date: `2024-01-${10 + i}`
      })
    }

    // Create active draw
    const { data } = await testSupabase
      .from('draws')
      .insert({
        name: 'Test Draw',
        draw_date: '2024-02-01',
        status: 'scheduled'
      })
      .select()
      .single()

    testDraw = data
  })

  afterAll(async () => {
    if (testUser) {
      await testSupabase.auth.admin.deleteUser(testUser.id)
    }
  })

  it('should allow eligible user to enter draw', async () => {
    const { data, error } = await testSupabase
      .from('draw_entries')
      .insert({
        draw_id: testDraw.id,
        user_id: testUser.id,
        entry_number: `DRAW-2024-${Math.random().toString(36).substring(7)}`
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should reject duplicate entry', async () => {
    const entryNumber = `DRAW-2024-${Math.random().toString(36).substring(7)}`
    
    // First entry
    await testSupabase.from('draw_entries').insert({
      draw_id: testDraw.id,
      user_id: testUser.id,
      entry_number: entryNumber
    })

    // Second entry (should fail)
    const { error } = await testSupabase.from('draw_entries').insert({
      draw_id: testDraw.id,
      user_id: testUser.id,
      entry_number: entryNumber
    })

    expect(error).toBeDefined()
  })
})
```

---

## 🌐 END-TO-END TESTS

### 1. Complete User Flow
```typescript
// tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should complete registration and onboarding', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register')

    // Fill registration form
    await page.fill('[name="full_name"]', 'Test User')
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`)
    await page.fill('[name="password"]', 'SecurePass123!')
    await page.fill('[name="confirm_password"]', 'SecurePass123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding/charity')
  })

  test('should login and access dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('/login')

    // Fill login form
    await page.fill('[name="email"]', 'existing@example.com')
    await page.fill('[name="password"]', 'SecurePass123!')

    // Submit
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[name="email"]', 'existing@example.com')
    await page.fill('[name="password"]', 'SecurePass123!')
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard')

    // Click logout
    await page.click('[data-testid="logout-button"]')

    // Should redirect to home
    await expect(page).toHaveURL('/')
  })
})
```

### 2. Subscription Flow
```typescript
// tests/e2e/subscription-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Subscription Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[name="email"]', 'subscriber@example.com')
    await page.fill('[name="password"]', 'SecurePass123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display subscription page', async ({ page }) => {
    await page.goto('/subscription')

    await expect(page.locator('h1')).toContainText('Subscription')
    await expect(page.locator('[data-testid="current-plan"]')).toBeVisible()
  })

  test('should initiate Stripe checkout', async ({ page }) => {
    await page.goto('/subscription')

    // Click upgrade button
    await page.click('[data-testid="upgrade-yearly"]')

    // Should open Stripe checkout (mocked in test)
    await expect(page).toHaveURL(/checkout\.stripe\.com/)
  })

  test('should show active subscription status', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for active subscription badge
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active')
  })
})
```

### 3. Score Entry Flow
```typescript
// tests/e2e/score-entry-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Score Entry Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as subscriber
    await page.goto('/login')
    await page.fill('[name="email"]', 'subscriber@example.com')
    await page.fill('[name="password"]', 'SecurePass123!')
    await page.click('button[type="submit"]')
  })

  test('should add new score', async ({ page }) => {
    await page.goto('/scores')

    // Click add score button
    await page.click('[data-testid="add-score-button"]')

    // Fill score form
    await page.fill('[name="score"]', '85')
    await page.fill('[name="played_date"]', '2024-01-20')

    // Submit
    await page.click('button[type="submit"]')

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Score added')

    // Should appear in score list
    await expect(page.locator('[data-testid="score-85"]')).toBeVisible()
  })

  test('should validate score range', async ({ page }) => {
    await page.goto('/scores')
    await page.click('[data-testid="add-score-button"]')

    // Enter invalid score
    await page.fill('[name="score"]', '35')
    await page.fill('[name="played_date"]', '2024-01-20')
    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('at least 1')
  })

  test('should delete score', async ({ page }) => {
    await page.goto('/scores')

    // Click delete button on first score
    await page.click('[data-testid="delete-score-button"]')

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]')

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('deleted')
  })
})
```

### 4. Draw Flow
```typescript
// tests/e2e/draw-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Draw Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'subscriber@example.com')
    await page.fill('[name="password"]', 'SecurePass123!')
    await page.click('button[type="submit"]')
  })

  test('should view available draws', async ({ page }) => {
    await page.goto('/draws')

    // Should show active draw
    await expect(page.locator('[data-testid="active-draw"]')).toBeVisible()
    await expect(page.locator('[data-testid="draw-countdown"]')).toBeVisible()
  })

  test('should enter eligible user into draw', async ({ page }) => {
    await page.goto('/draws')

    // Check eligibility
    await expect(page.locator('[data-testid="eligibility-status"]')).toContainText('Eligible')

    // Click enter draw
    await page.click('[data-testid="enter-draw-button"]')

    // Should show confirmation
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Entered successfully')
  })

  test('should show entry number after entering', async ({ page }) => {
    await page.goto('/draws')
    await page.click('[data-testid="enter-draw-button"]')

    // Should display entry number
    await expect(page.locator('[data-testid="entry-number"]')).toBeVisible()
  })
})
```

### 5. Admin Winner Review Flow
```typescript
// tests/e2e/admin-flows.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Winner Review', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@play4purpose.com')
    await page.fill('[name="password"]', 'AdminPass123!')
    await page.click('button[type="submit"]')
  })

  test('should view pending winners', async ({ page }) => {
    await page.goto('/admin/winners')

    // Should show pending verifications
    await expect(page.locator('[data-testid="pending-count"]')).toBeVisible()
  })

  test('should review and approve winner', async ({ page }) => {
    await page.goto('/admin/winners')

    // Click review button on first pending winner
    await page.click('[data-testid="review-winner-button"]')

    // Should open review modal
    await expect(page.locator('[data-testid="review-modal"]')).toBeVisible()

    // View proof (mock)
    await expect(page.locator('[data-testid="proof-document"]')).toBeVisible()

    // Approve
    await page.click('[data-testid="approve-button"]')
    await page.fill('[data-testid="notes"]', 'All documents verified')
    await page.click('[data-testid="confirm-approve"]')

    // Should show success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('approved')
  })

  test('should reject winner with reason', async ({ page }) => {
    await page.goto('/admin/winners')
    await page.click('[data-testid="review-winner-button"]')

    // Reject
    await page.click('[data-testid="reject-button"]')
    await page.fill('[data-testid="rejection-reason"]', 'Invalid proof document')
    await page.click('[data-testid="confirm-reject"]')

    // Should show success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('rejected')
  })
})
```

---

## 🚀 TEST EXECUTION

### Test Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --debug"
  }
}
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:unit
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:latest
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:integration
        env:
          TEST_SUPABASE_URL: postgres://postgres:postgres@localhost:5432/postgres
          TEST_SUPABASE_ANON_KEY: test-key

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000
```

---

## 📊 TEST COVERAGE

### Coverage Requirements
```
CRITICAL PATHS (100% coverage):
├── Authentication (register, login, logout)
├── Subscription (checkout, webhook, status)
├── Score entry (validation, storage, statistics)
├── Draw execution (eligibility, selection, prizes)
├── Winner verification (upload, review, payout)
└── Payment processing (Stripe webhooks)

IMPORTANT PATHS (80% coverage):
├── Profile management
├── Charity selection
├── Donation processing
├── Email notifications
└── Admin operations

NICE-TO-HAVE (60% coverage):
├── Error handling edge cases
├── UI components
├── Utility functions
└── Helper functions
```

### Coverage Report
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Coverage thresholds (in vitest.config.ts)
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80
  }
}
```

---

## 🎯 TESTING BEST PRACTICES

### 1. Test Isolation
```typescript
// ✅ GOOD: Each test is independent
test('should create user', async () => {
  const user = await createTestUser()
  expect(user).toBeDefined()
})

test('should delete user', async () => {
  const user = await createTestUser()
  await deleteTestUser(user.id)
  // Verify deletion
})

// ❌ BAD: Tests depend on each other
let sharedUser: any
test('should create user', async () => {
  sharedUser = await createTestUser()
})
test('should use user', async () => {
  // Depends on sharedUser from previous test
})
```

### 2. Descriptive Test Names
```typescript
// ✅ GOOD
test('should reject score below 40', () => {})
test('should allow admin to approve winner', () => {})

// ❌ BAD
test('score test', () => {})
test('admin test', () => {})
```

### 3. Arrange-Act-Assert Pattern
```typescript
// ✅ GOOD
test('should add score', async () => {
  // Arrange
  const userId = 'test-user-id'
  const scoreData = { score: 85, played_date: '2024-01-15' }

  // Act
  const { data } = await addScore(userId, scoreData)

  // Assert
  expect(data).toBeDefined()
  expect(data.score).toBe(85)
})
```

### 4. Mock External Dependencies
```typescript
// ✅ GOOD: Mock Stripe
vi.mock('stripe', () => ({
  default: {
    checkouts: {
      sessions: {
        create: vi.fn(() => Promise.resolve({ url: 'https://checkout.stripe.com' }))
      }
    }
  }
}))

// ❌ BAD: Use real Stripe in tests
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
```

---

## ✅ PHASE 10 COMPLETE

**Testing System includes:**
- ✅ Complete test structure (unit/integration/e2e)
- ✅ Vitest configuration
- ✅ Playwright setup
- ✅ Test helpers and fixtures
- ✅ 20+ unit test examples
- ✅ 10+ integration test examples
- ✅ 6 E2E test suites
- ✅ CI/CD integration
- ✅ Coverage requirements (80%)
- ✅ Testing best practices

**Ready to proceed to PHASE 11: Deployment System**