-- CoachData Operational OS v2 — Native Revenue CRM Schema
-- Table setups for Phases 1, 2, 3, and 4
-- Multi-tenant isolation RLS rules

-- FASE 1: CRM CORE
CREATE TABLE IF NOT EXISTS crm_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  website text,
  industry text,
  company_size text,
  country text,
  timezone text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  company_id uuid references crm_companies(id) on delete set null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  linkedin_url text,
  job_title text,
  source text,
  lead_score integer default 0,
  status text default 'new',
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS crm_deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  company_id uuid references crm_companies(id) on delete set null,
  primary_contact_id uuid references crm_contacts(id) on delete set null,
  title text not null,
  stage text not null default 'lead',
  value numeric(12,2),
  currency text default 'EUR',
  probability integer default 10,
  expected_close_date date,
  owner_id uuid,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS deal_ai_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deal_id uuid references crm_deals(id) on delete cascade,
  confidence_score integer,
  qualification_level text,
  pain_points jsonb default '[]'::jsonb,
  recommended_offer text,
  next_best_action text,
  generated_at timestamptz default now()
);

-- FASE 2: CALL INTELLIGENCE
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deal_id uuid references crm_deals(id) on delete set null,
  audio_path text,
  duration_seconds integer,
  transcript text,
  status text default 'uploaded',
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS call_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  call_id uuid references call_sessions(id) on delete cascade,
  interest_score integer,
  budget_detected boolean,
  timeline_detected text,
  pain_points jsonb default '[]'::jsonb,
  objections jsonb default '[]'::jsonb,
  commitments jsonb default '[]'::jsonb,
  recommended_proposal jsonb default '{}'::jsonb,
  generated_at timestamptz default now()
);

-- FASE 3: PROPOSALS, CONTRACTS & INVOICES
CREATE TABLE IF NOT EXISTS proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deal_id uuid references crm_deals(id) on delete set null,
  title text,
  content jsonb default '{}'::jsonb,
  monthly_amount numeric(12,2),
  currency text default 'EUR',
  status text default 'draft',
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  proposal_id uuid references proposals(id) on delete cascade,
  template_key text,
  generated_pdf_url text,
  status text default 'draft',
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  proposal_id uuid references proposals(id) on delete cascade,
  stripe_invoice_id text,
  amount numeric(12,2),
  currency text default 'EUR',
  status text default 'draft',
  created_at timestamptz default now()
);

-- FASE 4: AUTOMATION JOB BUS
CREATE TABLE IF NOT EXISTS automation_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  source_module text,
  external_execution_id text,
  result jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- ----------------------------------------------------
-- Row Level Security (RLS) policies
-- ----------------------------------------------------
ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;

-- Dynamic tenant isolation policies based on organization_id
-- We assume organization_id exists as claims or parameter checking.

-- crm_companies
CREATE POLICY tenant_isolation_select_companies ON crm_companies FOR SELECT USING (true); -- Placeholder to enable default client operations or auth-based matching. Adjust USING clauses per actual auth setup.
CREATE POLICY tenant_isolation_insert_companies ON crm_companies FOR INSERT WITH CHECK (true);
CREATE POLICY tenant_isolation_update_companies ON crm_companies FOR UPDATE USING (true);
CREATE POLICY tenant_isolation_delete_companies ON crm_companies FOR DELETE USING (true);

-- Repeat default policies for remaining tables to ensure RLS is active but non-blocking for prototype / service role.
-- Note: Replace USING(true) with authenticating tenant context claims if strict authentication context JWT contains tenant identity.
CREATE POLICY tenant_isolation_contacts ON crm_contacts FOR ALL USING (true);
CREATE POLICY tenant_isolation_deals ON crm_deals FOR ALL USING (true);
CREATE POLICY tenant_isolation_deal_insights ON deal_ai_insights FOR ALL USING (true);
CREATE POLICY tenant_isolation_call_sessions ON call_sessions FOR ALL USING (true);
CREATE POLICY tenant_isolation_call_analysis ON call_ai_analysis FOR ALL USING (true);
CREATE POLICY tenant_isolation_proposals ON proposals FOR ALL USING (true);
CREATE POLICY tenant_isolation_contracts ON contracts FOR ALL USING (true);
CREATE POLICY tenant_isolation_invoices ON invoices FOR ALL USING (true);
CREATE POLICY tenant_isolation_automation ON automation_jobs FOR ALL USING (true);
