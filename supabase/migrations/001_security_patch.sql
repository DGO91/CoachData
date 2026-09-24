-- ================================================================
-- 001_SECURITY_PATCH.SQL — CoachData Operational OS v2
-- Migration: Base Multitenant Tables & RLS Security Policies
-- ================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREACIÓN DE TABLAS BASE MULTI-TENANT (IF NOT EXISTS)

-- ORGANIZACIONES
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255),
    plan_tier VARCHAR(50) DEFAULT 'pro' CHECK (plan_tier IN ('free', 'pro', 'agency', 'enterprise')),
    settings_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USUARIOS GLOBALES
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MEMBRESÍAS DE ORGANIZACIÓN
CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'client_guest')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- OPERATIONS HUB (PROYECTOS Y TAREAS)
CREATE TABLE IF NOT EXISTS public.operations_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operations_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.operations_projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    due_date DATE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GROWTH HUB (CONTENIDOS)
CREATE TABLE IF NOT EXISTS public.growth_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    format VARCHAR(50) DEFAULT 'Reel',
    platform VARCHAR(50) DEFAULT 'Instagram',
    status VARCHAR(50) DEFAULT 'Ideas',
    script_content TEXT,
    notes TEXT,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COMMUNICATION HUB (MENSAJES)
CREATE TABLE IF NOT EXISTS public.communication_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    title_en TEXT,
    title_es TEXT,
    when_en TEXT,
    when_es TEXT,
    body_en TEXT,
    body_es TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HELPER FUNCTION: Obtener Organizaciones del Usuario Autenticado
CREATE OR REPLACE FUNCTION public.get_auth_user_organizations()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id
  FROM public.organization_memberships
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. HABILITACIÓN DE RLS Y POLICIES GRANULARES POR ACCIÓN

-- A. USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_select_policy ON public.users;
DROP POLICY IF EXISTS users_update_policy ON public.users;

CREATE POLICY users_select_policy ON public.users FOR SELECT
USING (id = auth.uid() OR id IN (SELECT user_id FROM public.organization_memberships WHERE organization_id IN (SELECT public.get_auth_user_organizations())));

CREATE POLICY users_update_policy ON public.users FOR UPDATE
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- B. ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_select_policy ON public.organizations;

CREATE POLICY org_select_policy ON public.organizations FOR SELECT
USING (id IN (SELECT public.get_auth_user_organizations()));

-- C. ORGANIZATION_MEMBERSHIPS
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_select_policy ON public.organization_memberships;

CREATE POLICY membership_select_policy ON public.organization_memberships FOR SELECT
USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- D. OPERATIONS_PROJECTS
ALTER TABLE public.operations_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_select_policy ON public.operations_projects;
DROP POLICY IF EXISTS projects_insert_policy ON public.operations_projects;
DROP POLICY IF EXISTS projects_update_policy ON public.operations_projects;
DROP POLICY IF EXISTS projects_delete_policy ON public.operations_projects;

CREATE POLICY projects_select_policy ON public.operations_projects FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY projects_insert_policy ON public.operations_projects FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY projects_update_policy ON public.operations_projects FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY projects_delete_policy ON public.operations_projects FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- E. OPERATIONS_TASKS
ALTER TABLE public.operations_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_select_policy ON public.operations_tasks;
DROP POLICY IF EXISTS tasks_insert_policy ON public.operations_tasks;
DROP POLICY IF EXISTS tasks_update_policy ON public.operations_tasks;
DROP POLICY IF EXISTS tasks_delete_policy ON public.operations_tasks;

CREATE POLICY tasks_select_policy ON public.operations_tasks FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY tasks_insert_policy ON public.operations_tasks FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY tasks_update_policy ON public.operations_tasks FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY tasks_delete_policy ON public.operations_tasks FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- F. GROWTH_CONTENT
ALTER TABLE public.growth_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_select_policy ON public.growth_content;
DROP POLICY IF EXISTS content_insert_policy ON public.growth_content;
DROP POLICY IF EXISTS content_update_policy ON public.growth_content;
DROP POLICY IF EXISTS content_delete_policy ON public.growth_content;

CREATE POLICY content_select_policy ON public.growth_content FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY content_insert_policy ON public.growth_content FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY content_update_policy ON public.growth_content FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY content_delete_policy ON public.growth_content FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));

-- G. COMMUNICATION_MESSAGES
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messages_select_policy ON public.communication_messages;
DROP POLICY IF EXISTS messages_insert_policy ON public.communication_messages;
DROP POLICY IF EXISTS messages_update_policy ON public.communication_messages;
DROP POLICY IF EXISTS messages_delete_policy ON public.communication_messages;

CREATE POLICY messages_select_policy ON public.communication_messages FOR SELECT USING (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY messages_insert_policy ON public.communication_messages FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY messages_update_policy ON public.communication_messages FOR UPDATE USING (organization_id IN (SELECT public.get_auth_user_organizations())) WITH CHECK (organization_id IN (SELECT public.get_auth_user_organizations()));
CREATE POLICY messages_delete_policy ON public.communication_messages FOR DELETE USING (organization_id IN (SELECT public.get_auth_user_organizations()));
