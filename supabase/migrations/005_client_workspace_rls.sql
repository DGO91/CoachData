-- ================================================================
-- 005_CLIENT_WORKSPACE_RLS.SQL — CoachData Operational OS v2 (Phase 7)
-- Migration: External Client Workspace Security Policies & Deliverables (Hardened)
-- ================================================================

-- APLICADA EN PRODUCCIÓN el 19 de agosto de 2026, no antes. Estuvo meses
-- versionada sin aplicar: client_project_access, client_deliverables y el rol client_guest
-- no existían, y el Portal de Clientes consultaba tablas ausentes.
--
-- Las políticas llevan auth.uid() envuelto en un subselect, como quedó el
-- resto del esquema tras las migraciones 032 y 033. El fichero original lo
-- llamaba sin envolver, lo que habría reintroducido la evaluación por fila.
-- ================================================================

-- 1. Asegurar role 'client_guest' en organization_memberships sin romper registros
ALTER TABLE public.organization_memberships 
DROP CONSTRAINT IF EXISTS organization_memberships_role_check;

ALTER TABLE public.organization_memberships 
ADD CONSTRAINT organization_memberships_role_check 
CHECK (role IN ('owner', 'admin', 'manager', 'member', 'client_guest'));

-- 2. Tabla de Asignación de Proyectos a Clientes Externos
CREATE TABLE IF NOT EXISTS public.client_project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.operations_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_client_project_user UNIQUE (organization_id, project_id, user_id)
);

-- Índices de alto rendimiento para client_project_access
CREATE INDEX IF NOT EXISTS idx_client_project_access_org ON public.client_project_access(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_project_access_user ON public.client_project_access(user_id);
CREATE INDEX IF NOT EXISTS idx_client_project_access_project ON public.client_project_access(project_id);

ALTER TABLE public.client_project_access ENABLE ROW LEVEL SECURITY;

-- 3. Tabla de Entregables para Clientes
CREATE TABLE IF NOT EXISTS public.client_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.operations_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deliverable_url TEXT,
    status VARCHAR(50) DEFAULT 'pending_approval' CHECK (status IN ('draft', 'pending_approval', 'approved', 'revision_requested')),
    client_feedback TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de alto rendimiento para client_deliverables
CREATE INDEX IF NOT EXISTS idx_client_deliverables_org ON public.client_deliverables(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_deliverables_project ON public.client_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_client_deliverables_status ON public.client_deliverables(status);

ALTER TABLE public.client_deliverables ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS ESTRICTAS PARA CLIENT_GUEST & STAFF

-- 4.1 client_project_access
DROP POLICY IF EXISTS client_project_access_select ON public.client_project_access;
CREATE POLICY client_project_access_select ON public.client_project_access
    FOR SELECT USING (
        user_id = (select auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = client_project_access.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- 4.2 client_deliverables — SELECT (Ver solo sus proyectos asignados o staff de la org)
DROP POLICY IF EXISTS client_deliverables_select ON public.client_deliverables;
CREATE POLICY client_deliverables_select ON public.client_deliverables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.client_project_access cpa
            WHERE cpa.project_id = client_deliverables.project_id
            AND cpa.user_id = (select auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = client_deliverables.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager', 'member')
        )
    );

-- 4.3 client_deliverables — INSERT (PROHIBIDO A CLIENTES, SOLO STAFF DE LA ORG)
DROP POLICY IF EXISTS client_deliverables_insert ON public.client_deliverables;
CREATE POLICY client_deliverables_insert ON public.client_deliverables
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = client_deliverables.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager', 'member')
        )
    );

-- 4.4 client_deliverables — UPDATE (Cliente puede aprobar o pedir revisión solo de sus entregables asignados)
DROP POLICY IF EXISTS client_deliverables_update ON public.client_deliverables;
CREATE POLICY client_deliverables_update ON public.client_deliverables
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.client_project_access cpa
            WHERE cpa.project_id = client_deliverables.project_id
            AND cpa.user_id = (select auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = client_deliverables.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager', 'member')
        )
    );

-- 4.5 client_deliverables — DELETE (PROHIBIDO A CLIENTES, SOLO ADMINS/MANAGERS)
DROP POLICY IF EXISTS client_deliverables_delete ON public.client_deliverables;
CREATE POLICY client_deliverables_delete ON public.client_deliverables
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = client_deliverables.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- 5. task_activity_history — RLS RESTRICCIÓN PARA CLIENT_GUEST (TIMELINE SEGURO)
DROP POLICY IF EXISTS task_activity_history_client_select ON public.task_activity_history;
CREATE POLICY task_activity_history_client_select ON public.task_activity_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.operations_tasks ot
            JOIN public.client_project_access cpa ON cpa.project_id = ot.project_id
            WHERE ot.id = task_activity_history.task_id
            AND cpa.user_id = (select auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = task_activity_history.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager', 'member')
        )
    );
