-- supabase/migrations/029_cerrar_funciones_expuestas.sql
--
-- Cierra tres funciones SECURITY DEFINER que el rol `anon` podía invocar por la
-- API REST sin haber iniciado sesión:
--
--   /rest/v1/rpc/get_auth_user_organizations
--   /rest/v1/rpc/is_org_member
--   /rest/v1/rpc/tenant_onboarding_wizard
--
-- Las dos primeras leen organization_memberships saltándose RLS —para eso son
-- SECURITY DEFINER— y la tercera CREA organizaciones. Ninguna debería ser
-- alcanzable sin sesión.
--
-- Son anteriores a la migración 026 y viven en el esquema `public`, que PostgREST
-- expone. Las tres que añadió la 026 están en `private`, que no se expone: ese es
-- el motivo de haberlas puesto ahí.
--
-- SE REVOCA SÓLO DE `anon`, NUNCA DE `PUBLIC`.
--
-- Postgres concede EXECUTE a PUBLIC por omisión, y tanto `authenticated` como
-- `service_role` heredan de ahí. Revocar de PUBLIC se los quitaría a los dos:
-- 62 políticas de RLS invocan is_org_member y get_auth_user_organizations —en
-- crm_*, operations_*, proposals, invoices, users, organizations…— y esas
-- políticas se evalúan con los privilegios de quien consulta. Es exactamente el
-- fallo que la 026 introdujo y la 028 tuvo que corregir; aquí no se repite.

-- 1. search_path fijo, para que la resolución de nombres no dependa de quien
--    llama. Ambas cualifican ya sus tablas, así que el cuerpo no cambia.
create or replace function public.get_auth_user_organizations()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
    select organization_id
    from public.organization_memberships
    where user_id = auth.uid();
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.organization_memberships
        where organization_id = org_id and user_id = auth.uid()
    );
$$;

-- 2. Cerrar el acceso sin sesión.
revoke execute on function public.get_auth_user_organizations() from anon;
revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.tenant_onboarding_wizard(uuid, varchar, varchar, varchar) from anon;
revoke execute on function public.delete_own_user() from anon;

-- 3. Concesión explícita a quien sí las necesita. Redundante mientras el permiso
--    de PUBLIC siga en pie, y deliberado: si alguien revoca PUBLIC en el futuro
--    —como pasó en la 026— las políticas seguirán funcionando.
grant execute on function public.get_auth_user_organizations() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

-- tenant_onboarding_wizard la invoca el backend con service_role desde
-- tenantContextMiddleware, no el usuario.
grant execute on function public.tenant_onboarding_wizard(uuid, varchar, varchar, varchar) to service_role;

-- delete_own_user sí es para el usuario: borra su propia cuenta y comprueba
-- auth.uid() en su cuerpo. Que `authenticated` pueda llamarla es intencionado.
grant execute on function public.delete_own_user() to authenticated;

-- 4. search_path también en el wizard, que la 025 dejó sin fijar. Su cuerpo
--    cualifica todo con public., así que es seguro.
alter function public.tenant_onboarding_wizard(uuid, varchar, varchar, varchar) set search_path = '';

comment on function public.get_auth_user_organizations() is
    'Organizaciones del usuario autenticado. SECURITY DEFINER para no recursar sobre las políticas de organization_memberships. Cerrada a anon en la migración 029; 62 políticas dependen de que authenticated conserve EXECUTE.';
