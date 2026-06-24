# Admin Account Setup - Quick Start

## Create Admin Account

### Prerequisites
- Dev server running: `npm run dev`
- Supabase credentials configured in `.env`

### Step 1: Run the script
```bash
npx tsx scripts/create-admin.ts
```

### Step 2: Expected output
```
Creating admin account...
Email: digitalheros1@gmail.com

1. Creating auth user...
✅ Auth user created: <user-id>
2. Creating profile with admin role...
✅ Admin profile created!

═══════════════════════════════════════════
✅ ADMIN ACCOUNT CREATED SUCCESSFULLY
═══════════════════════════════════════════

Login credentials:
  Email:     digitalheros1@gmail.com
  Password:  digitalheros@prd
  User ID:   <uuid>
  Role:      admin

Login at: http://localhost:3000/login

⚠️  IMPORTANT: Delete this script after use!
```

### Step 3: Login
1. Navigate to http://localhost:3000/login
2. Enter credentials:
   - **Email**: `digitalheros1@gmail.com`
   - **Password**: `digitalheros@prd`
3. You'll be redirected to `/dashboard`
4. Access admin panel at http://localhost:3000/admin

## If User Already Exists

The script handles this automatically:
```
⚠️  User already exists. Attempting to update role...
✅ Admin role assigned to existing user!
```

## Security Checklist

- [ ] Admin account created successfully
- [ ] Can login at http://localhost:3000/login
- [ ] Can access admin panel at http://localhost:3000/admin
- [ ] **DELETE** `scripts/create-admin.ts` after use
- [ ] Change default password in production
- [ ] Enable 2FA in Supabase Dashboard

## Troubleshooting

### Script fails with "Module not found"
```bash
npm install
npx tsx scripts/create-admin.ts
```

### Script fails with "Invalid credentials"
Check `.env` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Can't access /admin
- Verify profile has `role: 'admin'` in Supabase Dashboard → Database → profiles
- Check middleware is working (should redirect non-admins)
- Clear browser cookies and login again

## What Gets Created

1. **Auth User** (Supabase Auth)
   - Email: digitalheros1@gmail.com
   - Password: digitalheros@prd
   - Email confirmed: true

2. **Profile** (profiles table)
   - id: <same as auth user>
   - email: digitalheros1@gmail.com
   - full_name: Admin User
   - role: admin

## Next Steps After Setup

1. **Test admin features**:
   - View users at /admin
   - Run a test draw
   - Review winner management

2. **Create test users**:
   - Register normally at /register
   - Test subscription flow
   - Test score entry
   - Test draw entry

3. **Configure production**:
   - Change admin password
   - Enable email verification
   - Set up Stripe webhooks
   - Deploy to Vercel

---

**Status**: Ready to create admin account