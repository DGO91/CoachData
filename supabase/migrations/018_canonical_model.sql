-- Purpose: Canonical data model — 4 entity tables for the integration layer
-- ====================================================================
-- Migration: 018_canonical_model.sql
--
-- Every connector (Stripe, Tally, Calendly, Kajabi…) writes to these tables.
-- Every consumer (dashboard, agents, Revenue Suite) reads from them.
-- raw_payload is always preserved for reprocessing when mappings change.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. canonical_contact
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.canonical_contact (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_provider text not null,
  source_id       text not null,
  email           text,
  full_name       text,
  phone           text,
  raw_payload     jsonb not null default '{}'::jsonb,
  occurred_at     timestamptz,
  ingested_at     timestamptz not null default now()
);

create unique index if not exists canonical_contact_source_unique
  on public.canonical_contact (organization_id, source_provider, source_id);

alter table public.canonical_contact enable row level security;

drop policy if exists "members see own org contacts" on public.canonical_contact;
create policy "members see own org contacts" on public.canonical_contact
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "service role full access contacts" on public.canonical_contact;
drop policy if exists "service_role select contacts" on public.canonical_contact;
drop policy if exists "service_role insert contacts" on public.canonical_contact;
drop policy if exists "service_role update contacts" on public.canonical_contact;
drop policy if exists "service_role delete contacts" on public.canonical_contact;

create policy "service_role select contacts" on public.canonical_contact for select using (auth.role() = 'service_role');
create policy "service_role insert contacts" on public.canonical_contact for insert with check (auth.role() = 'service_role');
create policy "service_role update contacts" on public.canonical_contact for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role delete contacts" on public.canonical_contact for delete using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. canonical_payment
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.canonical_payment (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_provider text not null,
  source_id       text not null,
  amount_cents    integer not null,
  currency        text not null default 'usd',
  status          text not null,
  payer_email     text,
  payer_name      text,
  raw_payload     jsonb not null default '{}'::jsonb,
  occurred_at     timestamptz,
  ingested_at     timestamptz not null default now()
);

create unique index if not exists canonical_payment_source_unique
  on public.canonical_payment (organization_id, source_provider, source_id);

alter table public.canonical_payment enable row level security;

drop policy if exists "members see own org payments" on public.canonical_payment;
create policy "members see own org payments" on public.canonical_payment
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "service role full access payments" on public.canonical_payment;
drop policy if exists "service_role select payments" on public.canonical_payment;
drop policy if exists "service_role insert payments" on public.canonical_payment;
drop policy if exists "service_role update payments" on public.canonical_payment;
drop policy if exists "service_role delete payments" on public.canonical_payment;

create policy "service_role select payments" on public.canonical_payment for select using (auth.role() = 'service_role');
create policy "service_role insert payments" on public.canonical_payment for insert with check (auth.role() = 'service_role');
create policy "service_role update payments" on public.canonical_payment for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role delete payments" on public.canonical_payment for delete using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. canonical_session
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.canonical_session (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_provider text not null,
  source_id       text not null,
  starts_at       timestamptz,
  ends_at         timestamptz,
  attendee_email  text,
  attendee_name   text,
  session_type    text,
  raw_payload     jsonb not null default '{}'::jsonb,
  occurred_at     timestamptz,
  ingested_at     timestamptz not null default now()
);

create unique index if not exists canonical_session_source_unique
  on public.canonical_session (organization_id, source_provider, source_id);

alter table public.canonical_session enable row level security;

drop policy if exists "members see own org sessions" on public.canonical_session;
create policy "members see own org sessions" on public.canonical_session
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "service role full access sessions" on public.canonical_session;
drop policy if exists "service_role select sessions" on public.canonical_session;
drop policy if exists "service_role insert sessions" on public.canonical_session;
drop policy if exists "service_role update sessions" on public.canonical_session;
drop policy if exists "service_role delete sessions" on public.canonical_session;

create policy "service_role select sessions" on public.canonical_session for select using (auth.role() = 'service_role');
create policy "service_role insert sessions" on public.canonical_session for insert with check (auth.role() = 'service_role');
create policy "service_role update sessions" on public.canonical_session for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role delete sessions" on public.canonical_session for delete using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. canonical_form_entry
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.canonical_form_entry (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_provider text not null,
  source_id       text not null,
  form_name       text,
  respondent_email text,
  respondent_name  text,
  answers         jsonb,
  raw_payload     jsonb not null default '{}'::jsonb,
  occurred_at     timestamptz,
  ingested_at     timestamptz not null default now()
);

create unique index if not exists canonical_form_entry_source_unique
  on public.canonical_form_entry (organization_id, source_provider, source_id);

alter table public.canonical_form_entry enable row level security;

drop policy if exists "members see own org form entries" on public.canonical_form_entry;
create policy "members see own org form entries" on public.canonical_form_entry
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "service role full access form entries" on public.canonical_form_entry;
drop policy if exists "service_role select form entries" on public.canonical_form_entry;
drop policy if exists "service_role insert form entries" on public.canonical_form_entry;
drop policy if exists "service_role update form entries" on public.canonical_form_entry;
drop policy if exists "service_role delete form entries" on public.canonical_form_entry;

create policy "service_role select form entries" on public.canonical_form_entry for select using (auth.role() = 'service_role');
create policy "service_role insert form entries" on public.canonical_form_entry for insert with check (auth.role() = 'service_role');
create policy "service_role update form entries" on public.canonical_form_entry for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role delete form entries" on public.canonical_form_entry for delete using (auth.role() = 'service_role');
