-- Purpose: Agent schedules per organization (persists schedules across process restarts)
-- ====================================================================
-- Migration: 020_agent_schedules.sql

create table if not exists public.agent_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_type text not null, -- 'evening_summary', 'personal_agent', 'precall'
  is_active boolean not null default false,
  cron_schedule text,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint agent_schedules_org_agent_unique unique (organization_id, agent_type)
);

alter table public.agent_schedules enable row level security;

drop policy if exists "members see own org agent schedules" on public.agent_schedules;
create policy "members see own org agent schedules" on public.agent_schedules
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "service role full access agent schedules" on public.agent_schedules;
drop policy if exists "service_role select agent schedules" on public.agent_schedules;
drop policy if exists "service_role insert agent schedules" on public.agent_schedules;
drop policy if exists "service_role update agent schedules" on public.agent_schedules;
drop policy if exists "service_role delete agent schedules" on public.agent_schedules;

create policy "service_role select agent schedules" on public.agent_schedules for select using (auth.role() = 'service_role');
create policy "service_role insert agent schedules" on public.agent_schedules for insert with check (auth.role() = 'service_role');
create policy "service_role update agent schedules" on public.agent_schedules for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role delete agent schedules" on public.agent_schedules for delete using (auth.role() = 'service_role');
