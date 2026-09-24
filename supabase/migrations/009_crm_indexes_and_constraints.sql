-- Purpose: Schema hardening for CRM contacts and deals indexing
-- ====================================================================
-- Migration: 009_crm_indexes_and_constraints.sql

create index if not exists idx_crm_contacts_org_email
  on public.crm_contacts (organization_id, lower(email));
