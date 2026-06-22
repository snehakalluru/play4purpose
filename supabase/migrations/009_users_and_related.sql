-- 009_users_and_related.sql
-- Create users, subscriptions, scores, draws, winners, charities, prize_pool, admins

-- USERS TABLE
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  subscription_id uuid references subscriptions(id),
  charity_id uuid references charities(id),
  contribution_percentage int default 10,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SUBSCRIPTIONS TABLE
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  plan_type text check (plan_type in ('monthly','yearly')),
  status text check (status in ('active','cancelled','lapsed')),
  renewal_date date,
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SCORES TABLE
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  score_value int check (score_value between 1 and 45),
  score_date date not null,
  created_at timestamptz default now(),
  unique(user_id, score_date)
);

-- DRAWS TABLE
create table if not exists draws (
  id uuid primary key default gen_random_uuid(),
  draw_date date not null,
  draw_type text check (draw_type in ('random','algorithmic')),
  numbers int[] not null,
  status text check (status in ('simulation','published')),
  created_at timestamptz default now()
);

-- WINNERS TABLE
create table if not exists winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid references draws(id),
  user_id uuid references users(id),
  match_type text check (match_type in ('3-match','4-match','5-match')),
  prize_amount numeric,
  proof_upload_url text,
  verification_status text check (verification_status in ('pending','approved','rejected')),
  payment_status text check (payment_status in ('pending','paid')),
  created_at timestamptz default now()
);

-- CHARITIES TABLE
create table if not exists charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  events jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PRIZE POOL TABLE
create table if not exists prize_pool (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid references draws(id),
  total_amount numeric,
  five_match_share numeric,
  four_match_share numeric,
  three_match_share numeric,
  rollover_amount numeric default 0,
  created_at timestamptz default now()
);

-- ADMINS TABLE
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text check (role in ('superadmin','moderator')),
  created_at timestamptz default now()
);
