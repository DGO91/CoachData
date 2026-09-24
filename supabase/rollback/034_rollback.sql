-- 034_rollback.sql — deshace 034_indices_cobertura_y_duplicados.sql
--
-- Restaura el estado previo de los índices:
--   1. Recrea el índice normal `idx_org_memberships_org_user` y la constraint UNIQUE
--      `organization_memberships_organization_id_user_id_key` en `organization_memberships`.
--   2. Elimina los 17 índices de cobertura de Foreign Keys creados por la migración 034.
--
-- Generado simétricamente desde `034_indices_cobertura_y_duplicados.sql`.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1: Restauración en organization_memberships
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Restaurar constraint unique
alter table public.organization_memberships
  add constraint organization_memberships_organization_id_user_id_key
  unique (organization_id, user_id);

-- 2. Restaurar índice normal
create index if not exists idx_org_memberships_org_user
  on public.organization_memberships(organization_id, user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2: Eliminación de los 17 índices de Foreign Keys
-- ═══════════════════════════════════════════════════════════════════════════

drop index if exists public.idx_ai_tasks_tenant_id;
drop index if exists public.idx_call_ai_analysis_call_id;
drop index if exists public.idx_call_sessions_deal_id;
drop index if exists public.idx_contracts_proposal_id;
drop index if exists public.idx_crm_contacts_company_id;
drop index if exists public.idx_crm_deals_company_id;
drop index if exists public.idx_crm_deals_owner_id;
drop index if exists public.idx_crm_deals_primary_contact_id;
drop index if exists public.idx_deal_ai_insights_deal_id;
drop index if exists public.idx_invitations_created_by;
drop index if exists public.idx_invitations_used_by;
drop index if exists public.idx_invoices_proposal_id;
drop index if exists public.idx_operations_tasks_assigned_to;
drop index if exists public.idx_operations_tasks_project_id;
drop index if exists public.idx_proposal_acceptance_logs_proposal_id;
drop index if exists public.idx_proposals_crm_deal_id;
drop index if exists public.idx_proposals_deal_id;

commit;
