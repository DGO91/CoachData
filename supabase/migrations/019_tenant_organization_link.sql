-- Migration: 019_tenant_organization_link.sql
-- Description: Add organization_id column to tenants table with strict ownership backfill
-- CoachData Operational OS v2

-- 1. Add organization_id column to public.tenants if not exists
alter table public.tenants
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- 2. Index for performance on organization_id lookups
create index if not exists idx_tenants_organization_id
  on public.tenants(organization_id);

-- 3. Backfill Phase 1: Enforce link for tenants with auth_user_id via organization_memberships
update public.tenants t
set organization_id = m.organization_id
from public.organization_memberships m
where t.organization_id is null
  and t.auth_user_id is not null
  and t.auth_user_id = m.user_id;

-- 4. Backfill Phase 2: Match by company_name against organization name or slug (strict equality)
update public.tenants t
set organization_id = o.id
from public.organizations o
where t.organization_id is null
  and (
    lower(trim(t.company_name)) = lower(trim(o.name))
    or lower(trim(t.company_name)) = lower(trim(o.slug))
  );

-- NOTE: Unlinked legacy tenants without auth_user_id or matching company_name remain organization_id IS NULL
-- to preserve strict multi-tenant data isolation. Live webhooks emit a prominent console.warn if organizationId is null.
