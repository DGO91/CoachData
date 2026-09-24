-- Migration: 024_client_intelligence_vault.sql
-- Purpose: Multi-tenant shared memory and intelligence vault for AI agents
-- ====================================================================

create table if not exists public.client_intelligence_vault (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null default 'prospect', -- 'prospect', 'client', 'deal'
  entity_name text not null,
  entity_email text,
  insights jsonb not null default '{}'::jsonb, -- { summary, pain_points, opportunities, suggested_angle, tech_stack, notes }
  source_agent text not null, -- 'prospect_analyzer', 'pre_call_agent', 'auto_plan_creator', 'mail_responder', 'manual'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_intel_org_name on public.client_intelligence_vault(organization_id, entity_name);
create index if not exists idx_client_intel_org_email on public.client_intelligence_vault(organization_id, entity_email);
create index if not exists idx_client_intel_updated on public.client_intelligence_vault(organization_id, updated_at desc);

alter table public.client_intelligence_vault enable row level security;

drop policy if exists "members see own org intelligence vault" on public.client_intelligence_vault;
create policy "members see own org intelligence vault" on public.client_intelligence_vault
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "members update own org intelligence vault" on public.client_intelligence_vault;
create policy "members update own org intelligence vault" on public.client_intelligence_vault
  for update using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "members insert own org intelligence vault" on public.client_intelligence_vault;
create policy "members insert own org intelligence vault" on public.client_intelligence_vault
  for insert with check (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "service_role select intelligence vault" on public.client_intelligence_vault;
drop policy if exists "service_role insert intelligence vault" on public.client_intelligence_vault;
drop policy if exists "service_role update intelligence vault" on public.client_intelligence_vault;
drop policy if exists "service_role delete intelligence vault" on public.client_intelligence_vault;

create policy "service_role select intelligence vault" on public.client_intelligence_vault for select using (auth.role() = 'service_role');
create policy "service_role insert intelligence vault" on public.client_intelligence_vault for insert with check (auth.role() = 'service_role');
create policy "service_role update intelligence vault" on public.client_intelligence_vault for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role delete intelligence vault" on public.client_intelligence_vault for delete using (auth.role() = 'service_role');
