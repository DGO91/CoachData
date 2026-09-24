-- 034_indices_cobertura_y_duplicados.sql
--
-- Optimización y saneamiento de índices en PostgreSQL (Supabase):
--
-- Parte 1 — Deduplicación en `organization_memberships`:
-- Existían tres índices idénticos sobre (organization_id, user_id):
--   1. `idx_org_memberships_org_user`: índice normal redundante (sin constraint).
--   2. `organization_memberships_organization_id_user_id_key`: constraint UNIQUE auto-generada (001).
--   3. `unique_org_user_membership`: constraint UNIQUE explícita (010).
--
-- Se elimina el índice normal `idx_org_memberships_org_user` y la constraint redundante
-- `organization_memberships_organization_id_user_id_key`, conservando intacta la constraint
-- canónica `unique_org_user_membership` (que garantiza la unicidad tenant-usuario) y el índice
-- mono-columna `idx_org_memberships_user` sobre (user_id), esencial para las 45 políticas RLS.
--
-- Parte 2 — Cobertura de 17 Foreign Keys sin índice:
-- Postgres no indexa automáticamente las columnas con foreign key. La ausencia de índice
-- penaliza los JOINs, los filtros por clave externa y los bloqueos de tabla en cascada durante
-- DELETE / UPDATE de filas referenciadas en las tablas padre.
-- Se añaden índices estándar `idx_<table>_<columna>` para las 17 foreign keys identificadas.
--
-- Nota sobre transaccionalidad:
-- Esta migración se ejecuta dentro de un bloque `begin; ... commit;`. En PostgreSQL,
-- `CREATE INDEX CONCURRENTLY` no puede ejecutarse dentro de bloques de transacción.
-- Los índices aquí definidos usan `CREATE INDEX IF NOT EXISTS` estándar para garantizar
-- atomicidad en la aplicación de la migración.
--
-- Reversión simétrica disponible en `supabase/rollback/034_rollback.sql`.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1: Deduplicación de índices en organization_memberships
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Eliminar índice normal redundante
drop index if exists public.idx_org_memberships_org_user;

-- 2. Eliminar constraint unique redundante (mantiene unique_org_user_membership)
alter table public.organization_memberships
  drop constraint if exists organization_memberships_organization_id_user_id_key;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2: Índices de cobertura para 17 Foreign Keys
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ai_tasks (tenant_id -> tenants.id)
create index if not exists idx_ai_tasks_tenant_id
  on public.ai_tasks(tenant_id);

-- 2. call_ai_analysis (call_id -> call_sessions.id)
create index if not exists idx_call_ai_analysis_call_id
  on public.call_ai_analysis(call_id);

-- 3. call_sessions (deal_id -> crm_deals.id)
create index if not exists idx_call_sessions_deal_id
  on public.call_sessions(deal_id);

-- 4. contracts (proposal_id -> proposals.id)
create index if not exists idx_contracts_proposal_id
  on public.contracts(proposal_id);

-- 5. crm_contacts (company_id -> crm_companies.id)
create index if not exists idx_crm_contacts_company_id
  on public.crm_contacts(company_id);

-- 6. crm_deals (company_id -> crm_companies.id)
create index if not exists idx_crm_deals_company_id
  on public.crm_deals(company_id);

-- 7. crm_deals (owner_id -> auth.users.id)
create index if not exists idx_crm_deals_owner_id
  on public.crm_deals(owner_id);

-- 8. crm_deals (primary_contact_id -> crm_contacts.id)
create index if not exists idx_crm_deals_primary_contact_id
  on public.crm_deals(primary_contact_id);

-- 9. deal_ai_insights (deal_id -> crm_deals.id)
create index if not exists idx_deal_ai_insights_deal_id
  on public.deal_ai_insights(deal_id);

-- 10. invitations (created_by -> auth.users.id / users.id)
create index if not exists idx_invitations_created_by
  on public.invitations(created_by);

-- 11. invitations (used_by -> auth.users.id / users.id)
create index if not exists idx_invitations_used_by
  on public.invitations(used_by);

-- 12. invoices (proposal_id -> proposals.id)
create index if not exists idx_invoices_proposal_id
  on public.invoices(proposal_id);

-- 13. operations_tasks (assigned_to -> users.id)
create index if not exists idx_operations_tasks_assigned_to
  on public.operations_tasks(assigned_to);

-- 14. operations_tasks (project_id -> operations_projects.id)
create index if not exists idx_operations_tasks_project_id
  on public.operations_tasks(project_id);

-- 15. proposal_acceptance_logs (proposal_id -> proposals.id)
create index if not exists idx_proposal_acceptance_logs_proposal_id
  on public.proposal_acceptance_logs(proposal_id);

-- 16. proposals (crm_deal_id -> crm_deals.id)
create index if not exists idx_proposals_crm_deal_id
  on public.proposals(crm_deal_id);

-- 17. proposals (deal_id -> crm_deals.id)
create index if not exists idx_proposals_deal_id
  on public.proposals(deal_id);

commit;
