# PHASE 8: FRONTEND ARCHITECTURE
## Golf Charity Draw Platform

---

## 🎨 DESIGN SYSTEM

### Design Philosophy
```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN PRINCIPLES                          │
└─────────────────────────────────────────────────────────────┘

1. CHARITY-FIRST STORYTELLING
   ├── Hero section emphasizes impact
   ├── Show charity contributions prominently
   ├── Emotional connection over golf features
   └── "Play for Purpose" messaging

2. MOBILE-FIRST
   ├── Design for 375px width first
   ├── Progressive enhancement for larger screens
   ├── Touch-friendly UI elements (min 44px)
   └── Simplified mobile navigation

3. FINTECH-GRADE UI
   ├── Clean, professional aesthetic
   ├── Trust indicators (security badges, SSL)
   ├── Clear financial information
   ├── Transparent pricing
   └── Premium feel (not golf-themed)

4. BRUTALIST DESIGN ELEMENTS
   ├── Bold typography
   ├── High contrast
   ├── Minimal decoration
   ├── Strong borders
   └── Limited color palette
```

### Color Palette
```css
/* Primary Colors */
--color-primary: #1a1a1a;        /* Near black */
--color-secondary: #ffffff;      /* White */
--color-accent: #0066ff;         /* Trust blue */

/* Semantic Colors */
--color-success: #10b981;        /* Green - success states */
--color-warning: #f59e0b;        /* Amber - warnings */
--color-error: #ef4444;          /* Red - errors */
--color-info: #3b82f6;           /* Blue - information */

/* Neutral Colors */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;

/* Charity Colors */
--color-charity-1: #ff6b6b;      /* Warm red */
--color-charity-2: #4ecdc4;      /* Teal */
--color-charity-3: #45b7d1;      /* Sky blue */
--color-charity-4: #96ceb4;      /* Sage green */
--color-charity-5: #ffeaa7;      /* Soft yellow */
```

### Typography
```css
/* Font Families */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Spacing System
```css
/* Spacing Scale (4px base) */
--space-1: 0.25rem;      /* 4px */
--space-2: 0.5rem;       /* 8px */
--space-3: 0.75rem;      /* 12px */
--space-4: 1rem;         /* 16px */
--space-5: 1.25rem;      /* 20px */
--space-6: 1.5rem;       /* 24px */
--space-8: 2rem;         /* 32px */
--space-10: 2.5rem;      /* 40px */
--space-12: 3rem;        /* 48px */
--space-16: 4rem;        /* 64px */
--space-20: 5rem;        /* 80px */
```

### Component Library (shadcn/ui)
```typescript
// components.json
{
  "name": "play4purpose-ui",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.cjs",
    "css": "app/globals.css",
    "baseColor": "slate"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}

// Pre-configured components:
// - Button (primary, secondary, ghost, destructive)
// - Card (with variants)
// - Input (with validation states)
// - Label
// - Form (with react-hook-form)
// - Dialog/Modal
// - Dropdown Menu
// - Toast/Notifications
// - Tabs
// - Badge
// - Avatar
// - Progress
// - Skeleton
// - Alert
```

---

## 📱 PAGE ARCHITECTURE

### 1. Home Page (`/`)
**Purpose:** Charity-first storytelling and conversion
**Audience:** Public (unauthenticated)

```typescript
// app/page.tsx
import { HeroSection } from '@/components/Home/HeroSection'
import { CharityImpact } from '@/components/Home/CharityImpact'
import { HowItWorks } from '@/components/Home/HowItWorks'
import { FeaturedCharities } from '@/components/Home/FeaturedCharities'
import { Testimonials } from '@/components/Home/Testimonials'
import { Pricing } from '@/components/Home/Pricing'
import { CTASection } from '@/components/Home/CTASection'
import { Footer } from '@/components/Home/Footer'

export default function HomePage() {
  return (
    <main>
      {/* Hero: Emotional hook about charity impact */}
      <HeroSection />
      
      {/* Impact stats: Total raised, winners, etc. */}
      <CharityImpact />
      
      {/* How it works: 3-step process */}
      <HowItWorks />
      
      {/* Featured charities: Visual cards */}
      <FeaturedCharities />
      
      {/* Testimonials: Social proof */}
      <Testimonials />
      
      {/* Pricing: Monthly/Yearly plans */}
      <Pricing />
      
      {/* CTA: Final conversion push */}
      <CTASection />
      
      {/* Footer: Links, legal, social */}
      <Footer />
    </main>
  )
}
```

**Sections:**
1. **Hero Section**
   - Headline: "Play Golf. Support Charity. Win Prizes."
   - Subheadline: "Every round you play helps change lives"
   - CTA: "Start Playing - £10/month"
   - Visual: Abstract golf course + charity imagery

2. **Charity Impact**
   - Total raised: £XX,XXX
   - Charities supported: X
   - Winners paid out: £XX,XXX
   - Animated counters

3. **How It Works**
   - Step 1: Subscribe (£10/month)
   - Step 2: Submit scores (unlimited)
   - Step 3: Win prizes (monthly draw)
   - Visual timeline

4. **Featured Charities**
   - Grid of charity cards
   - Logo, name, description
   - "Select this charity" CTA

5. **Testimonials**
   - Winner stories
   - Charity impact stories
   - User reviews

6. **Pricing**
   - Monthly: £10/month
   - Yearly: £100/year (17% savings)
   - Feature comparison
   - "Subscribe" buttons

7. **CTA Section**
   - Final conversion push
   - "Ready to make a difference?"
   - Email signup or direct to register

---

### 2. Login Page (`/login`)
**Purpose:** User authentication
**Audience:** Public

```typescript
// app/login/page.tsx
import { LoginForm } from '@/components/Auth/LoginForm'
import { AuthLayout } from '@/components/Auth/AuthLayout'

export default function LoginPage() {
  return (
    <AuthLayout 
      title="Welcome back"
      subtitle="Sign in to your account"
    >
      <LoginForm />
    </AuthLayout>
  )
}
```

**Features:**
- Email/password login
- "Remember me" checkbox
- "Forgot password" link
- "Sign up" link
- Social login (future: Google, Apple)
- Error message display
- Loading state

---

### 3. Register Page (`/register`)
**Purpose:** New user registration
**Audience:** Public

```typescript
// app/register/page.tsx
import { RegisterForm } from '@/components/Auth/RegisterForm'
import { AuthLayout } from '@/components/Auth/AuthLayout'

export default function RegisterPage() {
  return (
    <AuthLayout 
      title="Create your account"
      subtitle="Start playing for purpose today"
    >
      <RegisterForm />
    </AuthLayout>
  )
}
```

**Features:**
- Full name, email, password
- Password strength indicator
- Terms & conditions checkbox
- "Already have an account?" link
- Redirect to onboarding after registration

---

### 4. Dashboard Page (`/dashboard`)
**Purpose:** User overview and quick actions
**Audience:** Authenticated users

```typescript
// app/dashboard/page.tsx
import { DashboardOverview } from '@/components/Dashboard/Overview'
import { SubscriptionStatus } from '@/components/Dashboard/SubscriptionStatus'
import { RecentScores } from '@/components/Dashboard/RecentScores'
import { NextDraw } from '@/components/Dashboard/NextDraw'
import { CharityImpact } from '@/components/Dashboard/CharityImpact'
import { QuickActions } from '@/components/Dashboard/QuickActions'

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* Subscription status banner */}
      <SubscriptionStatus />
      
      {/* Quick action buttons */}
      <QuickActions />
      
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardOverview />
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Scores */}
        <div className="lg:col-span-2">
          <RecentScores />
        </div>
        
        {/* Right column: Draw + Charity */}
        <div className="space-y-6">
          <NextDraw />
          <CharityImpact />
        </div>
      </div>
    </div>
  )
}
```

**Sections:**
1. **Subscription Status Banner**
   - Active/Inactive/Past Due
   - Renewal date
   - "Upgrade/Manage" button

2. **Quick Actions**
   - Add Score
   - Enter Draw
   - Select Charity
   - View Winnings

3. **Stats Overview**
   - Total scores
   - Rolling average
   - Draws entered
   - Total winnings

4. **Recent Scores**
   - Last 5 scores
   - Trend chart
   - "Add Score" button

5. **Next Draw**
   - Countdown timer
   - Eligibility status
   - "Enter Now" button

6. **Charity Impact**
   - Selected charity
   - Total contributed
   - "Change Charity" button

---

### 5. Scores Page (`/scores`)
**Purpose:** Score history and entry
**Audience:** Subscribers

```typescript
// app/scores/page.tsx
import { ScoreHistory } from '@/components/Scores/ScoreHistory'
import { ScoreForm } from '@/components/Scores/ScoreForm'
import { ScoreStatistics } from '@/components/Scores/ScoreStatistics'

export default function ScoresPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Scores</h1>
        <ScoreForm />
      </div>
      
      {/* Statistics cards */}
      <ScoreStatistics />
      
      {/* Score history table */}
      <ScoreHistory />
    </div>
  )
}
```

**Features:**
- Score entry form (modal or inline)
- Score history (all scores, not just 5)
- Rolling average display
- Trend chart (last 10 scores)
- Delete button per score
- Sort by date/score
- Filter by date range

---

### 6. Draws Page (`/draws`)
**Purpose:** View and enter draws
**Audience:** All users (entry requires subscription)

```typescript
// app/draws/page.tsx
import { DrawList } from '@/components/Draw/DrawList'
import { DrawDetails } from '@/components/Draw/DrawDetails'
import { EnterDrawButton } from '@/components/Draw/EnterDrawButton'

export default function DrawsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Prize Draws</h1>
      
      {/* Active draw */}
      <DrawDetails />
      
      {/* Past draws */}
      <DrawList />
    </div>
  )
}
```

**Features:**
- Current/active draw (prominent)
- Countdown timer
- Eligibility checker
- "Enter Draw" button
- Past draws list
- Winner announcements
- Prize pool display

---

### 7. Winnings Page (`/winnings`)
**Purpose:** View winnings and upload proof
**Audience:** Winners only

```typescript
// app/winnings/page.tsx
import { WinningsList } from '@/components/Winner/WinningsList'
import { UploadProofButton } from '@/components/Winner/UploadProofButton'

export default function WinningsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Winnings</h1>
      
      {/* Pending verification */}
      <WinningsList status="pending" />
      
      {/* Approved - awaiting payment */}
      <WinningsList status="processing" />
      
      {/* Paid */}
      <WinningsList status="paid" />
    </div>
  )
}
```

**Features:**
- List of all winnings
- Status badges (pending/approved/paid)
- Upload proof button (for pending)
- Payment details form (for approved)
- Transaction history

---

### 8. Subscription Page (`/subscription`)
**Purpose:** Manage subscription
**Audience:** Authenticated users

```typescript
// app/subscription/page.tsx
import { SubscriptionPlans } from '@/components/Subscription/SubscriptionPlans'
import { SubscriptionStatus } from '@/components/Subscription/SubscriptionStatus'
import { PaymentMethod } from '@/components/Subscription/PaymentMethod'

export default function SubscriptionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription</h1>
      
      {/* Current plan */}
      <SubscriptionStatus />
      
      {/* Upgrade/downgrade */}
      <SubscriptionPlans />
      
      {/* Payment method */}
      <PaymentMethod />
    </div>
  )
}
```

**Features:**
- Current plan display
- Upgrade/downgrade options
- Cancel subscription
- Update payment method
- Billing history
- Next billing date

---

### 9. Onboarding Flow (`/onboarding/*`)
**Purpose:** New user setup
**Audience:** New users (first login)

```typescript
// app/onboarding/layout.tsx
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-4">
        {/* Progress indicator */}
        <OnboardingProgress />
        
        {/* Step content */}
        {children}
      </div>
    </div>
  )
}
```

**Steps:**
1. **Welcome** (`/onboarding/welcome`)
   - Welcome message
   - "Let's get you set up" CTA

2. **Charity Selection** (`/onboarding/charity`)
   - Browse charities
   - Select one
   - See impact preview

3. **Contribution** (`/onboarding/contribution`)
   - Choose % (10%, 15%, 20%)
   - See calculation preview
   - "Confirm" button

4. **Subscription** (`/onboarding/plan`)
   - Choose plan (monthly/yearly)
   - See pricing
   - "Subscribe" button → Stripe checkout

---

### 10. Admin Panel (`/admin/*`)
**Purpose:** Admin management
**Audience:** Admins only

```typescript
// app/admin/page.tsx
import { AdminSidebar } from '@/components/Admin/AdminSidebar'
import { AdminHeader } from '@/components/Admin/AdminHeader'

export default function AdminPage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar navigation */}
      <AdminSidebar />
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <AdminHeader />
        
        {/* Page content */}
        <div className="p-8">
          {/* Admin dashboard or specific page */}
        </div>
      </div>
    </div>
  )
}
```

**Admin Pages:**
1. **Dashboard** (`/admin`)
   - Overview stats
   - Recent activity
   - Quick actions

2. **Users** (`/admin/users`)
   - User list
   - Search/filter
   - Role management
   - Subscription status

3. **Draws** (`/admin/draws`)
   - Create/manage draws
   - Run draw button
   - View results

4. **Winners** (`/admin/winners`)
   - Pending verifications
   - Review proofs
   - Approve/reject

5. **Payouts** (`/admin/payouts`)
   - Pending payouts
   - Mark as paid
   - Transaction history

6. **Charities** (`/admin/charities`)
   - Manage charities
   - Add/edit/delete
   - View donations

7. **Audit Logs** (`/admin/audit`)
   - Action history
   - Filter by user/action
   - Export logs

---

## 🧩 COMPONENT ARCHITECTURE

### Component Structure
```
components/
├── ui/                          # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── form.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── toast.tsx
│   ├── tabs.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── progress.tsx
│   ├── skeleton.tsx
│   └── alert.tsx
│
├── Auth/                        # Authentication components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   ├── ResetPasswordForm.tsx
│