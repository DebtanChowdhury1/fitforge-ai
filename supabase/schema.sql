-- ============================================================
-- FitForge AI — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

-- Enable UUID extension (already enabled on Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  goal          text not null check (goal in ('muscle_gain','fat_loss','endurance','general_fitness')),
  fitness_level text not null check (fitness_level in ('beginner','intermediate','advanced')),
  equipment     text not null check (equipment in ('none','home_dumbbells','full_gym')),
  days_per_week integer not null default 4 check (days_per_week between 2 and 6),
  session_duration integer not null default 45,
  limitations   text not null default '',
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- ============================================================
-- WORKOUT PLANS
-- ============================================================
create table if not exists public.workout_plans (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  plan_json  jsonb not null
);

alter table public.workout_plans enable row level security;

create policy "Users can read own plans"
  on public.workout_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own plans"
  on public.workout_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own plans"
  on public.workout_plans for delete
  using (auth.uid() = user_id);

create policy "Users can update own plans"
  on public.workout_plans for update
  using (auth.uid() = user_id);

-- Index for fast lookup of latest plan
create index if not exists workout_plans_user_created
  on public.workout_plans(user_id, created_at desc);

-- ============================================================
-- WORKOUT LOGS
-- ============================================================
create table if not exists public.workout_logs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan_id         uuid references public.workout_plans(id) on delete set null,
  date            date not null default current_date,
  exercises_json  jsonb not null default '[]'::jsonb
);

alter table public.workout_logs enable row level security;

create policy "Users can read own logs"
  on public.workout_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.workout_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on public.workout_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.workout_logs for delete
  using (auth.uid() = user_id);

create index if not exists workout_logs_user_date
  on public.workout_logs(user_id, date desc);

-- ============================================================
-- PROGRESS ENTRIES
-- ============================================================
create table if not exists public.progress_entries (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null default current_date,
  body_weight       numeric(6,2),
  measurements_json jsonb not null default '{}'::jsonb,
  unique (user_id, date)
);

alter table public.progress_entries enable row level security;

create policy "Users can read own progress"
  on public.progress_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.progress_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.progress_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own progress"
  on public.progress_entries for delete
  using (auth.uid() = user_id);

create index if not exists progress_entries_user_date
  on public.progress_entries(user_id, date desc);

-- ============================================================
-- REPORTS
-- ============================================================
create table if not exists public.reports (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('daily', 'custom')),
  title      text not null,
  content    jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can read own reports"
  on public.reports for select
  using (auth.uid() = user_id);

create policy "Users can insert own reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reports"
  on public.reports for delete
  using (auth.uid() = user_id);

create index if not exists reports_user_expires
  on public.reports(user_id, expires_at desc);

-- ============================================================
-- ERROR LOGS  (insert-only for crash reporting)
-- ============================================================
create table if not exists public.error_logs (
  id          uuid primary key default uuid_generate_v4(),
  message     text not null,
  stack       text,
  is_fatal    boolean not null default false,
  platform    text,
  app_version text,
  occurred_at timestamptz not null default now()
);

alter table public.error_logs enable row level security;

create policy "All users can insert error logs"
  on public.error_logs for insert
  with check (true);

-- ============================================================
-- API USAGE  (see migrations/20260623_api_usage.sql)
-- ============================================================
