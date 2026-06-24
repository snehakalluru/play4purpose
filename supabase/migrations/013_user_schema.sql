-- User-Provided Schema
-- Run this migration to create the core tables

-- SUBSCRIPTIONS TABLE
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan_type text check (plan_type in ('monthly','yearly')),
  status text check (status in ('active','cancelled','lapsed')),
  renewal_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SCORES TABLE
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  score_value int check (score_value between 1 and 45),
  score_date date not null,
  created_at timestamptz default now(),
  unique(user_id, score_date) -- prevent duplicate scores per date
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

-- DRAWS TABLE
create table if not exists draws (
  id uuid primary key default gen_random_uuid(),
  draw_date date not null,
  draw_type text check (draw_type in ('random','algorithmic')),
  numbers int[] not null,
  status text check (status in ('simulation','published')),
  created_at timestamptz default now()
);

-- PRIZE POOL TABLE
create table if not exists prize_pool (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid references draws(id) on delete cascade,
  total_amount numeric,
  five_match_share numeric,
  four_match_share numeric,
  three_match_share numeric,
  rollover_amount numeric default 0,
  created_at timestamptz default now()
);

-- WINNERS TABLE
create table if not exists winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid references draws(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  match_type text check (match_type in ('3-match','4-match','5-match')),
  prize_amount numeric,
  proof_upload_url text,
  verification_status text check (verification_status in ('pending','approved','rejected')),
  payment_status text check (payment_status in ('pending','paid')),
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

-- RLS POLICIES
alter table subscriptions enable row level security;
alter table scores enable row level security;
alter table charities enable row level security;
alter table draws enable row level security;
alter table prize_pool enable row level security;
alter table winners enable row level security;
alter table admins enable row level security;

-- Policies for subscriptions
create policy "Users can view own subscription" on subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can insert own subscription" on subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Admins have full access" on subscriptions
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Policies for scores
create policy "Users can view own scores" on scores
  for select using (auth.uid() = user_id);
create policy "Users can insert own scores" on scores
  for insert with check (auth.uid() = user_id);
create policy "Admins have full access" on scores
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Policies for charities
create policy "Charities are public read" on charities
  for select using (true);
create policy "Admins can manage charities" on charities
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Policies for draws
create policy "Draws are public read" on draws
  for select using (true);
create policy "Admins can manage draws" on draws
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Policies for prize_pool
create policy "Prize pool is public read" on prize_pool
  for select using (true);
create policy "Admins can manage prize pool" on prize_pool
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Policies for winners
create policy "Users can view own winnings" on winners
  for select using (auth.uid() = user_id);
create policy "Admins can manage winners" on winners
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Policies for admins
create policy "Admins can view admins" on admins
  for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can manage admins" on admins
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));