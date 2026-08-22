-- ============================================================
-- CodeX — Supabase Users Migration (Clerk sync)
-- Run this in the Supabase SQL editor
-- ============================================================

create table if not exists users (
  id              uuid primary key,          -- matches Clerk user.id
  email           text not null,
  full_name       text,
  avatar_url      text,
  clerk_created   timestamptz not null default now(),
  clerk_updated   timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_users_email on users (email);

-- Row Level Security
alter table users enable row level security;

-- Allow full access with service role key (used server-side)
create policy "service role full access on users"
  on users for all using (true);
