-- Migration: 023_agent_reports.sql
-- Purpose: Unified storage for AI agent reports (Morning Briefing, Pre-Call, Evening Summary, Weekly Digest, Prospect Analyzer)
-- ====================================================================

create table if not exists public.agent_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_type text not null, -- 'morning_briefing', 'pre_call', 'evening_summary', 'weekly_digest', 'prospect_analyzer'
  title text not null,
  summary text,
  content_markdown text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_reports_org_created on public.agent_reports(organization_id, created_at desc);
create index if not exists idx_agent_reports_agent_type on public.agent_reports(organization_id, agent_type);

alter table public.agent_reports enable row level security;

drop policy if exists "members see own org agent reports" on public.agent_reports;
create policy "members see own org agent reports" on public.agent_reports
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "members update own org agent reports" on public.agent_reports;
create policy "members update own org agent reports" on public.agent_reports
  for update using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "members insert own org agent reports" on public.agent_reports;
create policy "members insert own org agent reports" on public.agent_reports
  for insert with check (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );

drop policy if exists "service_role select agent reports" on public.agent_reports;
drop policy if exists "service_role insert agent reports" on public.agent_reports;
drop policy if exists "service_role update agent reports" on public.agent_reports;
drop policy if exists "service_role delete agent reports" on public.agent_reports;

create policy "service_role select agent reports" on public.agent_reports for select using (auth.role() = 'service_role');
create policy "service_role insert agent reports" on public.agent_reports for insert with check (auth.role() = 'service_role');
create policy "service_role update agent reports" on public.agent_reports for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service_role delete agent reports" on public.agent_reports for delete using (auth.role() = 'service_role');
