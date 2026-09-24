-- supabase/migrations/030_revocar_public_en_funciones.sql
--
-- Corrige la 029, que no consiguió su efecto en tres de las cuatro funciones.
--
-- La 029 hacía `revoke execute ... from anon`, y eso no quita nada: Postgres
-- concede EXECUTE a PUBLIC al crear la función, y `anon` lo hereda de ahí.
-- Revocar del rol concreto no elimina el permiso heredado, así que
-- has_function_privilege('anon', …) seguía devolviendo true.
--
-- Para cerrarlas hay que revocar de PUBLIC. Y ahí está la trampa que la 026 pisó
-- y la 028 tuvo que arreglar: al revocar de PUBLIC también lo pierden
-- `authenticated` y `service_role`, y 62 políticas de RLS invocan estas
-- funciones. Por eso cada revocación va acompañada de su concesión explícita.
--
-- Resumen de por qué hacen falta las dos líneas juntas:
--   revoke from public  → cierra a quien no ha iniciado sesión
--   grant to <rol>      → devuelve el acceso a quien sí lo necesita

-- Leen organization_memberships saltándose RLS. Las usan 62 políticas, evaluadas
-- con los privilegios de quien consulta: `authenticated` no puede perderlas.
revoke execute on function public.get_auth_user_organizations() from public;
grant  execute on function public.get_auth_user_organizations() to authenticated, service_role;

revoke execute on function public.is_org_member(uuid) from public;
grant  execute on function public.is_org_member(uuid) to authenticated, service_role;

-- Crea organizaciones. La invoca el backend con service_role desde
-- tenantContextMiddleware; ningún usuario debería poder llamarla directamente.
revoke execute on function public.tenant_onboarding_wizard(uuid, varchar, varchar, varchar) from public;
grant  execute on function public.tenant_onboarding_wizard(uuid, varchar, varchar, varchar) to service_role;

-- Borra la propia cuenta y comprueba auth.uid() en su cuerpo: para el usuario
-- con sesión, nunca para anon.
revoke execute on function public.delete_own_user() from public;
grant  execute on function public.delete_own_user() to authenticated;
