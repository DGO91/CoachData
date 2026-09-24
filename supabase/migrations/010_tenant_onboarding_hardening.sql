-- ============================================================================
-- CoachData — Tenant Onboarding Hardening
-- FASE 2: Prevención de Usuarios Huérfanos y Onboarding Transaccional
-- ============================================================================

-- 1. Asegurar restricciones críticas en organization_memberships
ALTER TABLE public.organization_memberships
  DROP CONSTRAINT IF EXISTS unique_org_user_membership;

ALTER TABLE public.organization_memberships
  ADD CONSTRAINT unique_org_user_membership UNIQUE (organization_id, user_id);

-- 2. Función Transaccional para Onboarding de Usuario
CREATE OR REPLACE FUNCTION public.tenant_onboarding_wizard(
  p_user_id UUID,
  p_email VARCHAR,
  p_full_name VARCHAR,
  p_org_name VARCHAR
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Rollback automático si alguna de estas instrucciones falla

  -- A. Insertar o verificar en public.users
  INSERT INTO public.users (id, email, full_name)
  VALUES (p_user_id, p_email, p_full_name)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- B. Crear la Organización
  INSERT INTO public.organizations (name, slug)
  VALUES (p_org_name, 'org-' || substr(md5(random()::text), 1, 8))
  RETURNING id INTO v_org_id;

  -- C. Asignar la Membresía Owner
  INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner');

  -- (Extensiones futuras: crear settings, vault namespace, etc. pueden ir aquí)

  RETURN v_org_id;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Fallo en Onboarding: %', SQLERRM;
END;
$$;
