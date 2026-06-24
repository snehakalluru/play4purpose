# Admin Account Setup

## Quick Setup

### Step 1: Install tsx (if not already installed)
```bash
npm install -g tsx
```

### Step 2: Run the admin creation script
```bash
npx tsx scripts/create-admin.ts
```

### Step 3: Verify output
You should see:
```
✅ ADMIN ACCOUNT CREATED SUCCESSFULLY

Login credentials:
  Email:     digitalheros1@gmail.com
  Password:  digitalheros@prd
  User ID:   <uuid>
  Role:      admin

Login at: http://localhost:3000/login
```

### Step 4: Login
1. Go to http://localhost:3000/login
2. Enter email: `digitalheros1@gmail.com`
3. Enter password: `digitalheros@prd`
4. You'll be redirected to the admin dashboard at http://localhost:3000/admin

## ⚠️ Security Notes

1. **DELETE THIS SCRIPT AFTER USE** - It contains plaintext credentials
2. **Change the password** after first login
3. **Enable 2FA** on the admin account (Supabase Dashboard → Authentication → Users)
4. **Never commit** this script to version control

## 🔧 Troubleshooting

### Error: "User already registered"
This is fine! The script will automatically assign admin role to the existing user.

### Error: "Module not found"
Make sure you're in the project root directory and have installed dependencies:
```bash
npm install
```

### Error: "Invalid credentials"
Check that your Supabase credentials are correct in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📋 What This Script Does

1. Creates a new auth user in Supabase (or updates existing user)
2. Creates/updates profile with `role: 'admin'`
3. Auto-confirms the email
4. Outputs login credentials

## 🗑️ Cleanup

After creating the admin account, **DELETE THE SCRIPT**:
```bash
rm scripts/create-admin.ts
```

Or at minimum, remove the credentials from the file.