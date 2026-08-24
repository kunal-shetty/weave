-- ============================================================
-- Promptify — Supabase KV Metadata Migration
-- Run this in the Supabase SQL editor (or via supabase db push)
-- ============================================================

-- 1. section_meta
-- Mirrors MongoDB Section documents for fast page-level lookups.
create table if not exists section_meta (
  id          uuid primary key default gen_random_uuid(),
  section_id  text unique not null,
  page_name   text not null,
  section_name text not null,
  status      text not null default 'Pending',
  wireframe_url text,
  s3_key      text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_section_meta_page on section_meta (page_name);
create index if not exists idx_section_meta_status on section_meta (status);

-- 2. element_meta
-- Mirrors MongoDB Element documents — field-level lookup without full doc fetch.
create table if not exists element_meta (
  id           uuid primary key default gen_random_uuid(),
  field_id     text unique not null,
  section_id   text not null,
  page_name    text not null,
  element_name text not null,
  content_type text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_element_meta_section on element_meta (section_id);
create index if not exists idx_element_meta_page    on element_meta (page_name);

-- 3. field_kv
-- Live key-value store: fieldId → current content string.
-- Updated on every CMS PATCH; the frontend can subscribe via Supabase Realtime.
create table if not exists field_kv (
  id         uuid primary key default gen_random_uuid(),
  field_id   text unique not null,
  section_id text not null,
  page_name  text not null,
  content    text,
  css        text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_field_kv_section on field_kv (section_id);
create index if not exists idx_field_kv_page    on field_kv (page_name);

-- ── Realtime (optional but recommended) ───────────────────────────────────
-- Enable Supabase Realtime on field_kv so the frontend can subscribe to
-- live CMS changes without polling.
-- Run from the Supabase dashboard: Database → Replication → Enable on field_kv

-- Row Level Security (open for service-role key, lock down for anon if needed)
alter table section_meta enable row level security;
alter table element_meta  enable row level security;
alter table field_kv      enable row level security;

-- Allow full access with service role key (used server-side)
create policy "service role full access on section_meta"
  on section_meta for all using (true);

create policy "service role full access on element_meta"
  on element_meta for all using (true);

create policy "service role full access on field_kv"
  on field_kv for all using (true);

-- 4. users
-- Synced from Clerk webhooks — stores user profile data.
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

alter table users enable row level security;

create policy "service role full access on users"
  on users for all using (true);
