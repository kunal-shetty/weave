-- ============================================================
-- CodeX — Supabase Users Table (Supabase Auth compatible)
-- Run this in the Supabase SQL editor
-- ============================================================

-- Drop old Clerk-specific columns if table exists
-- create table if not exists ...

-- 1. users — synced from Supabase Auth OAuth
create table if not exists users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  avatar_url      text,
  auth_provider   text default 'email',
  last_sign_in    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_users_email on users (email);

-- Row Level Security
alter table users enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on users for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on users for update
  using (auth.uid() = id);

-- Service role can do everything (for the auth callback)
create policy "Service role full access on users"
  on users for all
  using (true);

-- Auto-create user profile on signup via trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.app_metadata->>'provider', 'email')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, users.full_name),
    avatar_url = coalesce(excluded.avatar_url, users.avatar_url),
    last_sign_in = now(),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: auto-create profile on first auth signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Also create a Supabase Realtime publication for field_kv
-- (Enable from dashboard: Database → Replication → Enable on field_kv)

-- Projects table for the dashboard
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'active',
  section_id  text,
  page_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table projects enable row level security;

create policy "Users can read own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

create policy "Service role full access on projects"
  on projects for all
  using (true);
