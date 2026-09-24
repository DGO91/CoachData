-- ================================================================
-- 003_UPDATED_AT_TRIGGERS.SQL — CoachData Operational OS v2
-- Migration: Global set_updated_at Function & Triggers Application
-- ================================================================

-- 1. FUNCIÓN GLOBAL SET_UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. APLICACIÓN DE TRIGGERS EN TODAS LAS TABLAS CON UPDATED_AT

-- A. ORGANIZATIONS
DROP TRIGGER IF EXISTS tr_set_updated_at_organizations ON public.organizations;
CREATE TRIGGER tr_set_updated_at_organizations
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- B. USERS
DROP TRIGGER IF EXISTS tr_set_updated_at_users ON public.users;
CREATE TRIGGER tr_set_updated_at_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- C. OPERATIONS_PROJECTS
DROP TRIGGER IF EXISTS tr_set_updated_at_projects ON public.operations_projects;
CREATE TRIGGER tr_set_updated_at_projects
BEFORE UPDATE ON public.operations_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- D. OPERATIONS_TASKS
DROP TRIGGER IF EXISTS tr_set_updated_at_tasks ON public.operations_tasks;
CREATE TRIGGER tr_set_updated_at_tasks
BEFORE UPDATE ON public.operations_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- E. GROWTH_CONTENT
DROP TRIGGER IF EXISTS tr_set_updated_at_growth_content ON public.growth_content;
CREATE TRIGGER tr_set_updated_at_growth_content
BEFORE UPDATE ON public.growth_content
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- F. COMMUNICATION_MESSAGES
DROP TRIGGER IF EXISTS tr_set_updated_at_comm_messages ON public.communication_messages;
CREATE TRIGGER tr_set_updated_at_comm_messages
BEFORE UPDATE ON public.communication_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
