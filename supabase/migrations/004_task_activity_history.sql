-- ================================================================
-- 004_task_activity_history.sql
-- CoachData Operational OS v2 — Official Approved Migration
--
-- APLICADA EN PRODUCCIÓN el 19 de agosto de 2026, no antes. Estuvo meses
-- versionada sin aplicar: el frontend consultaba la tabla y recibía 404 en
-- cada carga del dashboard y de Project Desk, en silencio. La 026 la nombra
-- en su lista pero se la saltó sin ruido por su guarda `to_regclass is null`.
--
-- Las dos políticas llevan `get_auth_user_organizations()` envuelto en un
-- subselect, que es como quedaron las 61 políticas del esquema tras las
-- migraciones 032 y 033. El fichero original lo llamaba sin envolver, lo que
-- habría reintroducido la evaluación una vez por fila que aquellas quitaron.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.task_activity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    task_id UUID NOT NULL
        REFERENCES public.operations_tasks(id)
        ON DELETE CASCADE,

    actor_id UUID
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    actor_name VARCHAR(255),

    action_type VARCHAR(100) NOT NULL CHECK (
        action_type IN (
            'created',
            'updated',
            'status_changed',
            'priority_changed',
            'assigned',
            'deleted'
        )
    ),

    field_name VARCHAR(100),

    previous_value JSONB,
    new_value JSONB,

    metadata_json JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_task_activity_history_org
    ON public.task_activity_history(organization_id);

CREATE INDEX IF NOT EXISTS idx_task_activity_history_task
    ON public.task_activity_history(task_id);

CREATE INDEX IF NOT EXISTS idx_task_activity_history_actor
    ON public.task_activity_history(actor_id);

CREATE INDEX IF NOT EXISTS idx_task_activity_history_created
    ON public.task_activity_history(created_at DESC);

-- RLS
ALTER TABLE public.task_activity_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_activity_history_select
ON public.task_activity_history;

CREATE POLICY task_activity_history_select
ON public.task_activity_history
FOR SELECT
USING (
    organization_id IN (
        SELECT (select public.get_auth_user_organizations())
    )
);

DROP POLICY IF EXISTS task_activity_history_insert
ON public.task_activity_history;

CREATE POLICY task_activity_history_insert
ON public.task_activity_history
FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT (select public.get_auth_user_organizations())
    )
);

-- REALTIME
ALTER PUBLICATION supabase_realtime
ADD TABLE public.task_activity_history;
