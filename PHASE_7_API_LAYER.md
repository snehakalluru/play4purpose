# PHASE 7: API LAYER
## Golf Charity Draw Platform

---

## 📡 API ARCHITECTURE OVERVIEW

### API Structure
```
app/api/
├── auth/
│   └── register/
│       └── route.ts          # User registration
├── scores/
│   ├── route.ts              # GET user scores
│   ├── add/
│   │   └── route.ts          # POST add score
│   └── [id]/
│       └── route.ts          # DELETE score
├── draws/
│   ├── route.ts              # GET available draws
│   ├── enter/
│   │   └── route.ts          # POST enter draw
│   └── run/
│       └── route.ts          # POST run draw (legacy)
├── winners/
│   ├── route.ts              # GET user winnings
│   └── upload-proof/
│       └── route.ts          # POST upload proof
├── charities/
│   └── [id]/
│       └── route.ts          # GET charity details
├── profile/
│   └── route.ts              # GET/PUT user profile
├── subscription/
│   └── route.ts              # GET subscription status
├── stripe/
│   ├── checkout/
│   │   └── route.ts          # POST create checkout
│   └── webhook/
│       └── route.ts          # POST Stripe webhooks
└── admin/
    ├── users/
    │   ├── route.ts          # GET/PUT users
    │   └── role/
    │       └── route.ts      # PUT change role
    ├── draws/
    │   ├── route.ts          # GET draws
    │   ├── status/
    │   │   └── route.ts      # PUT update status
    │   └── run-draw/
    │       └── route.ts      # POST execute draw
    ├── winners/
    │   ├── list/
    │   │   └── route.ts      # GET all winners
    │   ├── review/
    │   │   └── route.ts      # POST approve/reject
    │   └── payout/
    │       └── route.ts      # POST process payout
    └── payouts/
        ├── route.ts          # GET payouts
        └── mark-paid/
            └── route.ts      # POST mark as paid
```

---

## 🔐 AUTHENTICATION MIDDLEWARE

### Auth Helper Function
```typescript
// lib/authMiddleware.ts

import { supabaseAdmin } from '@/services/supabaseAdmin'
import { NextResponse } from 'next/server'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  profile: any
}

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export async function authenticateUser(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader) {
    throw new AuthError(401, 'Missing authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  if (!token) {
    throw new AuthError(401, 'Invalid token format')
  }

  // Verify token with Supabase
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  
  if (userError || !user) {
    throw new AuthError(401, 'Invalid or expired token')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new AuthError(404, 'User profile not found')
  }

  return {
    id: user.id,
    email: user.email || '',
    role: profile.role,
    profile
  }
}

export async function requireAdmin(user: AuthenticatedUser): Promise<void> {
  if (user.role !== 'admin') {
    throw new AuthError(403, 'Admin access required')
  }
}

export async function requireSubscription(userId: string): Promise<boolean> {
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .single()

  if (!subscription) {
    return false
  }

  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)

  // Active subscription
  if (subscription.status === 'active' && now < periodEnd) {
    return true
  }

  // Grace period (3 days past due)
  if (subscription.status === 'past_due') {
    const gracePeriodEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000)
    return now < gracePeriodEnd
  }

  return false
}

export function handleAuthError(error: any): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    )
  }

  console.error('Authentication error:', error)
  return NextResponse.json(
    { error: 'Authentication failed' },
    { status: 401 }
  )
}
```

### Usage in API Routes
```typescript
// Example: app/api/scores/add/route.ts
import { NextResponse } from 'next/server'
import { authenticateUser, requireSubscription, handleAuthError, AuthError } from '@/lib/authMiddleware'
import { scoreSchema } from '@/validators/score'

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const user = await authenticateUser(req)

    // 2. Check subscription (if required)
    const hasSubscription = await requireSubscription(user.id)
    if (!hasSubscription) {
      throw new AuthError(403, 'Active subscription required')
    }

    // 3. Validate input
    const body = await req.json()
    const validation = scoreSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { score, played_date } = validation.data

    // 4. Business logic
    // ... (implementation)

    return NextResponse.json({ success: true, data })

  } catch (error) {
    return handleAuthError(error)
  }
}
```

---

## 📝 VALIDATION SCHEMAS (ZOD)

### Auth Validators
```typescript
// validators/auth.ts
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100)
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character')
})
```

### Score Validators
```typescript
// validators/score.ts
import { z } from 'zod'

export const scoreSchema = z.object({
  score: z.number()
    .int('Score must be a whole number')
    .min(1, 'Score must be at least 1')
    .max(45, 'Score must be at most 45'),
  
  played_date: z.string()
    .datetime('Invalid date format')
    .refine(
      (date) => new Date(date) <= new Date(),
      'Cannot submit scores for future dates'
    )
})

export const deleteScoreSchema = z.object({
  score_id: z.string().uuid('Invalid score ID')
})
```

### Draw Validators
```typescript
// validators/draw.ts
import { z } from 'zod'

export const createDrawSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  draw_date: z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    'Draw date must be in the future'
  ),
  status: z.enum(['draft', 'scheduled', 'running', 'completed']).optional()
})

export const enterDrawSchema = z.object({
  draw_id: z.string().uuid('Invalid draw ID')
})

export const runDrawSchema = z.object({
  draw_id: z.string().uuid('Invalid draw ID')
})
```

### Winner Validators
```typescript
// validators/winner.ts
import { z } from 'zod'

export const reviewWinnerSchema = z.object({
  winner_id: z.string().uuid('Invalid winner ID'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional()
})

export const uploadProofSchema = z.object({
  winner_id: z.string().uuid('Invalid winner ID')
})

export const markPaidSchema = z.object({
  payout_id: z.string().uuid('Invalid payout ID'),
  payment_method: z.enum(['bank_transfer', 'paypal', 'cheque']),
  transaction_reference: z.string().min(1, 'Transaction reference is required'),
  notes: z.string().max(1000).optional()
})
```

### Charity Validators
```typescript
// validators/charity.ts
import { z } from 'zod'

export const selectCharitySchema = z.object({
  charity_id: z.string().uuid('Invalid charity ID'),
  contribution_percentage: z.number()
    .int('Must be a whole number')
    .min(10, 'Minimum contribution is 10%')
    .max(20, 'Maximum contribution is 20%')
})
```

### Subscription Validators
```typescript
// validators/subscription.ts
import { z } from 'zod'

export const createCheckoutSchema = z.object({
  plan_type: z.enum(['monthly', 'yearly'])
})
```

---

## 🛣️ REST API ENDPOINTS

### Public Endpoints (No Auth Required)

#### POST /api/auth/register
**Purpose:** Register new user
**Auth:** None
**Input:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```
**Output:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```
**Validation:** `registerSchema`
**Errors:** 400 (validation), 409 (email exists)

---

### Protected Endpoints (Auth Required)

#### GET /api/scores
**Purpose:** Get user's scores
**Auth:** Required
**Query Params:**
- `limit` (optional): Number of scores to return (default: 10)
- `offset` (optional): Pagination offset (default: 0)
**Output:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "score": 85,
      "played_date": "2024-01-15",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 10
}
```
**Errors:** 401 (unauthorized)

---

#### POST /api/scores/add
**Purpose:** Add new score
**Auth:** Required + Subscription
**Input:**
```json
{
  "score": 85,
  "played_date": "2024-01-15"
}
```
**Output:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "score": 85,
    "played_date": "2024-01-15"
  },
  "message": "Score added successfully"
}
```
**Validation:** `scoreSchema`
**Errors:** 400 (validation), 401 (unauthorized), 403 (no subscription), 409 (duplicate date)

---

#### DELETE /api/scores/[id]
**Purpose:** Delete score
**Auth:** Required + Ownership
**Output:**
```json
{
  "success": true,
  "message": "Score deleted successfully"
}
```
**Errors:** 401, 403 (not owner), 404 (not found)

---

#### GET /api/draws
**Purpose:** Get available draws
**Auth:** None (public)
**Output:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "January 2024 Draw",
      "draw_date": "2024-01-31",
      "status": "scheduled",
      "prize_pool": 500.00
    }
  ]
}
```
**Errors:** 500 (server error)

---

#### POST /api/draws/enter
**Purpose:** Enter user into draw
**Auth:** Required + Subscription + Eligibility
**Input:**
```json
{
  "draw_id": "uuid"
}
```
**Output:**
```json
{
  "success": true,
  "entry": {
    "id": "uuid",
    "entry_number": "DRAW-2024-ABC123456",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```
**Validation:** `enterDrawSchema`
**Errors:** 400 (validation), 401, 403 (not eligible), 404 (no active draw), 409 (already entered)

---

#### GET /api/winners
**Purpose:** Get user's winnings
**Auth:** Required + Ownership
**Output:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "position": 1,
      "amount": 200.00,
      "verification_status": "approved",
      "payment_status": "paid",
      "draws": {
        "draw_date": "2024-01-31"
      }
    }
  ]
}
```
**Errors:** 401

---

#### POST /api/winners/upload-proof
**Purpose:** Upload winner verification proof
**Auth:** Required + Ownership
**Input:** Multipart form data
- `file`: File (JPG, PNG, PDF, max 5MB)
- `winner_id`: string (UUID)
**Output:**
```json
{
  "success": true,
  "proof_url": "https://...",
  "message": "Proof uploaded successfully"
}
```
**Errors:** 400 (validation), 401, 403 (not owner), 404 (winner not found)

---

#### GET /api/profile
**Purpose:** Get user profile
**Auth:** Required + Ownership
**Output:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "charity_id": "uuid",
    "contribution_percentage": 15
  }
}
```
**Errors:** 401, 404

---

#### PUT /api/profile
**Purpose:** Update user profile
**Auth:** Required + Ownership
**Input:**
```json
{
  "full_name": "John Doe",
  "charity_id": "uuid",
  "contribution_percentage": 15
}
```
**Output:**
```json
{
  "success": true,
  "data": { /* updated profile */ }
}
```
**Errors:** 400, 401, 403

---

#### GET /api/subscription
**Purpose:** Get user subscription
**Auth:** Required + Ownership
**Output:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "plan_type": "monthly",
    "status": "active",
    "current_period_end": "2024-02-15"
  }
}
```
**Errors:** 401, 404

---

#### POST /api/stripe/checkout
**Purpose:** Create Stripe checkout session
**Auth:** Required
**Input:**
```json
{
  "plan_type": "monthly"
}
```
**Output:**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/..."
}
```
**Validation:** `createCheckoutSchema`
**Errors:** 400, 401, 500

---

### Admin Endpoints (Admin Only)

#### GET /api/admin/users
**Purpose:** Get all users
**Auth:** Admin only
**Query Params:**
- `role` (optional): Filter by role
- `search` (optional): Search by email/name
- `limit` (optional): Default 50
- `offset` (optional): Pagination
**Output:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user",
      "subscriptions": { /* subscription data */ }
    }
  ],
  "total": 100
}
```
**Errors:** 401, 403

---

#### PUT /api/admin/users/role
**Purpose:** Change user role
**Auth:** Admin only
**Input:**
```json
{
  "user_id": "uuid",
  "new_role": "admin"
}
```
**Output:**
```json
{
  "success": true,
  "message": "Role updated successfully"
}
```
**Errors:** 400, 401, 403, 404

---

#### POST /api/admin/run-draw
**Purpose:** Execute draw
**Auth:** Admin only
**Output:**
```json
{
  "success": true,
  "draw": {
    "id": "uuid",
    "status": "completed",
    "winners": [
      {
        "user_id": "uuid",
        "position": 1,
        "amount": 200.00
      }
    ]
  }
}
```
**Errors:** 400 (not enough participants), 401, 403

---

#### GET /api/admin/winners/list
**Purpose:** Get all winners
**Auth:** Admin only
**Query Params:**
- `status` (optional): Filter by verification_status
- `draw_id` (optional): Filter by draw
**Output:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "position": 1,
      "amount": 200.00,
      "verification_status": "pending",
      "payment_status": "pending",
      "profiles": {
        "email": "winner@example.com",
        "full_name": "Jane Doe"
      }
    }
  ]
}
```
**Errors:** 401, 403

---

#### POST /api/admin/winners/review
**Purpose:** Approve/reject winner
**Auth:** Admin only
**Input:**
```json
{
  "winner_id": "uuid",
  "action": "approve",
  "notes": "All documents verified"
}
```
**Output:**
```json
{
  "success": true,
  "message": "Winner approved successfully",
  "status": "approved"
}
```
**Validation:** `reviewWinnerSchema`
**Errors:** 400, 401, 403, 404

---

#### POST /api/admin/payouts/mark-paid
**Purpose:** Mark payout as paid
**Auth:** Admin only
**Input:**
```json
{
  "payout_id": "uuid",
  "payment_method": "bank_transfer",
  "transaction_reference": "TXN-123456",
  "notes": "Payment sent via bank transfer"
}
```
**Output:**
```json
{
  "success": true,
  "message": "Payout marked as paid",
  "payout_id": "uuid",
  "amount": 200.00
}
```
**Validation:** `markPaidSchema`
**Errors:** 400, 401, 403, 404

---

## 🔄 SERVER ACTIONS

### Score Actions
```typescript
// actions/scoreActions.ts
'use server'

import { supabaseAdmin } from '@/services/supabaseAdmin'
import { scoreSchema } from '@/validators/score'
import { authenticateUser, requireSubscription } from '@/lib/authMiddleware'

export async function addScore(formData: FormData) {
  // Implementation from PHASE_5
}

export async function deleteScore(scoreId: string) {
  // Implementation from PHASE_5
}

export async function getScores(limit: number = 10, offset: number = 0) {
  try {
    const user = await authenticateUser({ 
      headers: { authorization: `Bearer ${formData.get('token')}` } 
    } as any)

    const { data, error } = await supabaseAdmin
      .from('scores')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('played_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      success: true,
      data: data || [],
      total: data?.length || 0
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
```

### Charity Actions
```typescript
// actions/charityActions.ts
'use server'

import { supabaseAdmin } from '@/services/supabaseAdmin'
import { selectCharitySchema } from '@/validators/charity'

export async function selectCharity(formData: FormData) {
  // Implementation from PHASE_5
}

export async function getCharityDirectory() {
  // Implementation from PHASE_5
}
```

### Subscription Actions
```typescript
// actions/subscriptionActions.ts
'use server'

import { supabaseAdmin } from '@/services/supabaseAdmin'

export async function getSubscriptionStatus() {
  try {
    const user = await authenticateUser(req)
    
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function cancelSubscription() {
  try {
    const user = await authenticateUser(req)
    
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return { success: false, error: 'No subscription found' }
    }

    // Cancel in Stripe
    const stripe = getStripeClient()
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id)

    return { success: true, message: 'Subscription cancelled' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
```

---

## ⚠️ ERROR HANDLING

### Global Error Handler
```typescript
// lib/errorHandler.ts

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message)
  }
}

export function handleAPIError(error: any): NextResponse {
  // Known API errors
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details
      },
      { status: error.statusCode }
    )
  }

  // Auth errors
  if (error instanceof AuthError) {
    return handleAuthError(error)
  }

  // Validation errors (Zod)
  if (error.name === 'ZodError') {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors
      },
      { status: 400 }
    )
  }

  // Database errors
  if (error.code === '23505') {
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 }
    )
  }

  if (error.code === '23503') {
    return NextResponse.json(
      { error: 'Referenced resource not found' },
      { status: 404 }
    )
  }

  // Unknown errors
  console.error('Unhandled API error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

// Global error handler wrapper
export function withErrorHandler(handler: Function) {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (error) {
      return handleAPIError(error)
    }
  }
}
```

### Usage
```typescript
// Wrap API route handlers
export const POST = withErrorHandler(async (req: Request) => {
  // Your logic here
})

// Or manually in try-catch
export async function POST(req: Request) {
  try {
    // Your logic
  } catch (error) {
    return handleAPIError(error)
  }
}
```

---

## 📊 RESPONSE FORMATS

### Success Response
```typescript
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message",
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

### Error Response
```typescript
{
  "error": "Error message",
  "details": {
    "field": "field_name",
    "message": "Detailed error"
  },
  "code": "ERROR_CODE"
}
```

### Paginated Response
```typescript
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## 🔒 RATE LIMITING

### Rate Limiter Implementation
```typescript
// lib/rateLimiter.ts

import { NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
}

const rateLimits = new Map<string, { count: number; resetTime: number }>()

export class RateLimiter {
  private windowMs: number
  private maxRequests: number

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs
    this.maxRequests = config.maxRequests
  }

  check(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now()
    const record = rateLimits.get(identifier)

    if (!record || now > record.resetTime) {
      // New window
      rateLimits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return { allowed: true, remaining: this.maxRequests - 1 }
    }

    if (record.count >= this.maxRequests) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0 }
    }

    // Increment count
    record.count++
    return { allowed: true, remaining: this.maxRequests - record.count }
  }

  middleware() {
    return async (req: Request) => {
      const ip = req.headers.get('x-forwarded-for') || 'unknown'
      const { allowed, remaining } = this.check(ip)

      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        )
      }

      // Add rate limit headers
      const headers = new Headers()
      headers.set('X-RateLimit-Remaining', remaining.toString())

      return NextResponse.next({ headers })
    }
  }
}

// Pre-configured rate limiters
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 10  // 10 attempts per 15 minutes
})

export const apiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100  // 100 requests per 15 minutes
})

export const sensitiveLimiter = new RateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10  // 10 requests per minute
})
```

### Usage in API Routes
```typescript
// app/api/auth/register/route.ts
import { authLimiter } from '@/lib/rateLimiter'

export async function POST(req: Request) {
  // Check rate limit
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const { allowed } = authLimiter.check(ip)
  
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again in 15 minutes.' },
      { status: 429 }
    )
  }

  // Continue with registration logic
}
```

---

## 🔍 INPUT SANITIZATION

### Sanitization Utilities
```typescript
// lib/sanitize.ts

export class Sanitizer {
  // Sanitize string input
  static string(input: string, maxLength: number = 255): string {
    return input
      .trim()
      .replace(/[<>]/g, '')  // Remove HTML tags
      .substring(0, maxLength)
  }

  // Sanitize email
  static email(email: string): string {
    return email.toLowerCase().trim()
  }

  // Sanitize number
  static number(input: any, min: number, max: number): number {
    const num = parseFloat(input)
    if (isNaN(num)) throw new Error('Invalid number')
    return Math.max(min, Math.min(max, num))
  }

  // Sanitize UUID
  static uuid(input: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(input)) {
      throw new Error('Invalid UUID format')
    }
    return input.toLowerCase()
  }

  // Sanitize SQL (prevent injection - though Supabase handles this)
  static sql(input: string): string {
    return input.replace(/'/g, "''")  // Escape single quotes
  }

  // Sanitize file name
  static fileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .replace(/\.{2,}/g, '.')
      .substring(0, 100)
  }
}
```

---

## 📋 API DOCUMENTATION

### OpenAPI/Swagger Specification
```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Play4Purpose API
  version: 1.0.0
  description: Golf Charity Draw Platform API

servers:
  - url: https://api.play4purpose.com
    description: Production server

paths:
  /api/scores/add:
    post:
      summary: Add new score
      authentication: Bearer Token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - score
                - played_date
              properties:
                score:
                  type: integer
                  minimum: 1
                  maximum: 45
                played_date:
                  type: string
                  format: date
      responses:
        '200':
          description: Score added successfully
        '400':
          description: Validation error
        '401':
          description: Unauthorized
        '403':
          description: Subscription required

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: Supabase JWT
```

---

## ✅ PHASE 7 COMPLETE

**API Layer includes:**
- ✅ Complete REST API structure
- ✅ Authentication middleware
- ✅ Authorization helpers
- ✅ Zod validation schemas
- ✅ Error handling system
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ Server Actions
- ✅ Response formatting
- ✅ API documentation structure

**Ready to proceed to PHASE 8: Frontend Architecture**