# PHASE 1: SYSTEM ARCHITECTURE
## Golf Charity Draw Platform

---

## 🏗️ HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Web App    │  │  Mobile Web  │  │   Admin Panel        │  │
│  │  (Next.js)   │  │  (Responsive) │  │   (Next.js)          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
│         └──────────────────┴──────────────────────┘              │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTPS/TLS 1.3
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                  EDGE / CDN LAYER                                │
│                   (Vercel Edge Network)                          │
│         - DDoS Protection                                        │
│         - Rate Limiting                                           │
│         - Geographic Routing                                      │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                    API GATEWAY LAYER                              │
│                   (Next.js Middleware)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  - Authentication Check (Supabase Auth)                   │   │
│  │  - Role Verification (user/admin)                         │   │
│  │  - Rate Limiting (100 req/15min)                          │   │
│  │  - CSRF Protection                                        │   │
│  │  - Subscription Guard (protected routes)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                   APPLICATION LAYER                              │
│                  (Next.js App Router)                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API ROUTES                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Public    │  │ Protected   │  │    Admin        │  │   │
│  │  │   Routes    │  │   Routes    │  │    Routes       │  │   │
│  │  │             │  │             │  │                 │  │   │
│  │  │ /api/auth/* │  │ /api/scores │  │ /api/admin/*    │  │   │
│  │  │ /api/draws  │  │ /api/draws/ │  │ /api/admin/     │  │   │
│  │  │             │  │   enter     │  │   run-draw      │  │   │
│  │  │             │  │ /api/winners│  │ /api/admin/     │  │   │
│  │  │             │  │             │  │   winners/*     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SERVER ACTIONS                           │   │
│  │  - scoreActions.ts (add/delete scores)                    │   │
│  │  - subscriptionActions.ts (manage subscription)           │   │
│  │  - charityActions.ts (select/update charity)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐
│  SUPABASE      │  │   STRIPE    │  │   RESEND    │
│  (PostgreSQL)  │  │  (Payments) │  │   (Email)   │
│                │  │             │  │             │
│  - Auth        │  │ - Checkout  │  │ - Welcome   │
│  - Database    │  │ - Webhooks  │  │ - Receipts  │
│  - Storage     │  │ - Customers │  │ - Draw      │
│  - RLS         │  │ - Subscript │  │   Results   │
└────────────────┘  └─────────────┘  └─────────────┘
```

---

## 🔐 SECURITY BOUNDARIES

### Trust Levels:
```
┌─────────────────────────────────────────────────────────────┐
│  TRUST LEVEL 0: PUBLIC (No Auth Required)                    │
│  - Home page                                                 │
│  - Login/Register pages                                      │
│  - Public draw results                                       │
│  - Charity directory                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TRUST LEVEL 1: AUTHENTICATED (Any logged-in user)           │
│  - Dashboard                                                 │
│  - Scores (own data only)                                    │
│  - Draws (public read, own entries)                          │
│  - Winnings (own data only)                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TRUST LEVEL 2: SUBSCRIBED (Active subscription required)    │
│  - Score entry                                               │
│  - Draw entry                                                │
│  - Charity selection                                         │
│  - Winner proof upload                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TRUST LEVEL 3: ADMIN (Role-based access)                    │
│  - User management                                           │
│  - Draw management                                           │
│  - Winner verification                                       │
│  - Payout processing                                         │
│  - Charity management                                        │
│  - Audit logs                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TRUST LEVEL 4: SYSTEM (Service role, backend only)          │
│  - Database migrations                                       │
│  - Webhook handlers                                          │
│  - Cron jobs                                                 │
│  - Admin scripts                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 DATA FLOW DIAGRAMS

### 1. User Registration Flow
```
User → Register Form → /api/auth/register → Supabase Auth
                                                    ↓
                                            Create Auth User
                                                    ↓
                                            Trigger: handle_new_user()
                                                    ↓
                                            Auto-create Profile (role='user')
                                                    ↓
                                            Send Welcome Email (Resend)
                                                    ↓
                                            Redirect to Onboarding
```

### 2. Subscription Flow
```
User → Select Plan → /api/stripe/checkout → Create Stripe Session
                                                    ↓
                                            Redirect to Stripe Checkout
                                                    ↓
                                            User Completes Payment
                                                    ↓
                                            Stripe Webhook: checkout.session.completed
                                                    ↓
                                            Update Subscription (status='active')
                                                    ↓
                                            Send Confirmation Email
                                                    ↓
                                            Enable Full Access
```

### 3. Score Entry Flow
```
User → Score Form → Server Action (scoreActions.ts)
                                                    ↓
                                            Validate Input (Zod)
                                                    ↓
                                            Check Auth (Supabase)
                                                    ↓
                                            Check Subscription (active)
                                                    ↓
                                            Check Duplicate (user_id + played_date)
                                                    ↓
                                            Insert Score (RLS check)
                                                    ↓
                                            Trigger: update_score_statistics()
                                                    ↓
                                            Return Success
```

### 4. Draw Entry Flow
```
User → Draw Page → /api/draws/enter (POST)
                                                    ↓
                                            Authenticate User
                                                    ↓
                                            Check Eligibility:
                                              - Active subscription?
                                              - Charity selected?
                                              - 5+ scores?
                                                    ↓
                                            Find Active Draw (status='scheduled')
                                                    ↓
                                            Check Existing Entry (unique constraint)
                                                    ↓
                                            Calculate Entry Count:
                                              - Base: 1
                                              - Bonus: +1 if avg < 100
                                              - Bonus: +2 if avg < 80
                                                    ↓
                                            Insert Draw Entries (count times)
                                                    ↓
                                            Return Success
```

### 5. Draw Execution Flow
```
Admin → Admin Panel → /api/admin/run-draw (POST)
                                                    ↓
                                            Verify Admin Role
                                                    ↓
                                            Get Eligible Users (active sub + charity + 5+ scores)
                                                    ↓
                                            Check Minimum Participants (>= 3)
                                                    ↓
                                            For Each User:
                                              - Get entry count
                                              - Add to weighted pool
                                                    ↓
                                            Random Selection (crypto.randomInt):
                                              - Select 1st place (jackpot)
                                              - Select 2nd place
                                              - Select 3rd place
                                              - No duplicates
                                                    ↓
                                            Create Draw Record:
                                              - Calculate prize pool
                                              - Apply charity contributions
                                              - Split: 40/35/25
                                              - Handle jackpot rollover
                                                    ↓
                                            Create Winner Records (match_count)
                                                    ↓
                                            Create Payout Records
                                                    ↓
                                            Create Prize Pool Record
                                                    ↓
                                            Audit Log
                                                    ↓
                                            Send Winner Notifications (Resend)
```

### 6. Charity Contribution Flow
```
Stripe Webhook: invoice.payment_succeeded
                                                    ↓
                                            Get Subscription + User
                                                    ↓
                                            Get User Charity Selection
                                                    ↓
                                            Calculate Contribution:
                                              - Subscription amount
                                              - × contribution_percentage
                                              - Min 10%, max 20%
                                                    ↓
                                            Create Donation Record:
                                              - status: 'pending'
                                              - amount: calculated
                                                    ↓
                                            Batch Process Donations (cron):
                                              - Sum pending donations per charity
                                              - Create Stripe Transfer
                                              - Update status: 'paid'
                                                    ↓
                                            Send Donation Receipt
```

### 7. Winner Verification Flow
```
Winner → Winnings Page → Upload Proof → /api/winners/upload-proof
                                                    ↓
                                            Authenticate User
                                                    ↓
                                            Validate File (type, size)
                                                    ↓
                                            Upload to Supabase Storage (private bucket)
                                                    ↓
                                            Update Winner Record (proof_url)
                                                    ↓
                                            Notify Admin (email)
                                                    ↓
                                                    ↓
Admin → Admin Panel → Review Proof → /api/admin/winners/review
                                                    ↓
                                            Verify Admin Role
                                                    ↓
                                            Update Winner:
                                              - verification_status: 'approved'|'rejected'
                                              - verified_by: admin_id
                                              - verified_at: now()
                                                    ↓
                                            If Approved:
                                              - Update payout status: 'processing'
                                              - Notify Winner
                                                    ↓
                                            If Rejected:
                                              - Notify Winner (reason)
                                                    ↓
                                            Audit Log
```

### 8. Payout Flow
```
Admin → Admin Panel → Process Payout → /api/admin/payouts/mark-paid
                                                    ↓
                                            Verify Admin Role
                                                    ↓
                                            Check Winner Status (approved)
                                                    ↓
                                            Record Payment Details:
                                              - payment_method
                                              - transaction_reference
                                              - status: 'paid'
                                              - paid_at: now()
                                                    ↓
                                            Update Winner (payment_status: 'paid')
                                                    ↓
                                            Send Payout Confirmation
                                                    ↓
                                            Audit Log
```

---

## 🎯 SERVICE BOUNDARIES

### Frontend (Next.js):
**Responsibilities:**
- UI rendering
- Client-side validation
- User interaction
- State management (TanStack Query)
- Routing

**Constraints:**
- Never expose service role keys
- Never modify financial data directly
- All mutations via server actions/API routes
- No sensitive logic in client code

### Backend (Next.js API Routes):
**Responsibilities:**
- Authentication enforcement
- Authorization checks
- Input validation (Zod)
- Business logic orchestration
- Third-party integrations (Stripe, Resend)
- Audit logging

**Constraints:**
- Use supabaseAdmin for privileged operations
- Validate all inputs
- Log all financial actions
- Never trust client input

### Database (Supabase PostgreSQL):
**Responsibilities:**
- Data persistence
- RLS enforcement
- Triggers for auto-calculation
- Data integrity constraints

**Constraints:**
- No client-side bypass of RLS
- Service role only in backend
- Financial tables immutable after write
- All changes audited

### External Services:
**Stripe:**
- Payment processing
- Subscription management
- Webhook verification

**Resend:**
- Transactional emails
- Template rendering

**Supabase Storage:**
- File uploads (proofs, avatars, logos)
- Access control via RLS

---

## 🔄 STRIPE FLOW

### Checkout Session Creation:
```
1. User selects plan (monthly/yearly)
2. Frontend calls /api/stripe/checkout
3. Backend creates Stripe Checkout Session:
   - mode: 'subscription'
   - line_items: price_id × 1
   - metadata: user_id, plan_type
   - success_url: /dashboard?success=true
   - cancel_url: /subscription?canceled=true
4. Return session URL
5. Redirect user to Stripe Checkout
```

### Webhook Events:
```
checkout.session.completed
  → Create/update subscription record
  → Set status: 'active'
  → Send welcome email

customer.subscription.updated
  → Update subscription status
  → Update current_period_end
  → Handle plan changes

customer.subscription.deleted
  → Update status: 'canceled'
  → Retain access until period_end
  → Send cancellation email

invoice.payment_succeeded
  → Update status: 'active'
  → Calculate charity contribution
  → Create donation record
  → Send receipt

invoice.payment_failed
  → Update status: 'past_due'
  → Start 3-day grace period
  → Send payment failed email
  → If retry fails after 3 days: status: 'expired'
```

### Idempotency:
- Store Stripe event ID in webhook_logs table
- Check for duplicates before processing
- Return 200 OK for all processed events
- Retry failed events (Stripe retries for 3 days)

---

## 🎲 DRAW ENGINE FLOW

### Monthly Cycle:
```
1. Cron Job (last day of month, 23:59 UTC):
   → Check for scheduled draws
   → Update status: 'running'
   → Trigger /api/admin/run-draw

2. Draw Execution:
   → Get eligible users
   → Calculate entry weights
   → Random selection (crypto-secure)
   → Create draw record
   → Create winners
   → Calculate prize pool
   → Update status: 'completed'

3. Post-Draw:
   → Send winner notifications
   → Update leaderboard
   → Archive draw data
```

### Eligibility Calculation:
```sql
SELECT user_id FROM subscriptions s
INNER JOIN user_charities uc ON s.user_id = uc.user_id
INNER JOIN scores sc ON s.user_id = sc.user_id
WHERE s.status = 'active'
  AND s.current_period_end > now()
GROUP BY s.user_id
HAVING COUNT(sc.id) >= 5
```

### Entry Weight Calculation:
```typescript
function calculateEntryWeight(userId: string): number {
  const baseEntries = 1
  
  const avg = getRollingAverage(userId)
  if (avg < 80) return baseEntries + 2  // 3 total
  if (avg < 100) return baseEntries + 1 // 2 total
  return baseEntries                     // 1 total
}
```

### Prize Pool Calculation:
```typescript
function calculatePrizePool(drawId: string): PrizePool {
  const totalRevenue = getDrawRevenue(drawId)
  const totalCharity = getCharityContributions(drawId)
  const remainingPool = totalRevenue - totalCharity
  
  // Split: 40% jackpot, 35% second, 25% third
  const jackpot = Math.floor(remainingPool * 0.40 * 100) / 100
  const second = Math.floor(remainingPool * 0.35 * 100) / 100
  const third = Math.floor(remainingPool * 0.25 * 100) / 100
  
  // Remainder goes to rollover
  const rollover = remainingPool - jackpot - second - third
  
  return { jackpot, second, third, rollover }
}
```

### Winner Selection:
```typescript
function selectWinners(eligibleUsers: User[]): Winner[] {
  // Build weighted pool
  const pool: string[] = []
  eligibleUsers.forEach(user => {
    const weight = calculateEntryWeight(user.id)
    for (let i = 0; i < weight; i++) {
      pool.push(user.id)
    }
  })
  
  // Shuffle using crypto-secure random
  const shuffled = shuffleSecure(pool)
  
  // Select unique winners
  const winners = []
  const selected = new Set<string>()
  
  for (const userId of shuffled) {
    if (!selected.has(userId)) {
      selected.add(userId)
      winners.push(userId)
      if (winners.length === 3) break
    }
  }
  
  return winners
}
```

---

## 🎨 CHARITY FLOW

### Charity Selection:
```
1. User browses charity directory (public)
2. User selects charity (onboarding or settings)
3. System sets contribution % (default 10%, max 20%)
4. Record in user_charities table
5. Apply to next subscription payment
```

### Contribution Calculation:
```
Monthly Subscription: £10
User Contribution: 15%
Charity Amount: £10 × 0.15 = £1.50
Platform Keeps: £10 - £1.50 = £8.50

Annual Subscription: £100
User Contribution: 10%
Charity Amount: £100 × 0.10 = £10.00
Platform Keeps: £100 - £10.00 = £90.00
```

### Donation Processing:
```
1. Stripe webhook: invoice.payment_succeeded
2. Calculate contribution amount
3. Create donation record (status: 'pending')
4. Batch process (daily cron):
   - Sum pending donations per charity
   - Transfer via Stripe Connect
   - Update status: 'paid'
5. Send donation receipt to user
```

---

## ⚠️ THREAT MODEL

### Identified Threats:

#### 1. **Authentication Bypass**
- **Threat:** Attacker bypasses auth to access protected routes
- **Mitigation:**
  - Middleware enforces auth on all protected routes
  - RLS prevents unauthorized data access
  - API routes verify JWT tokens
  - Admin routes verify role

#### 2. **Authorization Escalation**
- **Threat:** Regular user gains admin privileges
- **Mitigation:**
  - Role stored in database (profiles.role)
  - Admin checks on every admin route
  - RLS policies use is_admin() function
  - Audit log all role changes

#### 3. **Financial Fraud**
- **Threat:** Manipulate prize pools, subscriptions, or payouts
- **Mitigation:**
  - Financial tables immutable after write
  - All changes require webhook verification
  - Audit log all financial actions
  - Admin actions require 2FA (future)
  - Payout limits and verification

#### 4. **Draw Rigging**
- **Threat:** Manipulate winner selection
- **Mitigation:**
  - Use crypto.randomInt() (not Math.random())
  - Selection logic in backend only
  - Audit log all draw executions
  - Public verification of draw results
  - Weighted entries transparent

#### 5. **Score Manipulation**
- **Threat:** Submit fake scores to gain entry advantage
- **Mitigation:**
  - One score per user per date (DB constraint)
  - Range validation (1-45)
  - No edit/update (delete and re-add)
  - Future dates blocked
  - Admin can review suspicious patterns

#### 6. **Payment Bypass**
- **Threat:** Access paid features without subscription
- **Mitigation:**
  - Middleware checks subscription status
  - API routes verify active subscription
  - Grace period enforced (3 days)
  - Stripe webhook as source of truth
  - RLS prevents unauthorized access

#### 7. **Data Exfiltration**
- **Threat:** Access other users' data
- **Mitigation:**
  - RLS on all tables
  - User-scoped queries (user_id = auth.uid())
  - No client-side data aggregation
  - Service role never exposed

#### 8. **File Upload Attacks**
- **Threat:** Upload malicious files
- **Mitigation:**
  - MIME type validation
  - File extension whitelist
  - Size limit (5MB)
  - Private storage bucket
  - Admin-only access to proofs
  - Virus scanning (future: Cloudflare)

#### 9. **Webhook Spoofing**
- **Threat:** Fake Stripe webhooks
- **Mitigation:**
  - Verify Stripe signature
  - Use webhook secret
  - Idempotency checks
  - Log all webhook events

#### 10. **DDoS/Abuse**
- **Threat:** Overwhelm API with requests
- **Mitigation:**
  - Vercel Edge Network (DDoS protection)
  - Rate limiting (100 req/15min)
  - IP blocking for abuse
  - CAPTCHA on sensitive endpoints (future)

---

## 🌐 SERVER/CLIENT SEPARATION RULES

### Client-Side (Browser):
✅ **Allowed:**
- UI rendering
- Client-side validation (UX only)
- TanStack Query for data fetching
- Form inputs and navigation
- Display public data

❌ **Forbidden:**
- Service role keys
- Financial calculations
- Winner selection logic
- Subscription status checks (for authorization)
- Direct database mutations
- Sensitive business logic

### Server-Side (API Routes/Server Actions):
✅ **Allowed:**
- Authentication/authorization
- Input validation (Zod)
- Business logic
- Database mutations
- Third-party API calls
- File uploads
- Audit logging

❌ **Forbidden:**
- Exposing service role to client
- Trusting client input
- Skipping validation
- Bypassing RLS

---

## 📊 SCALABILITY CONSIDERATIONS

### Current Scale (0-10k users):
- Single Supabase project
- Vercel deployment
- Stripe for payments
- Resend for email

### Future Scale (10k-100k users):
- Supabase read replicas
- Redis caching (Vercel Edge Config)
- Queue system for batch operations (donations)
- CDN for static assets
- Database partitioning by user_id

### Future Scale (100k+ users):
- Multi-region Supabase
- Dedicated Stripe Connect
- Email service migration (SendGrid)
- Microservices for draw engine
- Real-time notifications (Pusher/Ably)

---

## ✅ PHASE 1 COMPLETE

**System architecture documented with:**
- ✅ Full architecture diagram
- ✅ Service boundaries defined
- ✅ Data flows documented
- ✅ Security boundaries established
- ✅ Stripe flow detailed
- ✅ Draw engine flow designed
- ✅ Charity flow defined
- ✅ Threat model complete
- ✅ Trust boundaries established
- ✅ Server/client separation rules

**Ready to proceed to PHASE 2: Database Design**