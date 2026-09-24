-- ================================================================
-- 006_CLIENT_ACTION_AUDIT.SQL — CoachData Operational OS v2 (Sprint 7.1)
-- Migration: Client Action Audit Trail Table & Security RLS
-- ================================================================

-- APLICADA EN PRODUCCIÓN el 19 de agosto de 2026, no antes. Estuvo meses
-- versionada sin aplicar: client_action_audit
-- no existían, y el Portal de Clientes consultaba tablas ausentes.
--
-- Las políticas llevan auth.uid() envuelto en un subselect, como quedó el
-- resto del esquema tras las migraciones 032 y 033. El fichero original lo
-- llamaba sin envolver, lo que habría reintroducido la evaluación por fila.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.client_action_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.operations_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR AUDIT PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_client_action_audit_org ON public.client_action_audit(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_action_audit_project ON public.client_action_audit(project_id);
CREATE INDEX IF NOT EXISTS idx_client_action_audit_user ON public.client_action_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_client_action_audit_action ON public.client_action_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_client_action_audit_created ON public.client_action_audit(created_at DESC);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.client_action_audit ENABLE ROW LEVEL SECURITY;

-- 1. INSERT POLICY: Permitir a clientes y staff registrar auditoría de sus propias acciones
DROP POLICY IF EXISTS client_action_audit_insert ON public.client_action_audit;
CREATE POLICY client_action_audit_insert ON public.client_action_audit
    FOR INSERT WITH CHECK (
        user_id = (select auth.uid())
    );

-- 2. SELECT POLICY: Permitir a staff de la org ver todos los logs de auditoría; cliente solo sus logs
DROP POLICY IF EXISTS client_action_audit_select ON public.client_action_audit;
CREATE POLICY client_action_audit_select ON public.client_action_audit
    FOR SELECT USING (
        user_id = (select auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = client_action_audit.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );
