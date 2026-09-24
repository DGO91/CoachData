-- supabase/migrations/028_grant_execute_helpers_rls.sql
--
-- Corrige un fallo de la migración 026.
--
-- Allí se revocó EXECUTE de las tres funciones auxiliares con
-- `revoke execute ... from public, anon`, con la intención de que nadie pudiera
-- invocarlas directamente desde la API. Pero en Postgres las funciones nacen con
-- EXECUTE concedido a PUBLIC, y quitarlo deja sin permiso a TODOS los roles que
-- no tengan un GRANT explícito — incluido `authenticated`.
--
-- Las políticas de RLS que llaman a estas funciones se evalúan con los
-- privilegios de quien hace la consulta, no con los del autor de la política.
-- Resultado: cualquier consulta hecha con el JWT de un usuario fallaba con
-- "permission denied for function user_org_ids", y por tanto TODAS las tablas
-- protegidas quedaban inaccesibles para los usuarios legítimos.
--
-- No se notaba porque el backend consulta con service_role, que salta RLS. Se
-- habría notado al migrar la primera ruta al cliente por petición: pantallas
-- vacías, sin ningún error visible. Lo detectó el control positivo de
-- scripts/test-rls-user-scoped.js, que comprueba que el dueño SÍ ve lo suyo —
-- sin esa comprobación, un RLS que bloquea a todo el mundo pasa por seguro.

grant usage on schema private to authenticated;

grant execute on function private.user_org_ids()        to authenticated;
grant execute on function private.is_org_owner(uuid)    to authenticated;
grant execute on function private.org_teammate_ids()    to authenticated;

-- anon sigue sin poder ejecutarlas: quien no ha iniciado sesión no tiene
-- organizaciones que resolver, y dejarlas abiertas ampliaría la superficie sin
-- ninguna necesidad.
revoke execute on function private.user_org_ids()     from anon;
revoke execute on function private.is_org_owner(uuid) from anon;
revoke execute on function private.org_teammate_ids() from anon;

comment on function private.user_org_ids() is
    'Organizaciones del usuario que consulta. SECURITY DEFINER para evitar la recursión al leer organization_memberships desde las políticas de esa misma tabla. Requiere EXECUTE para authenticated: las políticas la invocan con los privilegios de quien consulta.';
