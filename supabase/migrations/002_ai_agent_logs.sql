-- ================================================================
-- 002_AI_AGENT_LOGS.SQL — CoachData Operational OS v2
-- Migration: Creation & RLS Policies for ai_agent_logs Table
-- ================================================================

-- 1. TABLA: ai_agent_logs
CREATE TABLE IF NOT EXISTS public.ai_agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    input_payload JSONB,
    output_response JSONB,
    error_message TEXT,
    status VARCHAR(20) NOT NULL,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_org ON public.ai_agent_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_status ON public.ai_agent_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_created ON public.ai_agent_logs(created_at DESC);

-- 3. HABILITACIÓN DE RLS Y POLICIES GRANULARES (SELECT, INSERT)
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_logs_select_policy ON public.ai_agent_logs;
DROP POLICY IF EXISTS agent_logs_insert_policy ON public.ai_agent_logs;

CREATE POLICY agent_logs_select_policy ON public.ai_agent_logs FOR SELECT
USING (organization_id IN (SELECT public.get_auth_user_organizations()));

CREATE POLICY agent_logs_insert_policy ON public.ai_agent_logs FOR INSERT
WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
