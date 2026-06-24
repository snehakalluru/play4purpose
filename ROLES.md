# User Roles & Permissions

## Role Definitions

### 1. Public Visitor (Unauthenticated)
**Role Value**: `null` or `guest`

**Can Do**:
- ✅ View homepage and platform concept
- ✅ Explore listed charities (public read)
- ✅ Understand draw mechanics (view draws)
- ✅ Initiate subscription (view plans)
- ✅ Register for an account
- ✅ Login

**Cannot Do**:
- ❌ Access dashboard
- ❌ Submit scores
- ❌ Enter draws
- ❌ View winnings
- ❌ Access admin panel

---

### 2. Registered Subscriber
**Role Value**: `user`

**Can Do**:
- ✅ Manage profile & settings
- ✅ Enter / edit golf scores (own scores only)
- ✅ Select charity recipient
- ✅ View participation & winnings (own only)
- ✅ Upload winner proof
- ✅ View draws
- ✅ Enter draws (if eligible)
- ✅ View subscription status

**Cannot Do**:
- ❌ Access admin panel
- ❌ Manage other users
- ❌ Run draws
- ❌ Verify winners
- ❌ Access reports/analytics

**Requirements for Draw Entry**:
- Active subscription
- Charity selected
- At least 5 scores submitted

---

### 3. Administrator
**Role Value**: `admin`

**Can Do**:
- ✅ Manage users & subscriptions
- ✅ Configure & run draws
- ✅ Manage charity listings
- ✅ Verify winners & payouts
- ✅ Access reports & analytics
- ✅ Full access to all features

**Cannot Do**:
- ❌ (No restrictions - full access)

---

## Implementation

### Database Schema
```sql
-- In profiles table
role TEXT DEFAULT 'user'
-- Values: 'user', 'admin'
```

### RLS Policies

#### Public (No Auth)
```sql
-- Charities: Public read
CREATE POLICY "Charities are public read" ON charities
  FOR SELECT USING (true);

-- Draws: Public read
CREATE POLICY "Draws are public read" ON draws
  FOR SELECT USING (true);
```

#### Registered Users (auth.uid() = user_id)
```sql
-- Profiles: Own data only
CREATE POLICY "profiles_owner_or_admin" ON profiles
  FOR ALL USING (auth.uid() = id OR is_admin(auth.uid()));

-- Scores: Own scores only
CREATE POLICY "scores_owner_or_admin" ON scores
  FOR ALL USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Winners: Own winnings only
CREATE POLICY "winners_select_owner_or_admin" ON winners
  FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));
```

#### Admins (role = 'admin')
```sql
-- Full access to everything
CREATE POLICY "Admins have full access" ON [table]
  FOR ALL USING (exists (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));
```

### Middleware Protection

#### Public Routes (No Auth Required)
- `/` - Homepage
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset
- `/reset-password` - Reset password

#### Protected Routes (Auth Required)
- `/dashboard` - User dashboard
- `/scores` - Score management
- `/draws` - View draws
- `/winnings` - View winnings
- `/onboarding/*` - Onboarding flow

#### Admin Routes (Admin Role Required)
- `/admin` - Admin dashboard
- `/api/admin/*` - Admin API routes

### API Route Protection

All admin API routes verify role:
```typescript
// Verify admin role
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('role')
  .eq('id', userResp.user.id)
  .single()

if (!profile || profile.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## Role Assignment

### Default Role
- New users get `role = 'user'` by default
- Set via auto-create trigger on signup

### Promote to Admin
Two methods:

#### Method 1: Script (Development)
```bash
npx tsx scripts/fix-login.ts
# Sets digitalheros1@gmail.com as admin
```

#### Method 2: Direct Database (Production)
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

### Check User Role
```typescript
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('role')
  .eq('id', userId)
  .single()

const isAdmin = profile?.role === 'admin'
```

---

## Feature Access Matrix

| Feature | Public | Subscriber | Admin |
|---------|--------|------------|-------|
| View Homepage | ✅ | ✅ | ✅ |
| View Charities | ✅ | ✅ | ✅ |
| View Draws | ✅ | ✅ | ✅ |
| Register/Login | ✅ | ✅ | ✅ |
| Subscribe | ✅ | ✅ | ✅ |
| Dashboard | ❌ | ✅ | ✅ |
| Submit Scores | ❌ | ✅ | ✅ |
| View Own Scores | ❌ | ✅ | ✅ |
| Select Charity | ❌ | ✅ | ✅ |
| Enter Draws | ❌ | ✅ | ✅ |
| View Winnings | ❌ | ✅ | ✅ |
| Upload Proof | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Run Draws | ❌ | ❌ | ✅ |
| Verify Winners | ❌ | ❌ | ✅ |
| Mark Payouts | ❌ | ❌ | ✅ |
| View Reports | ❌ | ❌ | ✅ |

---

## Current Implementation Status

### ✅ Implemented
- Role column in profiles table
- Auto-assign 'user' role on signup
- Admin role assignment via scripts
- RLS policies for role-based access
- Middleware for route protection
- Admin API route protection
- Admin dashboard with full access

### 🔄 How It Works

1. **Public Visitor**: No auth token → Can only access public pages
2. **Registered Subscriber**: Has auth token + role='user' → Can access user features
3. **Administrator**: Has auth token + role='admin' → Can access everything

### 📝 Notes
- Role is stored in `profiles.role` column
- Default value is `'user'`
- Admin check uses: `exists (select 1 from profiles where id = auth.uid() and role = 'admin')`
- All admin routes double-check role in API
- Frontend hides admin links for non-admins
- RLS enforces data access at database level

---

## Testing Roles

### Test Public Visitor
1. Open incognito window
2. Go to http://localhost:3002
3. Can view homepage, charities, draws
4. Cannot access /dashboard, /scores, /admin

### Test Registered User
1. Login as regular user
2. Can access /dashboard, /scores, /draws, /winnings
3. Cannot access /admin

### Test Admin
1. Login as admin (digitalheros1@gmail.com)
2. Can access everything including /admin
3. Can manage users, run draws, verify winners

---

**Status**: Role system fully implemented and working ✅