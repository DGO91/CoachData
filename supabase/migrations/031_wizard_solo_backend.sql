-- supabase/migrations/031_wizard_solo_backend.sql
--
-- tenant_onboarding_wizard seguía siendo invocable por `authenticated` a través
-- de /rest/v1/rpc/tenant_onboarding_wizard, incluso después de revocar PUBLIC en
-- la 030: conservaba una concesión directa a ese rol, heredada de cuando se creó
-- a mano en el editor SQL.
--
-- Esa función CREA organizaciones y membresías de propietario. La invoca el
-- backend con service_role desde tenantContextMiddleware; ningún usuario final
-- tiene motivo para llamarla, y desde el navegador podría fabricar
-- organizaciones a voluntad. Que sea idempotente desde la 025 limita el daño
-- —devuelve la que ya tenga— pero no es razón para dejarla abierta.
--
-- Las otras dos SECURITY DEFINER de este esquema, is_org_member y
-- get_auth_user_organizations, SÍ deben quedar accesibles a `authenticated`: 62
-- políticas de RLS las invocan y se evalúan con los privilegios de quien
-- consulta. El aviso del linter sobre ellas es esperado, no un descuido.

revoke execute on function public.tenant_onboarding_wizard(uuid, varchar, varchar, varchar) from authenticated;
