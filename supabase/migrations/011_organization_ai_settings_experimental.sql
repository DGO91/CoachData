-- ============================================================================
-- CoachData Operational OS v2
-- Migration: 011_organization_ai_settings_experimental.sql
-- Purpose: Schema for Organization AI Customization, Settings, and Multi-Tenant Prompts
-- Dependencies: public.organizations (001_security_patch.sql)
-- Rollback: DROP TABLE IF EXISTS public.organization_ai_settings CASCADE;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.organization_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  business_name TEXT NOT NULL,
  business_description TEXT,
  industry_sector TEXT NOT NULL DEFAULT 'business_coach_consulting',

  target_client_profile TEXT,
  service_catalog JSONB DEFAULT '[]'::jsonb,
  analysis_goals JSONB DEFAULT '[]'::jsonb,

  communication_style JSONB DEFAULT '{}'::jsonb,
  reporting_preferences JSONB DEFAULT '{}'::jsonb,

  whatsapp_signature TEXT,
  assistant_name TEXT DEFAULT 'Operations Assistant',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_org_ai_settings UNIQUE (organization_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_org_ai_settings ON public.organization_ai_settings;
CREATE TRIGGER set_updated_at_org_ai_settings
  BEFORE UPDATE ON public.organization_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Index for organization_id
CREATE INDEX IF NOT EXISTS idx_org_ai_settings_org ON public.organization_ai_settings(organization_id);

-- Enable RLS
ALTER TABLE public.organization_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own org ai settings" ON public.organization_ai_settings;
CREATE POLICY "Users can read own org ai settings" ON public.organization_ai_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can insert own ai settings" ON public.organization_ai_settings;
CREATE POLICY "Org members can insert own ai settings" ON public.organization_ai_settings
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org members can update own ai settings" ON public.organization_ai_settings;
CREATE POLICY "Org members can update own ai settings" ON public.organization_ai_settings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Seed Initial Setting for CoachData Organization (if present)
INSERT INTO public.organization_ai_settings (
  organization_id,
  business_name,
  business_description,
  industry_sector,
  target_client_profile,
  service_catalog,
  analysis_goals,
  assistant_name
)
SELECT
  id,
  'CoachData Media',
  'Operational systems and growth automation for business coaches and consultants',
  'business_coach_consulting',
  'Business coaches, consultants, strategists and premium service providers',
  '[
    "Lead follow-up systems",
    "Sales pipeline optimization",
    "Client onboarding automation",
    "Operational reporting"
  ]'::jsonb,
  '[
    "bottleneck_detection",
    "funnel_maturity_assessment",
    "automation_prioritization",
    "next_best_action"
  ]'::jsonb,
  'Growth & Operations Assistant'
FROM public.organizations
WHERE slug = 'coachdata-media'
ON CONFLICT (organization_id) DO NOTHING;

COMMIT;
