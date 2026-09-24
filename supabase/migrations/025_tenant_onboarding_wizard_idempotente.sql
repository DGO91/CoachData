-- supabase/migrations/025_tenant_onboarding_wizard_idempotente.sql
--
-- tenant_onboarding_wizard creaba una organización nueva en cada llamada: el
-- INSERT de la migración 010 no comprobaba si el usuario ya tenía una y generaba
-- un slug aleatorio, así que nunca chocaba con nada.
--
-- La llama tenantContextMiddleware, que corre en toda petición autenticada,
-- cuando el usuario no tiene membresías y no envía x-organization-slug. El
-- frontend dispara varias peticiones al cargar el dashboard, de modo que un
-- usuario recién registrado podía acabar con tres o cuatro organizaciones, cada
-- una con su membresía de propietario.
--
-- Y el propio middleware las convierte después en un bloqueo: al detectar más de
-- una membresía responde 400 "El usuario pertenece a múltiples organizaciones.
-- Debe especificar la cabecera x-organization-slug explícitamente". El usuario
-- queda sin poder entrar, por una cabecera que la interfaz aún no sabe enviar
-- porque nunca llegó a elegir organización.
--
-- Esta versión devuelve la organización existente si ya hay uno, y serializa las
-- llamadas concurrentes del mismo usuario con un advisory lock de transacción:
-- sin él, dos peticiones simultáneas pasarían a la vez la comprobación de
-- existencia y volverían a duplicar.

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
  -- Serializa por usuario dentro de la transacción. Se libera solo al terminar,
  -- así que dos peticiones concurrentes del mismo usuario se ordenan y la
  -- segunda ve ya creada la organización de la primera.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- A. Insertar o verificar en public.users
  INSERT INTO public.users (id, email, full_name)
  VALUES (p_user_id, p_email, p_full_name)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- B. Si ya pertenece a alguna organización, esa es la suya. No se crea otra.
  SELECT organization_id INTO v_org_id
  FROM public.organization_memberships
  WHERE user_id = p_user_id
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- C. Sólo ahora: crear la organización
  INSERT INTO public.organizations (name, slug)
  VALUES (p_org_name, 'org-' || substr(md5(random()::text), 1, 8))
  RETURNING id INTO v_org_id;

  -- D. Asignar la membresía de propietario
  INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner');

  RETURN v_org_id;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Fallo en Onboarding: %', SQLERRM;
END;
$$;

-- Nota sobre los datos ya existentes: esta migración no fusiona las
-- organizaciones duplicadas que el comportamiento anterior haya podido crear.
-- Fusionarlas implica decidir cuál conserva los datos de cada cliente, y eso no
-- se automatiza a ciegas. Para localizarlas:
--
--   SELECT user_id, count(*) AS organizaciones
--   FROM public.organization_memberships
--   WHERE role = 'owner'
--   GROUP BY user_id
--   HAVING count(*) > 1;
