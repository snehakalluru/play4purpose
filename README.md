# Play4Purpose - Golf Charity Prize Draw Platform

A subscription-based golf rewards platform where users enter scores, support charities, and participate in monthly prize draws.

## 🎯 Features

### User Features
- **Authentication**: Email signup/login with password reset
- **Subscription Management**: Monthly (£10) or Yearly (£100) plans via Stripe
- **Score Tracking**: Unlimited golf score history with rolling 5-score average
- **Charity Selection**: Choose from active charities with customizable contribution percentage (0-20%)
- **Draw Participation**: Automatic entry into monthly draws when eligible
- **Winner Verification**: Upload proof documents for prize claims
- **Dashboard**: Complete overview of account, subscription, scores, and winnings

### Admin Features
- **User Management**: View and manage all users
- **Charity Management**: Create, edit, and manage charities
- **Draw Management**: Create and run monthly prize draws
- **Winner Management**: Review verification proofs and approve/reject winners
- **Payout Processing**: Track and process winner payments
- **Audit Logs**: Complete audit trail of all admin actions

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Storage**: Supabase Storage
- **Email**: Resend
- **Deployment**: Vercel

## 📦 Database Schema

### Core Tables
- `profiles` - User profiles with role-based access
- `subscriptions` - Stripe subscription tracking
- `charities` - Available charities for donations
- `scores` - Golf score history (1-45 range)
- `score_statistics` - Rolling averages (auto-calculated via triggers)
- `draws` - Monthly prize draws
- `draw_entries` - User entries in draws
- `winners` - Draw winners with verification status
- `payouts` - Payment tracking for winners
- `prize_pools` - Prize distribution calculations
- `user_charities` - User charity selections
- `notifications` - User notifications
- `audit_logs` - Admin action tracking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account
- Stripe account
- Resend account (for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/snehakalluru/play4purpose.git
   cd play4purpose
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
   - `STRIPE_SECRET_KEY` - Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
   - `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` - Stripe monthly price ID
   - `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` - Stripe yearly price ID
   - `RESEND_API_KEY` - Resend API key for emails
   - `NEXT_PUBLIC_APP_URL` - Your app URL (default: http://localhost:3000)

4. **Set up Supabase**

   a. Create a new Supabase project
   
   b. Run the migrations in order:
   ```bash
   # In Supabase SQL Editor, run:
   supabase/migrations/001_enums.sql
   supabase/migrations/010_full_schema.sql
   supabase/migrations/011_fix_schema.sql
   ```

   c. Enable Row Level Security (RLS) - already included in migrations

   d. Create storage buckets:
   - `avatars` (public)
   - `charity-logos` (public)
   - `winner-proofs` (private)

5. **Set up Stripe**

   a. Create products and prices:
   - Monthly: £10/month
   - Yearly: £100/year
   
   b. Set up webhook endpoint: `https://your-domain.com/api/stripe/webhook`
   
   c. Configure webhook events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
play4purpose/
├── app/
│   ├── api/                    # API routes
│   │   ├── admin/              # Admin-only endpoints
│   │   │   ├── run-draw/       # Run monthly draw
│   │   │   └── winners/        # Winner management
│   │   ├── auth/               # Authentication endpoints
│   │   │   └── register/       # User registration
│   │   ├── draws/              # Draw endpoints
│   │   │   ├── enter/          # Enter draw
│   │   │   └── run/            # Run draw (legacy)
│   │   ├── scores/             # Score management
│   │   │   ├── add/            # Add score
│   │   │   └── route.ts        # Get scores
│   │   ├── stripe/             # Stripe integration
│   │   │   ├── checkout/       # Create checkout session
│   │   │   └── webhook/        # Stripe webhooks
│   │   ├── user/               # User endpoints
│   │   │   └── select-charity/ # Select charity
│   │   ├── winners/            # Winner endpoints
│   │   │   └── upload-proof/   # Upload verification
│   │   └── winnings/           # Get user winnings
│   ├── admin/                  # Admin pages
│   ├── dashboard/              # User dashboard
│   ├── draws/                  # Draw pages
│   ├── forgot-password/        # Password reset
│   ├── login/                  # Login page
│   ├── onboarding/             # User onboarding flow
│   │   ├── charity/            # Select charity
│   │   ├── contribution/       # Set contribution %
│   │   └── plan/               # Choose subscription
│   ├── register/               # Registration page
│   ├── reset-password/         # Reset password
│   ├── scores/                 # Scores page
│   └── winnings/               # Winnings page
│       └── upload/             # Upload proof
├── components/
│   ├── Admin/                  # Admin components
│   │   ├── AdminWinnersPanel.tsx
│   │   └── RunDrawButton.tsx
│   ├── Auth/                   # Auth forms
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ResetPasswordForm.tsx
│   ├── Charity/                # Charity components
│   │   ├── CharityCard.tsx
│   │   └── CharitySelector.tsx
│   ├── Dashboard/              # Dashboard components
│   │   ├── Header.tsx
│   │   ├── Overview.tsx
│   │   └── Sidebar.tsx
│   ├── Draw/                   # Draw components
│   │   ├── ActiveDraw.tsx
│   │   └── EntryForm.tsx
│   ├── Onboarding/             # Onboarding components
│   │   └── ContributionSelector.tsx
│   ├── Scores/                 # Score components
│   │   └── ScoreForm.tsx
│   ├── Subscription/           # Subscription components
│   │   └── SubscriptionPlans.tsx
│   └── Winner/                 # Winner components
│       └── UploadProofForm.tsx
├── emails/                     # Email templates
├── lib/                        # Utility libraries
├── services/                   # Service clients
│   ├── stripeClient.ts         # Stripe client
│   ├── supabaseAdmin.ts        # Supabase admin client
│   └── supabaseClient.ts       # Supabase client
├── supabase/
│   ├── migrations/             # Database migrations
│   │   ├── 010_full_schema.sql
│   │   └── 011_fix_schema.sql
│   └── policies/               # RLS policies
├── types/                      # TypeScript types
│   ├── charity.ts
│   ├── db.ts
│   ├── draw.ts
│   ├── drawEntry.ts
│   ├── index.ts
│   ├── profile.ts
│   ├── score.ts
│   ├── subscription.ts
│   └── winner.ts
├── validators/                 # Zod validation schemas
│   ├── auth.ts
│   ├── charity.ts
│   └── score.ts
├── .env.example                # Environment variables template
├── middleware.ts               # Next.js middleware (auth)
├── next.config.mjs             # Next.js configuration
├── package.json
├── tailwind.config.cjs         # TailwindCSS configuration
└── tsconfig.json
```

## 🔐 Security

- **Row Level Security (RLS)**: All tables protected with Supabase RLS
- **Role-Based Access**: Users can only access their own data, admins have full access
- **Authentication**: Supabase Auth with email verification
- **Input Validation**: Zod schemas for all API endpoints
- **CSRF Protection**: Built into Next.js
- **Secure File Uploads**: Restricted to Supabase Storage with proper permissions

## 🎨 UI/UX

- **Mobile-First**: Responsive design optimized for mobile devices
- **Brutalist Design**: Bold, high-contrast aesthetic
- **Accessibility**: WCAG AA compliant
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages
- **Empty States**: Helpful placeholders

## 🔄 Draw System

### Eligibility Requirements
- Active subscription
- Charity selected
- At least 5 scores entered

### Prize Distribution
- 40% Jackpot
- 35% Second Prize
- 25% Third Prize

### Winner Selection
- Cryptographically secure random selection
- No duplicate winners
- Fully auditable with audit logs

## 📊 Score Management

- **Range**: 1-45 (valid golf scores)
- **History**: Unlimited score storage
- **Rolling Average**: Last 5 scores only
- **Auto-calculation**: Database trigger updates statistics automatically
- **Validation**: Future dates not allowed, unique per user per date

## 🏆 Subscription Plans

### Monthly: £10/month
- Unlimited score entries
- Monthly prize draw entry
- Charity contributions
- Win up to 40% of prize pool

### Yearly: £100/year
- All monthly features
- 2 months free (17% savings)
- Priority support

## 🚢 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Post-Deployment

1. Configure Stripe webhooks
2. Set up Supabase production project
3. Run migrations
4. Create admin user (update profile role in database)
5. Test complete user flow

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### User Endpoints
- `GET /api/scores` - Get user scores
- `POST /api/scores/add` - Add new score
- `POST /api/user/select-charity` - Select charity
- `GET /api/winnings` - Get user winnings
- `POST /api/winners/upload-proof` - Upload verification proof

### Draw Endpoints
- `GET /api/draws` - Get available draws
- `POST /api/draws/enter` - Enter a draw

### Admin Endpoints
- `POST /api/admin/run-draw` - Run monthly draw
- `GET /api/admin/winners/list` - List all winners
- `POST /api/admin/winners/review` - Approve/reject winner
- `POST /api/admin/winners/payout` - Process payout

### Stripe Endpoints
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Stripe webhook handler

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 👥 Support

For support, email support@play4purpose.com or create an issue in the repository.

## 🗺️ Roadmap

- [ ] Email notifications (Resend integration)
- [ ] Advanced reporting and exports (CSV/Excel)
- [ ] Push notifications
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Social features (share wins, invite friends)
- [ ] Referral program

---

Built with ❤️ for golfers who want to make a difference.