# PHASE 3: AUTHENTICATION & SECURITY MODEL
## Golf Charity Draw Platform

---

## 🔐 AUTHENTICATION ARCHITECTURE

### Supabase Auth Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. USER REGISTRATION
   ┌──────────┐
   │  User    │
   └────┬─────┘
        │
        ▼
   ┌──────────────────┐
   │ Register Form    │
   │ (Client-side)    │
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ POST /api/auth/register  │
   │ - Validate input (Zod)   │
   │ - Check email not exists │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Supabase Auth            │
   │ - Create user            │
   │ - Send confirmation      │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Trigger: handle_new_user │
   │ - Auto-create profile    │
   │ - Set role = 'user'      │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Send Welcome Email       │
   │ (Resend)                 │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Redirect to Onboarding   │
   └──────────────────────────┘

2. USER LOGIN
   ┌──────────┐
   │  User    │
   └────┬─────┘
        │
        ▼
   ┌──────────────────┐
   │ Login Form       │
   │ (Client-side)    │
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Supabase Auth            │
   │ - signInWithPassword     │
   │ - Create session         │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Set Session Cookie       │
   │ - sb-{project}-auth-token│
   │ - HttpOnly, Secure       │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Redirect to Dashboard    │
   └──────────────────────────┘

3. SESSION VALIDATION
   ┌──────────┐
   │ Request  │
   └────┬─────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Middleware               │
   │ - Check auth cookie      │
   │ - Parse session token    │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Verify Token             │
   │ - Call Supabase /auth/v1 │
   │ - Check not expired      │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Check Role (if admin)    │
   │ - Fetch profile.role     │
   │ - Verify = 'admin'       │
   └────┬─────────────────────┘
        │
        ▼
   ┌──────────────────────────┐
   │ Allow/Deny Access        │
   └──────────────────────────┘
```

---

## 👥 ROLE-BASED ACCESS CONTROL (RBAC)

### Role Definitions

#### 1. **Public** (No authentication)
**Access Level:** Read-only public data
**Can Access:**
- Home page (`/`)
- Login/Register pages
- Public draw results (`/draws`)
- Charity directory (`/charities`)
- Public API endpoints

**Cannot Access:**
- Dashboard
- Score entry
- Draw entry
- Any protected routes

**Implementation:**
```typescript
// No middleware check needed
// RLS: Public read policies on draws, charities, prize_pools
```

#### 2. **User** (Authenticated, any role)
**Access Level:** Own data only
**Can Access:**
- Dashboard (`/dashboard`)
- Own scores (`/scores`)
- Own draw entries
- Own winnings
- Charity selection
- Winner proof upload
- Profile management

**Cannot Access:**
- Admin panel (`/admin`)
- Other users' data
- Draw management
- Winner verification

**Implementation:**
```typescript
// Middleware: Check auth cookie exists
// RLS: user_id = auth.uid() policies
// API: Verify token, check user_id matches
```

#### 3. **Subscriber** (Active subscription required)
**Access Level:** Premium features
**Can Access:**
- All User features
- Score entry (`/scores/add`)
- Draw entry (`/draws/enter`)
- Charity contribution settings
- Winner proof upload

**Cannot Access:**
- Admin features
- Features during grace period (3 days after payment failure)

**Implementation:**
```typescript
// Middleware: Check subscription status
// API: Verify subscription.active = true
// Grace period: Allow if status = 'past_due' and < 3 days old
```

#### 4. **Admin** (Role = 'admin')
**Access Level:** Full system access
**Can Access:**
- All User features
- Admin panel (`/admin`)
- User management
- Draw management
- Winner verification
- Payout processing
- Charity management
- Audit logs
- System configuration

**Implementation:**
```typescript
// Middleware: Check profile.role = 'admin'
// RLS: is_admin(auth.uid()) policies
// API: Verify admin role on every request
// Audit: Log all admin actions
```

---

## 🛡️ MIDDLEWARE PROTECTION

### Middleware Configuration
```typescript
// middleware.ts

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/favicon.ico'
]

const PUBLIC_PREFIXES = [
  '/_next/',
  '/api/stripe/webhook',  // Stripe webhooks (verified separately)
  '/api/auth/',           // Auth endpoints
  '/api/public/'          // Public API endpoints
]

const ADMIN_PATHS = ['/admin']

const SUBSCRIBED_PATHS = [
  '/scores/add',
  '/api/scores/add',
  '/draws/enter',
  '/api/draws/enter'
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // 1. Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()
  
  // 2. Get session cookie
  const sessionRaw = getSessionCookie(req)
  if (!sessionRaw) {
    return redirectToLogin(req)
  }
  
  // 3. Parse access token
  const accessToken = parseAccessToken(sessionRaw)
  if (!accessToken) {
    return redirectToLogin(req)
  }
  
  // 4. Verify token with Supabase
  const user = await verifyToken(accessToken)
  if (!user) {
    return redirectToLogin(req)
  }
  
  // 5. Check admin paths
  if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    const isAdminUser = await checkAdminRole(user.id, accessToken)
    if (!isAdminUser) {
      return redirectToHome(req)
    }
  }
  
  // 6. Check subscription-required paths
  if (SUBSCRIBED_PATHS.some(p => pathname.startsWith(p))) {
    const hasActiveSubscription = await checkSubscription(user.id)
    if (!hasActiveSubscription) {
      return redirectToSubscription(req)
    }
  }
  
  // 7. Add user info to headers for API routes
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-user-email', user.email || '')
  
  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

### Helper Functions
```typescript
// Get session cookie from request
function getSessionCookie(req: NextRequest): string | undefined {
  for (const [name, cookie] of req.cookies) {
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
      return cookie.value
    }
    if (name === 'supabase-auth-token' || name === 'sb-access-token') {
      return cookie.value
    }
  }
  return undefined
}

// Parse access token from cookie value
function parseAccessToken(sessionRaw: string): string | null {
  try {
    const parsed = JSON.parse(sessionRaw)
    if (Array.isArray(parsed) && parsed[0]) return parsed[0]
    return parsed.access_token || parsed.accessToken || null
  } catch {
    return sessionRaw  // Legacy format
  }
}

// Verify token with Supabase
async function verifyToken(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !anonKey) return null
  
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey
    }
  })
  
  if (!response.ok) return null
  
  const data = await response.json()
  return data
}

// Check admin role
async function checkAdminRole(userId: string, accessToken: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${userId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey
      }
    }
  )
  
  const profiles = await response.json()
  return profiles?.[0]?.role === 'admin'
}

// Check active subscription
async function checkSubscription(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/subscriptions?select=status,current_period_end&user_id=eq.${userId}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey
      }
    }
  )
  
  const subscriptions = await response.json()
  if (!subscriptions?.[0]) return false
  
  const sub = subscriptions[0]
  const now = new Date()
  const periodEnd = new Date(sub.current_period_end)
  
  // Active or in grace period (3 days past due)
  if (sub.status === 'active') return true
  if (sub.status === 'past_due') {
    const gracePeriodEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000)
    return now < gracePeriodEnd
  }
  
  return false
}
```

---

## 🔑 TOKEN HANDLING RULES

### Session Token Storage
```
CLIENT-SIDE (Browser):
├── Cookie: sb-{project-ref}-auth-token
│   ├── HttpOnly: true (prevents XSS)
│   ├── Secure: true (HTTPS only)
│   ├── SameSite: lax (CSRF protection)
│   ├── Path: /
│   └── Max-Age: 1 week
│
└── LocalStorage: NOT USED (security risk)

SERVER-SIDE (API Routes):
├── Verify token on every request
├── Never trust client-provided user_id
├── Always fetch user from token
└── Use supabaseAdmin for privileged operations
```

### Token Refresh Strategy
```
1. Access Token: 1 hour expiry
2. Refresh Token: 1 week expiry
3. Supabase handles refresh automatically
4. Middleware checks token validity
5. If expired, redirect to login
```

### Token Validation
```typescript
// API Route Authentication Pattern
export async function POST(req: Request) {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // 2. Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // 3. Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // 4. Continue with business logic
    const userId = user.id
    // ... rest of handler
    
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

---

## ⏰ SESSION EXPIRATION RULES

### Session Lifecycle
```
┌─────────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

1. CREATION
   - User logs in
   - Supabase creates access token (1h) + refresh token (1w)
   - Session cookie set

2. ACTIVE SESSION
   - User interacts with app
   - Supabase auto-refreshes access token
   - Middleware validates on each request

3. IDLE TIMEOUT
   - No activity for 24 hours
   - Session remains valid (refresh token valid)

4. EXPIRATION
   - Refresh token expires (7 days)
   - User must log in again
   - All sessions invalidated on password change

5. MANUAL INVALIDATION
   - User logs out
   - Admin revokes access
   - Password changed
   - Security incident
```

### Session Security
```typescript
// Check session validity
async function isSessionValid(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('updated_at')
    .eq('id', userId)
    .single()
  
  if (error || !data) return false
  
  // Check if password was changed recently
  const lastPasswordChange = new Date(data.updated_at)
  const sessionAge = Date.now() - lastPasswordChange.getTime()
  
  // Invalidate sessions older than 7 days after password change
  return sessionAge < 7 * 24 * 60 * 60 * 1000
}

// Revoke all user sessions
async function revokeAllSessions(userId: string) {
  await supabaseAdmin.auth.admin.signOut(userId, 'global')
}
```

---

## 🚨 THREAT MITIGATION STRATEGIES

### 1. SQL Injection
**Threat:** Attacker injects malicious SQL via input fields
**Mitigation:**
```typescript
// ✅ GOOD: Parameterized queries (Supabase client)
const { data } = await supabaseAdmin
  .from('scores')
  .select('*')
  .eq('user_id', userId)
  .eq('played_date', date)

// ❌ BAD: Raw SQL with string interpolation
const { data } = await supabaseAdmin
  .from('scores')
  .select(`* WHERE user_id = '${userId}'`)  // NEVER DO THIS
```

**Additional Protection:**
- Supabase client uses parameterized queries by default
- Input validation via Zod schemas
- RLS prevents unauthorized data access

### 2. Cross-Site Scripting (XSS)
**Threat:** Attacker injects malicious scripts into pages
**Mitigation:**
```typescript
// ✅ GOOD: React auto-escaping
const userInput = '<script>alert("xss")</script>'
return <div>{userInput}</div>  // Escaped automatically

// ❌ BAD: dangerouslySetInnerHTML
return <div dangerouslySetInnerHTML={{ __html: userInput }} />

// Additional Protection:
// - Content-Security-Policy headers
// - X-XSS-Protection header
// - Sanitize HTML if absolutely necessary (use DOMPurify)
```

**CSP Headers:**
```typescript
// next.config.mjs
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  }
]
```

### 3. Cross-Site Request Forgery (CSRF)
**Threat:** Attacker tricks user into making unwanted requests
**Mitigation:**
```typescript
// ✅ GOOD: Use Supabase Auth (includes CSRF token)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// ✅ GOOD: Verify Origin header on sensitive endpoints
const origin = req.headers.get('origin')
const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL]
if (!allowedOrigins.includes(origin)) {
  return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
}

// ✅ GOOD: Use POST for mutations (not GET)
// ✅ GOOD: Check CSRF token for state-changing operations
```

### 4. Authentication Bypass
**Threat:** Attacker accesses protected routes without authentication
**Mitigation:**
```typescript
// Middleware enforces auth on all protected routes
// RLS prevents unauthorized data access
// API routes verify JWT tokens
// Admin routes verify role

// Defense in depth:
// 1. Middleware: Redirect to login if no session
// 2. API: Verify token on every request
// 3. RLS: Database-level access control
// 4. Business logic: Check permissions before actions
```

### 5. Authorization Escalation
**Threat:** Regular user gains admin privileges
**Mitigation:**
```typescript
// ✅ ALWAYS verify role on admin routes
async function requireAdmin(req: Request) {
  const token = extractToken(req)
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'admin') {
    await logSecurityEvent('unauthorized_admin_access', user.id)
    throw new Error('Forbidden')
  }
  
  return user
}

// ✅ Log all role changes
await supabaseAdmin.from('audit_logs').insert({
  action: 'role_change',
  entity_type: 'profile',
  entity_id: userId,
  metadata: { old_role, new_role, changed_by: adminId }
})
```

### 6. Brute Force Attacks
**Threat:** Attacker tries many passwords to gain access
**Mitigation:**
```typescript
// Rate limiting on auth endpoints
import { ratelimit } from '@/lib/rateLimiter'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }
  
  // Continue with login logic
}

// Rate limiter configuration
export const ratelimit = new Ratelimit({
  redis: new Redis(process.env.REDIS_URL),
  limiter: Ratelimit.slidingWindow(10, '10 s')
})
```

### 7. Session Hijacking
**Threat:** Attacker steals session token
**Mitigation:**
```typescript
// ✅ Use HttpOnly cookies (prevents JavaScript access)
Set-Cookie: sb-{project}-auth-token={token}; HttpOnly; Secure; SameSite=Lax

// ✅ Use Secure flag (HTTPS only)
// ✅ Use SameSite=Lax (CSRF protection)
// ✅ Short token expiry (1 hour)
// ✅ Rotate refresh tokens
// ✅ Bind tokens to IP address (optional, can cause UX issues)

// ✅ Detect suspicious activity
async function detectSuspiciousActivity(userId: string, req: Request) {
  const ip = req.headers.get('x-forwarded-for')
  const userAgent = req.headers.get('user-agent')
  
  // Check if IP changed
  const { data: lastLogin } = await supabaseAdmin
    .from('audit_logs')
    .select('ip_address')
    .eq('user_id', userId)
    .eq('action', 'login')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (lastLogin?.ip_address !== ip) {
    // Send security alert email
    await sendSecurityAlert(userId, ip, userAgent)
  }
}
```

### 8. Password Security
**Threat:** Attacker obtains password database
**Mitigation:**
```typescript
// Supabase Auth uses bcrypt by default
// - Salt rounds: 10
// - Passwords never stored in plain text
// - Password hashing handled by Supabase

// Enforce strong passwords (client-side validation)
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character')
})

// Password reset flow
// 1. User requests reset
// 2. Generate secure token (Supabase)
// 3. Send email with reset link (expires in 1 hour)
// 4. User sets new password
// 5. Invalidate all existing sessions
```

### 9. Man-in-the-Middle (MITM)
**Threat:** Attacker intercepts traffic
**Mitigation:**
```typescript
// ✅ Always use HTTPS
// - Vercel enforces HTTPS by default
// - HSTS header
// - Secure cookies

// next.config.mjs
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ]
  }
}
```

### 10. Insecure Direct Object References (IDOR)
**Threat:** Attacker accesses other users' data by changing IDs
**Mitigation:**
```typescript
// ✅ ALWAYS verify user owns the resource
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  
  // Get score
  const { data: score } = await supabaseAdmin
    .from('scores')
    .select('*')
    .eq('id', params.id)
    .single()
  
  // ✅ Verify ownership
  if (score.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  return NextResponse.json(score)
}

// ✅ RLS provides additional protection
// Even if API check fails, RLS prevents access
```

---

## 🔒 SECURE FILE UPLOAD RULES

### File Upload Flow
```
User Selects File
       │
       ▼
Client-Side Validation
├── File type: .jpg, .jpeg, .png, .pdf only
├── File size: <= 5MB
└── File name: No special characters
       │
       ▼
Upload to Supabase Storage
├── Private bucket: winner-proofs
├── Path: {winnerId}/{timestamp}-{filename}
├── Content-Type validation
└── Size validation (server-side)
       │
       ▼
Store Reference in Database
├── winner_proofs.file_url
├── winner_proofs.file_name
├── winner_proofs.file_size
└── winner_proofs.mime_type
       │
       ▼
Admin Review
└── Admin can view/download via RLS
```

### File Upload Implementation
```typescript
// app/api/winners/upload-proof/route.ts
export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // 2. Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const winnerId = formData.get('winner_id') as string
    
    // 3. Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    const maxSize = 5 * 1024 * 1024  // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: JPG, PNG, PDF' 
      }, { status: 400 })
    }
    
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Max size: 5MB' 
      }, { status: 400 })
    }
    
    // 4. Verify winner belongs to user
    const { data: winner } = await supabaseAdmin
      .from('winners')
      .select('user_id')
      .eq('id', winnerId)
      .single()
    
    if (winner?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // 5. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${winnerId}/${fileName}`
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('winner-proofs')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })
    
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }
    
    // 6. Get public URL (signed URL for private bucket)
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('winner-proofs')
      .getPublicUrl(filePath)
    
    // 7. Update winner record
    const { error: updateError } = await supabaseAdmin
      .from('winners')
      .update({ proof_url: publicUrl })
      .eq('id', winnerId)
    
    if (updateError) {
      // Cleanup uploaded file
      await supabaseAdmin.storage.from('winner-proofs').remove([filePath])
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    
    // 8. Create proof record
    await supabaseAdmin.from('winner_proofs').insert({
      winner_id: winnerId,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type
    })
    
    // 9. Notify admin
    await notifyAdminNewProof(winnerId)
    
    return NextResponse.json({ ok: true, url: publicUrl })
    
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

### Storage Security
```sql
-- Storage bucket configuration (via Supabase Dashboard)
-- Bucket: winner-proofs
-- Settings:
--   - Public: false (private)
--   - File size limit: 5MB
--   - Allowed MIME types: image/jpeg, image/png, application/pdf
--   - Allowed extensions: jpg, jpeg, png, pdf

-- RLS on storage.objects
CREATE POLICY "Admin can view all proofs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'winner-proofs' AND
    is_admin(auth.uid())
  );

CREATE POLICY "Users can upload own proofs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'winner-proofs' AND
    auth.uid() IN (
      SELECT user_id FROM winners WHERE id = (storage.foldername(name))[1]::uuid
    )
  );
```

---

## 🔐 PASSWORD SECURITY

### Password Requirements
```
Minimum Requirements:
- Length: 8 characters
- Uppercase: At least 1 (A-Z)
- Lowercase: At least 1 (a-z)
- Number: At least 1 (0-9)
- Special character: At least 1 (!@#$%^&*)

Recommended (enforced client-side):
- Length: 12+ characters
- No common passwords
- No personal information
```

### Password Hashing
```
Algorithm: bcrypt
Salt rounds: 10
Managed by: Supabase Auth (automatic)

Never:
- Store plain text passwords
- Log passwords
- Send passwords via email
- Hash passwords manually (use Supabase)
```

### Password Reset Flow
```
1. User requests reset (/forgot-password)
   └── Enter email
   
2. System generates reset token
   └── Supabase generates secure token
   └── Token expires in 1 hour
   
3. Send reset email
   └── Link: /reset-password?token={token}
   └── Email: "Reset your password"
   
4. User clicks link
   └── Verify token
   └── Show password reset form
   
5. User sets new password
   └── Validate password strength
   └── Update password (Supabase)
   └── Invalidate all sessions
   
6. Send confirmation email
   └── "Your password has been reset"
```

---

## 🔄 SUBSCRIPTION ENFORCEMENT GUARD

### Subscription Guard Middleware
```typescript
// lib/subscriptionGuard.ts

export async function requireActiveSubscription(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .single()
  
  if (!subscription) {
    return { allowed: false, reason: 'no_subscription' }
  }
  
  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)
  
  // Active subscription
  if (subscription.status === 'active' && now < periodEnd) {
    return { allowed: true }
  }
  
  // Grace period (3 days past due)
  if (subscription.status === 'past_due') {
    const gracePeriodEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000)
    if (now < gracePeriodEnd) {
      return { allowed: true, reason: 'grace_period' }
    }
  }
  
  return { allowed: false, reason: subscription.status }
}
```

### Subscription Guard Usage
```typescript
// app/api/scores/add/route.ts
export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // 2. Check subscription
    const { allowed, reason } = await requireActiveSubscription(req)
    if (!allowed) {
      if (reason === 'grace_period') {
        return NextResponse.json({ 
          error: 'Subscription payment failed. Please update payment method.',
          code: 'payment_failed'
        }, { status: 403 })
      }
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }
    
    // 3. Continue with score entry logic
    // ...
    
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

---

## 🔐 SECURITY HEADERS

### Required Security Headers
```typescript
// next.config.mjs
const securityHeaders = [
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  // XSS protection
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // HTTPS enforcement
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  },
  // Referrer policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Permissions policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ]
  }
}
```

---

## 🔍 INPUT VALIDATION

### Validation Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION LAYERS                          │
└─────────────────────────────────────────────────────────────┘

1. CLIENT-SIDE (UX only, not security)
   ├── Zod validation
   ├── HTML5 validation
   └── User-friendly error messages

2. API ROUTE (Security boundary)
   ├── Zod schema validation
   ├── Type checking
   ├── Range validation
   └── Sanitization

3. DATABASE (Final defense)
   ├── CHECK constraints
   ├── NOT NULL constraints
   ├── Foreign key constraints
   └── RLS policies
```

### Validation Example
```typescript
// validators/score.ts
import { z } from 'zod'

export const scoreSchema = z.object({
  score: z.number()
    .int('Score must be a whole number')
    .min(40, 'Score must be at least 40')
    .max(200, 'Score must be at most 200'),
  
  played_date: z.string()
    .datetime('Invalid date format')
    .refine(
      (date) => new Date(date) <= new Date(),
      'Cannot submit scores for future dates'
    )
})

// Usage in API route
export async function POST(req: Request) {
  const body = await req.json()
  
  // Validate input
  const validation = scoreSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed',
      details: validation.error.errors 
    }, { status: 400 })
  }
  
  const { score, played_date } = validation.data
  
  // Continue with business logic
  // ...
}
```

---

## 🔐 SECURITY AUDIT CHECKLIST

### Pre-Deployment Security Checklist
- [ ] All API routes require authentication (except public endpoints)
- [ ] All admin routes verify admin role
- [ ] All financial operations use service role (backend only)
- [ ] RLS enabled on all tables
- [ ] RLS policies tested and verified
- [ ] Input validation on all endpoints (Zod)
- [ ] SQL injection prevention verified
- [ ] XSS prevention (React auto-escaping + CSP)
- [ ] CSRF protection enabled
- [ ] HTTPS enforced (HSTS header)
- [ ] Secure cookies (HttpOnly, Secure, SameSite)
- [ ] File upload restrictions (type, size)
- [ ] Rate limiting on sensitive endpoints
- [ ] Password strength requirements enforced
- [ ] Session timeout configured
- [ ] Audit logging enabled for admin actions
- [ ] Webhook signature verification (Stripe)
- [ ] Error messages don't leak sensitive info
- [ ] No secrets in client-side code
- [ ] Environment variables properly configured

---

## 🚨 SECURITY INCIDENT RESPONSE

### Incident Response Plan
```
1. DETECTION
   ├── Monitor audit logs
   ├── Alert on suspicious activity
   └── User reports

2. CONTAINMENT
   ├── Revoke compromised sessions
   ├── Disable affected accounts
   └── Block suspicious IPs

3. INVESTIGATION
   ├── Review audit logs
   ├── Identify attack vector
   └── Assess damage

4. REMEDIATION
   ├── Fix vulnerability
   ├── Update passwords
   └── Patch systems

5. RECOVERY
   ├── Restore services
   ├── Notify affected users
   └── Monitor for recurrence

6. LESSONS LEARNED
   ├── Document incident
   ├── Update security policies
   └── Train team
```

### Emergency Procedures
```typescript
// Emergency: Revoke all user sessions
async function emergencyRevokeAllSessions() {
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('id')
  
  for (const user of users || []) {
    await supabaseAdmin.auth.admin.signOut(user.id, 'global')
  }
}

// Emergency: Disable user account
async function emergencyDisableUser(userId: string) {
  await supabaseAdmin
    .from('profiles')
    .update({ role: 'disabled' })
    .eq('id', userId)
  
  await supabaseAdmin.auth.admin.signOut(userId, 'global')
  
  await supabaseAdmin.from('audit_logs').insert({
    action: 'emergency_disable',
    entity_type: 'profile',
    entity_id: userId,
    metadata: { reason: 'Security incident' }
  })
}
```

---

## ✅ PHASE 3 COMPLETE

**Authentication & Security model includes:**
- ✅ Complete Supabase Auth flow
- ✅ Role-based access control (4 levels)
- ✅ Middleware protection
- ✅ Token handling rules
- ✅ Session expiration rules
- ✅ 10 threat mitigation strategies
- ✅ Secure file upload rules
- ✅ Password security
- ✅ Subscription enforcement guard
- ✅ Security headers
- ✅ Input validation strategy
- ✅ Security audit checklist
- ✅ Incident response plan

**Ready to proceed to PHASE 4: Subscription System (Stripe)**