# Debug Login Issues

## Problem: "Invalid login credentials"

This error means the email/password combination is not recognized by Supabase Auth.

## Quick Diagnostic

### Step 1: Check if admin account exists
```bash
npx tsx scripts/check-admin.ts
```

This will tell you:
- ✅ If user exists in Supabase Auth
- ✅ If profile exists in database
- ✅ If role is set to admin
- ❌ What's missing if anything

### Step 2: Common Issues & Fixes

#### Issue 1: Admin account was never created
**Symptoms:** Script says "Admin user NOT found"

**Fix:**
```bash
npx tsx scripts/create-admin.ts
```

#### Issue 2: User exists but email not confirmed
**Symptoms:** Script shows "Email confirmed: No"

**Fix:** 
1. Go to Supabase Dashboard → Authentication → Users
2. Find user: digitalheros1@gmail.com
3. Click "..." menu → "Confirm email"
4. Try logging in again

OR manually confirm via SQL:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'digitalheros1@gmail.com';
```

#### Issue 3: Profile doesn't exist
**Symptoms:** Script says "Profile NOT found in database"

**Fix:**
```bash
# Delete the broken user and recreate
npx tsx scripts/create-admin.ts
# The script will handle cleanup automatically
```

#### Issue 4: Wrong password
**Symptoms:** User exists, email confirmed, but still can't login

**Fix:** Reset password via Supabase Dashboard:
1. Go to Supabase Dashboard → Authentication → Users
2. Find user: digitalheros1@gmail.com
3. Click "..." menu → "Reset password"
4. Enter new password: `digitalheros@prd`
5. Try logging in again

OR reset via script:
```bash
# Edit scripts/create-admin.ts and change the password
# Then run it again - it will update the existing user
```

#### Issue 5: Supabase credentials wrong
**Symptoms:** Script fails with "Invalid credentials" or "Module not found"

**Fix:** Check `.env` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from: Supabase Dashboard → Settings → API

## Step-by-Step Fix

### Option A: Fresh Start (Recommended)

```bash
# 1. Delete existing admin (if any)
# Go to Supabase Dashboard → Authentication → Users
# Delete: digitalheros1@gmail.com

# 2. Run creation script
npx tsx scripts/create-admin.ts

# 3. Verify it worked
npx tsx scripts/check-admin.ts

# 4. Try logging in
# Go to http://localhost:3002/login
# Email: digitalheros1@gmail.com
# Password: digitalheros@prd
```

### Option B: Fix Existing Account

```bash
# 1. Check current status
npx tsx scripts/check-admin.ts

# 2. If user exists but not confirmed:
# Go to Supabase Dashboard → confirm email manually

# 3. If profile missing or role wrong:
npx tsx scripts/create-admin.ts
# This will update the existing user

# 4. If password wrong:
# Reset via Supabase Dashboard or recreate with script
```

## Manual Verification

### Check in Supabase Dashboard

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select your project

2. **Check Authentication → Users**
   - Look for: digitalheros1@gmail.com
   - Verify: Email confirmed = ✓
   - Verify: Created date is recent

3. **Check Database → profiles**
   - Look for row with email = digitalheros1@gmail.com
   - Verify: role = 'admin'
   - Verify: id matches auth user ID

4. **Check Table Editor**
   - Table: profiles
   - Filter: email = digitalheros1@gmail.com
   - Should show: role = admin

## Test Login Manually

### Using curl:
```bash
# Test login API directly
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "digitalheros1@gmail.com",
    "password": "digitalheros@prd"
  }'
```

Expected response:
```json
{
  "success": true,
  "user": { ... },
  "session": { ... }
}
```

### Using browser:
1. Open http://localhost:3002/login
2. Open DevTools (F12) → Network tab
3. Fill in credentials and submit
4. Check the login request:
   - Status should be 200
   - Response should have `success: true`
   - Check for any error messages

## Common Error Messages

### "Invalid login credentials"
- **Cause**: Wrong password OR email not confirmed
- **Fix**: Reset password OR confirm email

### "Email not confirmed"
- **Cause**: User signed up but didn't verify email
- **Fix**: Confirm email in Supabase Dashboard

### "User not found"
- **Cause**: User was never created
- **Fix**: Run `npx tsx scripts/create-admin.ts`

### "Profile not found"
- **Cause**: Auth user exists but no profile record
- **Fix**: Run `npx tsx scripts/create-admin.ts` again

## Quick Fix Checklist

- [ ] Run `npx tsx scripts/check-admin.ts` to diagnose
- [ ] If user missing: Run `npx tsx scripts/create-admin.ts`
- [ ] If email not confirmed: Confirm in Supabase Dashboard
- [ ] If profile missing: Run create script again
- [ ] If role not admin: Run create script (will update)
- [ ] If password wrong: Reset in Supabase Dashboard
- [ ] Clear browser cookies
- [ ] Try incognito mode
- [ ] Try login again

## Still Not Working?

### Check server logs:
```bash
# In terminal running npm run dev
# Look for login attempts and errors
```

### Check Supabase logs:
1. Supabase Dashboard → Logs → Auth Logs
2. Look for failed login attempts
3. Check error messages

### Verify environment:
```bash
# Make sure .env has correct values
cat .env | grep SUPABASE

# Should show:
# NEXT_PUBLIC_SUPABASE_URL=https://...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Emergency: Create New Admin

If nothing works, start fresh:

```bash
# 1. Delete old user from Supabase Dashboard
# Authentication → Users → Delete digitalheros1@gmail.com

# 2. Create new admin
npx tsx scripts/create-admin.ts

# 3. Verify
npx tsx scripts/check-admin.ts

# 4. Login with NEW credentials shown in output
```

---

**Most likely fix**: Run `npx tsx scripts/check-admin.ts` to see what's wrong, then follow the specific fix for your issue.