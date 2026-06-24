# TODO - Production Audit & Completion

## Phase 1 - System Understanding
- [x] Inspect auth/subscription/stripe/admin middleware and key API routes
- [x] Inspect winner proof upload route + admin utility
- [ ] Inspect remaining API routes: scores, draws, winnings, admin winners/payout/review/run-draw
- [ ] Inspect frontend pages/components for messaging and empty states
- [ ] Inspect Supabase migrations & policies relevant to runtime queries


## Phase 2 - User Flow Testing
- [ ] Registration: validate DB inserts + error paths + UI messages
- [ ] Login: validate wrong credentials + verify email requirement + UI messages
- [ ] Dashboard: verify data loading and fallback UI
- [ ] Subscription: checkout redirect, success/cancel handling, webhook updates, access gates

## Phase 3 - Admin Flow Testing
- [ ] Admin route blocking for non-admin
- [ ] Admin dashboard data loading
- [ ] Admin actions: create/update/delete charities (if applicable), manage users, monitor transactions

## Phase 4 - Security Audit
- [ ] Verify RLS ownership boundaries for all user-scoped tables
- [ ] Verify server endpoints never expose secrets
- [ ] Verify all routes enforce auth + ownership/role checks

## Phase 5 - Edge Case Testing
- [ ] Empty/invalid input handling across forms
- [ ] Network failures & timeout behavior
- [ ] Payment failure and expired session behavior

## Phase 6 - Bug Fixing
- [ ] Fix console/API/UI failures found during tests

## Phase 7 - User Feedback (UX)
- [ ] Ensure every action has success/error toast or inline feedback with required copy

## Phase 8 - Performance Optimization
- [ ] Remove unnecessary re-renders, lazy load, optimize API calls/images

## Phase 9 - Production Readiness
- [ ] Validate env vars usage (no hardcoded keys)
- [ ] Ensure `next build` and typecheck pass with no warnings
- [x] Run existing tests (vitest)

- [ ] Confirm deployment routing readiness (Vercel/Netlify)
- [ ] Verify logging strategy (no sensitive data)

## Phase 10 - Final Report
- [ ] Produce final audit report: % completion, bugs fixed, security issues fixed, missing features, and production-ready statement

