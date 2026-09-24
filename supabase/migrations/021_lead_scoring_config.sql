-- ============================================================================
-- CoachData Operational OS v2 — Lead Scoring Config Schema Migration
-- Migration: 021_lead_scoring_config.sql
-- Compatibility: Supabase PostgreSQL 15 (SaaS Multi-tenant Isolation)
-- ============================================================================

create table if not exists public.lead_scoring_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  criterio_texto text,
  senales jsonb not null default '{}'::jsonb,
  umbral_alto  integer not null default 70,
  umbral_medio integer not null default 40,
  activo boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint lead_scoring_config_org_unique unique (organization_id)
);

alter table public.lead_scoring_config enable row level security;

-- Policies (Separated by operation)
drop policy if exists "members select own org lead scoring config" on public.lead_scoring_config;
create policy "members select own org lead scoring config" on public.lead_scoring_config
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "members insert own org lead scoring config" on public.lead_scoring_config;
create policy "members insert own org lead scoring config" on public.lead_scoring_config
  for insert with check (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "members update own org lead scoring config" on public.lead_scoring_config;
create policy "members update own org lead scoring config" on public.lead_scoring_config
  for update using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  ) with check (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "members delete own org lead scoring config" on public.lead_scoring_config;
create policy "members delete own org lead scoring config" on public.lead_scoring_config
  for delete using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

-- Service Role policies
drop policy if exists "service role select lead scoring config" on public.lead_scoring_config;
create policy "service role select lead scoring config" on public.lead_scoring_config
  for select using (auth.role() = 'service_role');

drop policy if exists "service role insert lead scoring config" on public.lead_scoring_config;
create policy "service role insert lead scoring config" on public.lead_scoring_config
  for insert with check (auth.role() = 'service_role');

drop policy if exists "service role update lead scoring config" on public.lead_scoring_config;
create policy "service role update lead scoring config" on public.lead_scoring_config
  for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service role delete lead scoring config" on public.lead_scoring_config;
create policy "service role delete lead scoring config" on public.lead_scoring_config
  for delete using (auth.role() = 'service_role');

-- Modify crm_contacts to support lead scoring reasons and timestamps
alter table public.crm_contacts
  add column if not exists score_reason text,
  add column if not exists scored_at timestamptz;
