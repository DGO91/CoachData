-- ============================================================================
-- CoachData Operational OS v2 — Native Revenue CRM Schema Migration
-- Migration: 007_revenue_crm_schema.sql
-- Compatibility: Supabase PostgreSQL 15 (SaaS Multi-tenant Isolation)
-- ============================================================================

-- ----------------------------------------------------
-- 0. GLOBAL UTILITIES & TRIGGER FUNCTIONS
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper Function: Retorna todas las organizaciones a las que pertenece el usuario autenticado (si no existe)
CREATE OR REPLACE FUNCTION public.get_auth_user_organizations()
RETURNS SETOF UUID AS $$
    SELECT organization_id 
    FROM public.organization_memberships 
    WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper Function: Valida pertenencia de usuario a organización específica
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.organization_memberships 
        WHERE organization_id = org_id AND user_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ----------------------------------------------------
-- 1. FASE 1: CRM CORE TABLES
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  company_size TEXT,
  country TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  job_title TEXT,
  source TEXT,
  lead_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'lead',
  value NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  probability INTEGER DEFAULT 10,
  expected_close_date DATE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  confidence_score INTEGER,
  qualification_level TEXT,
  pain_points JSONB DEFAULT '[]'::jsonb,
  recommended_offer TEXT,
  next_best_action TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ----------------------------------------------------
-- 2. FASE 2: CALL INTELLIGENCE TABLES
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  audio_path TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
  interest_score INTEGER,
  budget_detected BOOLEAN,
  timeline_detected TEXT,
  pain_points JSONB DEFAULT '[]'::jsonb,
  objections JSONB DEFAULT '[]'::jsonb,
  commitments JSONB DEFAULT '[]'::jsonb,
  recommended_proposal JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ----------------------------------------------------
-- 3. FASE 3: PROPOSALS, CONTRACTS & INVOICES TABLES
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  title TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  monthly_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  template_key TEXT,
  generated_pdf_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ----------------------------------------------------
-- 4. FASE 4: AUTOMATION JOB BUS TABLES
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  source_module TEXT,
  external_execution_id TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ----------------------------------------------------
-- 5. TRIGGER REGISTRATIONS (updated_at updates)
-- ----------------------------------------------------
CREATE OR REPLACE TRIGGER trg_crm_companies_updated_at BEFORE UPDATE ON crm_companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_crm_deals_updated_at BEFORE UPDATE ON crm_deals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_deal_ai_insights_updated_at BEFORE UPDATE ON deal_ai_insights FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_call_sessions_updated_at BEFORE UPDATE ON call_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_call_ai_analysis_updated_at BEFORE UPDATE ON call_ai_analysis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_automation_jobs_updated_at BEFORE UPDATE ON automation_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ----------------------------------------------------
-- 6. HIGH PERFORMANCE INDEXES BY organization_id
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crm_companies_org ON crm_companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org ON crm_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_org ON crm_deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deal_ai_insights_org ON deal_ai_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_org ON call_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_ai_analysis_org ON call_ai_analysis(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org ON proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_org ON automation_jobs(organization_id);


-- ----------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Dynamic tenant isolation policies by organization memberships (owner, admin, member)
-- Fallback policy: allow service-role / admin overrides via schema controls.

-- crm_companies
CREATE POLICY org_isolation_select_companies ON crm_companies FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_companies ON crm_companies FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_companies ON crm_companies FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_companies ON crm_companies FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- crm_contacts
CREATE POLICY org_isolation_select_contacts ON crm_contacts FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_contacts ON crm_contacts FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_contacts ON crm_contacts FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_contacts ON crm_contacts FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- crm_deals
CREATE POLICY org_isolation_select_deals ON crm_deals FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_deals ON crm_deals FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_deals ON crm_deals FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_deals ON crm_deals FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- deal_ai_insights
CREATE POLICY org_isolation_select_deal_insights ON deal_ai_insights FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_deal_insights ON deal_ai_insights FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_deal_insights ON deal_ai_insights FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_deal_insights ON deal_ai_insights FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- call_sessions
CREATE POLICY org_isolation_select_call_sessions ON call_sessions FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_call_sessions ON call_sessions FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_call_sessions ON call_sessions FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_call_sessions ON call_sessions FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- call_ai_analysis
CREATE POLICY org_isolation_select_call_analysis ON call_ai_analysis FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_call_analysis ON call_ai_analysis FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_call_analysis ON call_ai_analysis FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_call_analysis ON call_ai_analysis FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- proposals
CREATE POLICY org_isolation_select_proposals ON proposals FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_proposals ON proposals FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_proposals ON proposals FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_proposals ON proposals FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- contracts
CREATE POLICY org_isolation_select_contracts ON contracts FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_contracts ON contracts FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_contracts ON contracts FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_contracts ON contracts FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- invoices
CREATE POLICY org_isolation_select_invoices ON invoices FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_invoices ON invoices FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_invoices ON invoices FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_invoices ON invoices FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- automation_jobs
CREATE POLICY org_isolation_select_automation ON automation_jobs FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_insert_automation ON automation_jobs FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_update_automation ON automation_jobs FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY org_isolation_delete_automation ON automation_jobs FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));
