# PHASE 0: REQUIREMENTS VERIFICATION
## Golf Charity Draw Platform

---

## 📋 EXISTING CODEBASE ANALYSIS

### What Exists:
- ✅ Basic Next.js project structure
- ✅ Partial database schema (multiple conflicting migrations)
- ✅ Supabase client setup
- ✅ Basic Stripe checkout webhook (incomplete)
- ✅ Basic auth middleware
- ✅ Some API routes (scores, draws, admin)
- ✅ TypeScript types (conflicting with actual schema)
- ✅ Some frontend components

### Critical Issues Found:
- ❌ Schema conflicts between migrations 010, 011, 012, 013
- ❌ Column name mismatches (`score` vs `score_value`, `played_date` vs `score_date`)
- ❌ Missing `match_count` column in winners table
- ❌ Missing `prize_pools` proper schema
- ❌ No `donations` table implementation
- ❌ No email system (only placeholder)
- ❌ No tests
- ❌ Hardcoded prize amounts in draw engine
- ❌ No monthly cycle system
- ❌ No jackpot rollover logic
- ❌ No score-based frequency logic
- ❌ No charity contribution calculation
- ❌ No proper prize pool allocation (40/35/25)

---

## ❓ MISSING/AMBIGUOUS REQUIREMENTS

### 1. **Draw Frequency & Timing**
**Question:** How often should draws run?
- **Assumption:** Monthly draws on the last day of each month
- **Decision:** Automated monthly cycle with admin override capability

### 2. **Score-Based Frequency Logic**
**Question:** The spec mentions "score-based frequency logic" but doesn't define it.
- **Assumption:** Users with better scores (lower = better in golf) get bonus entries
- **Decision:** 
  - Base entry: 1 entry per eligible user
  - Bonus entries based on rolling average:
    - Average < 80: +2 entries (3 total)
    - Average 80-100: +1 entry (2 total)
    - Average > 100: no bonus (1 total)

### 3. **Jackpot Rollover Rules**
**Question:** When does jackpot roll over?
- **Assumption:** If no 5-match winner, jackpot rolls to next month
- **Decision:** 
  - 5-match winners get jackpot portion
  - If no 5-match winners, jackpot_amount rolls to next draw's jackpot
  - 4-match and 3-match prizes are always paid from current pool

### 4. **Prize Pool Allocation**
**Question:** The spec says "5-match: 40%, 4-match: 35%, 3-match: 25%" but doesn't specify if this is of total pool or after charity.
- **Assumption:** Allocation is from remaining pool AFTER charity contributions
- **Decision:**
  - Total subscription revenue collected in draw period
  - Subtract charity contributions (user-selected %, min 10%)
  - Remaining pool split: 40% jackpot, 35% second, 25% third
  - Rounding: Round down to nearest £0.01, remainder goes to rollover

### 5. **Charity Contribution Timing**
**Question:** When are charity contributions collected?
- **Assumption:** At subscription payment time (monthly/annual)
- **Decision:** Contributions calculated and recorded when Stripe payment succeeds

### 6. **Winner Selection Algorithm**
**Question:** "Random + algorithmic mode" - what does this mean?
- **Assumption:** Cryptographically secure random selection weighted by entry count
- **Decision:** 
  - Each user gets entries based on eligibility + score bonuses
  - Use `crypto.randomInt()` for secure random selection
  - No duplicate winners in same draw
  - Previous winners can win again (no exclusion)

### 7. **Score Editing/Deletion**
**Question:** Can users edit/delete scores?
- **Assumption:** Yes, but with restrictions
- **Decision:**
  - Users can delete their own scores
  - Editing not allowed (must delete and re-add)
  - Deleting a score triggers recalculation of rolling average
  - If deletion causes score count < 5, user loses draw eligibility until they add another

### 8. **Subscription Grace Period**
**Question:** What happens when payment fails?
- **Assumption:** 3-day grace period before access restriction
- **Decision:**
  - `past_due` status for 3 days
  - User retains access during grace period
  - After 3 days: `expired` status, access revoked
  - Successful payment within grace period returns to `active`

### 9. **File Upload Security**
**Question:** What file types allowed for winner proof?
- **Assumption:** Images and PDFs only
- **Decision:**
  - Allowed: `.jpg`, `.jpeg`, `.png`, `.pdf`
  - Max size: 5MB
  - Scan for malware (Supabase Storage + Cloudflare if available)
  - Store in private bucket, admin-only access

### 10. **Payout Methods**
**Question:** How are winners paid?
- **Assumption:** Bank transfer (UK) or PayPal
- **Decision:**
  - Winners provide payment details after verification
  - Admin processes payout manually via bank transfer
  - Payout status: pending → processing → paid
  - 30-day window to claim, otherwise forfeited to charity

### 11. **Draw Entry Limits**
**Question:** Can users enter multiple times?
- **Assumption:** One entry per user per draw
- **Decision:** Unique constraint on (draw_id, user_id)

### 12. **Minimum Subscription Period**
**Question:** Can users cancel immediately?
- **Assumption:** Yes, but access continues until period end
- **Decision:**
  - Cancellation allowed anytime
  - Access continues until `current_period_end`
  - No refunds for partial months

---

## 🎯 DEFAULT BUSINESS RULES

### Subscription Rules:
1. Monthly: £10/month, Yearly: £100/year
2. Minimum charity contribution: 10%
3. Maximum charity contribution: 20%
4. Contribution can be changed anytime (affects next payment)
5. Trial period: None (paid from day 1)

### Draw Rules:
1. Draws run on last day of each month at 23:59 UTC
2. Eligibility: Active subscription + charity selected + 5+ scores
3. One entry per user per draw
4. Winners notified via email within 24 hours
5. Winners have 7 days to upload proof
6. Winners have 30 days to provide payment details

### Score Rules:
1. Valid range: 1-45 (golf strokes)
2. One score per user per date
3. Unlimited history stored
4. Rolling average: last 5 scores only
5. Future dates not allowed
6. Scores can be deleted (FIFO if > 5 scores)

### Charity Rules:
1. Minimum 10% contribution enforced
2. Users select one charity at a time
3. Charity selection can be changed monthly
4. Contributions paid to charities monthly (net of fees)

### Winner Rules:
1. Winners must upload proof within 7 days
2. Winners must provide payment details within 30 days
3. Unclaimed prizes forfeited to charity after 30 days
4. Winners can be rejected for fraud (no payout, entry revoked)

---

## ⚠️ EDGE CASES

### Identified Edge Cases:
1. **User deletes score after draw entry:** Entry remains valid, but if score count drops below 5, user ineligible for next draw
2. **Subscription cancels during draw period:** User retains entry, but ineligible for next draw
3. **Multiple winners fail to upload proof:** All unclaimed prizes go to charity
4. **Draw has < 3 eligible users:** Draw postponed until minimum met
5. **Stripe webhook fails:** Retry logic with idempotency keys
6. **Concurrent score submissions:** Database unique constraint prevents duplicates
7. **Time zone differences:** All times in UTC, dates in user's local time (stored as date only)
8. **Prize pool rounding:** Remainder from rounding goes to rollover/jackpot

---

## 🔒 SECURITY RULES

### Financial Data Protection:
1. All financial transactions logged in audit_logs
2. Prize pools immutable once draw completed
3. Subscription status changes require webhook verification
4. Payout amounts cannot be modified after processing starts

### Data Validation:
1. All API inputs validated with Zod schemas
2. SQL injection prevented via parameterized queries (Supabase client)
3. XSS prevented via React auto-escaping + CSP headers
4. CSRF protection via Next.js built-in + Supabase auth

### Access Control:
1. RLS enforced on all tables
2. Service role key never exposed to client
3. Admin actions require role verification + audit logging
4. File uploads restricted by MIME type + size

---

## 📊 FINAL DECISIONS

### Schema Decisions:
1. **Use migration 010 as base** (more complete)
2. **Add missing columns** from 013 that are needed
3. **Standardize column names:** Use `score` not `score_value`, `played_date` not `score_date`
4. **Add `match_count` column** to winners table
5. **Add `donations` table** for charity contribution tracking
6. **Add `prize_pool_allocations` table** for detailed breakdown

### Business Logic Decisions:
1. Draws: Monthly, automated, last day of month
2. Eligibility: Active sub + charity + 5+ scores
3. Entries: 1 base + score-based bonuses (max 3)
4. Prize split: 40/35/25 of post-charity pool
5. Jackpot: Rolls over if no 5-match winner
6. Grace period: 3 days for failed payments
7. Proof window: 7 days to upload, 30 days to claim

### Technical Decisions:
1. **Random selection:** `crypto.randomInt()` for cryptographic security
2. **Webhook handling:** Idempotent with Stripe event IDs
3. **Email:** Resend API with React Email templates
4. **File storage:** Supabase Storage with private bucket for proofs
5. **Rate limiting:** 100 requests/15min per user on sensitive endpoints

---

## ✅ PHASE 0 COMPLETE

All requirements documented, ambiguities resolved, business rules defined.

**Ready to proceed to PHASE 1: System Architecture**