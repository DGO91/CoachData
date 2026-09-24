-- Purpose: Public Waitlist schema with RLS hardening and unique email index
-- ====================================================================
-- Migration: 017_waitlist.sql

create table if not exists public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  name         text,
  role         text,
  source       text,
  locale       text default 'es',
  created_at   timestamptz not null default now(),
  contacted_at timestamptz
);

-- Unique case-insensitive index to prevent duplicate waitlist submissions
create unique index if not exists waitlist_email_unique
  on public.waitlist (lower(email));

create unique index if not exists waitlist_email_key
  on public.waitlist (email);

-- Enable Row Level Security (RLS)
alter table public.waitlist enable row level security;

-- Drop legacy policies if they exist
drop policy if exists "No public select access to waitlist" on public.waitlist;
drop policy if exists "Service role full access to waitlist" on public.waitlist;
drop policy if exists "service_role select waitlist" on public.waitlist;
drop policy if exists "service_role insert waitlist" on public.waitlist;
drop policy if exists "service_role update waitlist" on public.waitlist;
drop policy if exists "service_role delete waitlist" on public.waitlist;

create policy "service_role select waitlist" on public.waitlist for select using (auth.role() = 'service_role');
create policy "service_role insert waitlist" on public.waitlist for insert with check (auth.role() = 'service_role');
create policy "service_role update waitlist" on public.waitlist for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role delete waitlist" on public.waitlist for delete using (auth.role() = 'service_role');
