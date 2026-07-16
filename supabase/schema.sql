-- =========================================================
-- FI Goal App — Database schema for Supabase (Postgres)
-- Run this whole file in: Supabase Dashboard -> SQL Editor -> New query
--
-- NOTE: earlier versions of this file used `create extension "uuid-ossp"`
-- and `uuid_generate_v4()`. On Supabase, that extension sometimes needs to
-- be created in a schema your role can't target directly from the SQL
-- editor, which is the "CREATE EXTENSION" error from before. This version
-- avoids the problem entirely by using Postgres's built-in
-- gen_random_uuid() (via the pgcrypto extension, which Supabase enables
-- by default on every project) — no CREATE EXTENSION statement needed.
-- =========================================================

-- ---------------------------------------------------------
-- profiles: one row per user, extends Supabase's built-in auth.users
-- ---------------------------------------------------------
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  currency_code text not null default 'INR',
  -- used as a fallback for the realism check before we have real spending history
  avg_monthly_income numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- income_sources: fixed monthly salary + irregular/freelance income
-- ---------------------------------------------------------
create table income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  label text not null,
  amount numeric not null check (amount >= 0),
  frequency text not null check (frequency in ('monthly', 'irregular')),
  received_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- categories: expense categories, seeded with defaults per user
-- ---------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  is_default boolean not null default false,
  unique (user_id, name)
);

-- ---------------------------------------------------------
-- goals: the target amount + date a user is trying to hit
-- ---------------------------------------------------------
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  target_amount numeric not null check (target_amount > 0),
  start_amount numeric not null default 0 check (start_amount >= 0),
  target_date date not null,
  status text not null default 'active'
    check (status in ('active', 'achieved', 'abandoned', 'adjusted')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- buffer_state: the hidden offset per goal. Never shown raw to the user —
-- only its *effect* (today's spending limit, on-track status) is surfaced.
-- ---------------------------------------------------------
create table buffer_state (
  goal_id uuid references goals(id) on delete cascade primary key,
  buffer_amount numeric not null default 0,
  seed_amount numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- transactions: every logged expense (and future bank-synced ones)
-- ---------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete cascade,
  category_id uuid references categories(id),
  amount numeric not null check (amount > 0),
  note text,
  is_recurring boolean not null default false,
  recurring_active boolean not null default true,
  occurred_on date not null default current_date,
  -- future-proofing for direct bank account sync
  source text not null default 'manual' check (source in ('manual', 'bank_sync')),
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on transactions (user_id, occurred_on desc);
create index transactions_goal_idx on transactions (goal_id);

-- ---------------------------------------------------------
-- insights: AI-generated digest entries (weekly, not per-expense)
-- ---------------------------------------------------------
create table insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete cascade,
  content text not null,
  period_start date,
  period_end date,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Row Level Security — every table is locked to its owning user.
-- This is what makes it safe to eventually open the app to other users.
-- =========================================================
alter table profiles enable row level security;
alter table income_sources enable row level security;
alter table categories enable row level security;
alter table goals enable row level security;
alter table buffer_state enable row level security;
alter table transactions enable row level security;
alter table insights enable row level security;

create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id);

create policy "Users manage own income" on income_sources
  for all using (auth.uid() = user_id);

create policy "Users manage own categories" on categories
  for all using (auth.uid() = user_id);

create policy "Users manage own goals" on goals
  for all using (auth.uid() = user_id);

create policy "Users manage own buffer state" on buffer_state
  for all using (
    exists (
      select 1 from goals
      where goals.id = buffer_state.goal_id
      and goals.user_id = auth.uid()
    )
  );

create policy "Users manage own transactions" on transactions
  for all using (auth.uid() = user_id);

create policy "Users manage own insights" on insights
  for all using (auth.uid() = user_id);

-- =========================================================
-- Default categories seeded whenever a new user signs up
-- =========================================================
create function public.seed_default_categories()
returns trigger as $$
begin
  insert into public.categories (user_id, name, is_default) values
    (new.id, 'Food', true),
    (new.id, 'Transport', true),
    (new.id, 'Rent', true),
    (new.id, 'Subscriptions', true),
    (new.id, 'Entertainment', true),
    (new.id, 'Other', true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_seed_categories
  after insert on public.profiles
  for each row execute procedure public.seed_default_categories();
