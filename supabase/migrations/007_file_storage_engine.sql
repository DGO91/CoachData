-- ================================================================
-- 007_FILE_STORAGE_ENGINE.SQL — CoachData Operational OS v2 (Phase 7.2)
-- Migration: Supabase Storage Metadata & RLS Policies
-- ================================================================

-- APLICADA EN PRODUCCIÓN el 19 de agosto de 2026, no antes. Estuvo meses
-- versionada sin aplicar: client_files
-- no existían, y el Portal de Clientes consultaba tablas ausentes.
--
-- Las políticas llevan auth.uid() envuelto en un subselect, como quedó el
-- resto del esquema tras las migraciones 032 y 033. El fichero original lo
-- llamaba sin envolver, lo que habría reintroducido la evaluación por fila.
-- ================================================================

-- 1. Tabla de Metadatos de Archivos
CREATE TABLE IF NOT EXISTS public.client_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.operations_projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    visibility TEXT DEFAULT 'client_shared' CHECK (visibility IN ('internal_only', 'client_shared')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_client_files_org ON public.client_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_files_project ON public.client_files(project_id);
CREATE INDEX IF NOT EXISTS idx_client_files_uploader ON public.client_files(uploaded_by);

-- RLS EN CLIENT_FILES
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

-- SELECT POLICY: Staff ve todos los archivos de su org; client_guest solo los de sus proyectos asignados (visibility = 'client_shared')
DROP POLICY IF EXISTS client_files_select ON public.client_files;
CREATE POLICY client_files_select ON public.client_files
    FOR SELECT USING (
        (
            visibility = 'client_shared' AND
            EXISTS (
                SELECT 1 FROM public.client_project_access cpa
                WHERE cpa.project_id = client_files.project_id
                AND cpa.user_id = (select auth.uid())
            )
        ) OR
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = client_files.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager', 'member')
        )
    );

-- INSERT POLICY: Permitir a clientes y staff subir archivos a sus proyectos autorizados
DROP POLICY IF EXISTS client_files_insert ON public.client_files;
CREATE POLICY client_files_insert ON public.client_files
    FOR INSERT WITH CHECK (
        uploaded_by = (select auth.uid()) AND (
            EXISTS (
                SELECT 1 FROM public.client_project_access cpa
                WHERE cpa.project_id = client_files.project_id
                AND cpa.user_id = (select auth.uid())
            ) OR
            EXISTS (
                SELECT 1 FROM public.organization_memberships om
                WHERE om.organization_id = client_files.organization_id
                AND om.user_id = (select auth.uid())
                AND om.role IN ('owner', 'admin', 'manager', 'member')
            )
        )
    );

-- DELETE POLICY: Solo staff autorizado puede eliminar archivos
DROP POLICY IF EXISTS client_files_delete ON public.client_files;
CREATE POLICY client_files_delete ON public.client_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.organization_id = client_files.organization_id
            AND om.user_id = (select auth.uid())
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );
