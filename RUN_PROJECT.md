# Running Play4Purpose - Quick Start Guide

## ✅ Server Status

The development server is **RUNNING** on:
- **Local**: http://localhost:3002
- **Network**: http://10.87.116.9:3002

## 🚀 Access the Application

### Open in Browser
```
http://localhost:3002
```

## 📋 Complete Setup Checklist

### 1. Database Setup (REQUIRED - Do This First!)

#### Run Migrations in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Run these migrations **IN ORDER**:

```sql
-- Migration 1: Full schema
-- Copy content from: supabase/migrations/010_full_schema.sql
-- Paste and run in SQL Editor
```

```sql
-- Migration 2: Fix schema
-- Copy content from: supabase/migrations/011_fix_schema.sql
-- Paste and run in SQL Editor
```

```sql
-- Migration 3: Admin system
-- Copy content from: supabase/migrations/012_admin_system.sql
-- Paste and run in SQL Editor
```

### 2. Disable Email Confirmation

1. In Supabase Dashboard, go to **Authentication → Settings**
2. Find **Email Auth** section
3. **UNCHECK** "Confirm email" option
4. Save changes

This allows instant login without email verification.

### 3. Create Admin Account

Open a new terminal and run:

```bash
npx tsx scripts/fix-login.ts
```

Expected output:
```
✅ LOGIN FIX COMPLETE

Login credentials:
  Email:     digitalheros1@gmail.com
  Password:  digitalheros@prd
```

### 4. Seed Test Data (Optional but Recommended)

```bash
npx tsx scripts/seed-data.ts
```

This creates:
- 3 test users (player1@test.com, player2@test.com, player3@test.com)
- Sample scores for each user
- 1 open draw

### 5. Access the Application

Open your browser and go to:
```
http://localhost:3002
```

## 🧪 Testing the Application

### Test 1: User Signup (No Email Confirmation)

1. Go to http://localhost:3002/register
2. Fill in the form:
   - Full Name: Test User
   - Email: test@example.com
   - Password: Test123456
   - Confirm Password: Test123456
3. Click "Create account"
4. **Should redirect to login immediately** (no email check)

### Test 2: User Login

1. Go to http://localhost:3002/login
2. Enter credentials:
   - Email: test@example.com
   - Password: Test123456
3. Click "Sign in"
4. **Should redirect to /dashboard**

### Test 3: Submit Scores

1. Login as any user
2. Go to http://localhost:3002/scores
3. Fill in score form:
   - Score: 85
   - Date: (today's date)
4. Click "Add Score"
5. **Should appear in score history**

### Test 4: Admin Access

1. Go to http://localhost:3002/login
2. Login as admin:
   - Email: digitalheros1@gmail.com
   - Password: digitalheros@prd
3. Go to http://localhost:3002/admin
4. **Should see admin dashboard with:**
   - User statistics
   - Draw management
   - Winners list
   - Payouts

### Test 5: Run Draw (Admin)

1. Login as admin
2. Go to http://localhost:3002/admin
3. Scroll to "Draws" section
4. Click "Run New Draw" button
5. Confirm the action
6. **Should create a new draw with 3 winners**

### Test 6: View Winnings (User)

1. Login as a regular user (e.g., player1@test.com)
2. Go to http://localhost:3002/winnings
3. **Should see any winnings from draws**

## 🔍 Troubleshooting

### Server Not Running
```bash
# Start the server
npm run dev

# Should show:
# - Local: http://localhost:3002
# - Ready in 2.9s
```

### Can't Login
```bash
# Check if admin exists
npx tsx scripts/check-admin.ts

# Fix if needed
npx tsx scripts/fix-login.ts
```

### Database Errors
1. Check Supabase Dashboard → Table Editor
2. Verify tables exist: profiles, scores, draws, winners, payouts
3. Check RLS policies are enabled

### Port Already in Use
The server automatically uses port 3002 if 3000 is busy. Access at:
```
http://localhost:3002
```

## 📊 What's Working

### User Features
- ✅ Signup (instant, no email confirmation)
- ✅ Login
- ✅ Dashboard with real data
- ✅ Submit scores
- ✅ View score history
- ✅ View winnings

### Admin Features
- ✅ View all users
- ✅ Change user roles
- ✅ View all draws
- ✅ Run draws (randomly select winners)
- ✅ View winners
- ✅ Mark payouts as paid

### Database
- ✅ Auto-create profile on signup
- ✅ RLS policies enforced
- ✅ Audit logs for admin actions
- ✅ Sample data available

## 🎯 Next Steps

1. **Test the full flow**:
   - Signup → Login → Submit Scores → Admin Runs Draw → View Winnings

2. **Customize the app**:
   - Add charities in Supabase Dashboard
   - Adjust prize amounts
   - Modify styling in `app/globals.css`

3. **Deploy to production**:
   - Push to GitHub
   - Deploy to Vercel
   - Update environment variables
   - Run migrations on production database

## 📝 Important Notes

- **No email verification** - Users can login immediately after signup
- **Admin credentials**: digitalheros1@gmail.com / digitalheros@prd
- **Test users**: player1@test.com / Test123456 (if seeded)
- **Database**: Supabase PostgreSQL with RLS
- **Port**: Running on 3002 (not 3000)

## 🆘 Getting Help

If something doesn't work:

1. Check server logs in the terminal
2. Check Supabase Dashboard → Logs
3. Verify migrations were run
4. Verify email confirmation is disabled
5. Run `npx tsx scripts/check-admin.ts` to verify admin account

---

**The application is now running at http://localhost:3002**