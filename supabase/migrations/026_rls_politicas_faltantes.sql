-- supabase/migrations/026_rls_politicas_faltantes.sql
--
-- 42 tablas tienen RLS activa; sólo 18 tenían alguna política. En Postgres, RLS
-- activa sin políticas significa denegar todo, así que las 24 restantes son
-- inaccesibles para cualquier cliente que no sea service_role.
--
-- No se nota porque el backend consulta con SUPABASE_SERVICE_ROLE_KEY, que
-- bypassa RLS por diseño: hoy el aislamiento entre organizaciones depende por
-- completo de que cada consulta recuerde su filtro. Esta migración escribe las
-- políticas que faltan para que ese filtro pase a estar en la base de datos.
--
-- ES ADITIVA Y NO CAMBIA EL COMPORTAMIENTO ACTUAL. Mientras el backend siga
-- usando service_role, estas políticas no intervienen. Empiezan a aplicar
-- cuando las consultas de sesión pasen a hacerse con el JWT del usuario, que es
-- el paso siguiente y separado a propósito: primero existe la red, después se
-- suelta el trapecio.

-- ---------------------------------------------------------------------------
-- 1. Resolución de pertenencia, sin recursión
-- ---------------------------------------------------------------------------
--
-- Las políticas necesitan saber a qué organizaciones pertenece quien consulta,
-- y esa respuesta está en organization_memberships. Consultarla directamente
-- desde la política de organization_memberships provocaría recursión infinita.
--
-- Una función SECURITY DEFINER la resuelve: se ejecuta con los privilegios de
-- su creador y por tanto no vuelve a evaluar RLS sobre la tabla que lee. Vive
-- en un esquema propio, no expuesto por PostgREST, y comprueba dentro del
-- cuerpo la identidad de quien llama — nunca acepta un id de usuario como
-- parámetro, que es lo que la convertiría en una puerta trasera.
create schema if not exists private;

create or replace function private.user_org_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select organization_id
  from public.organization_memberships
  where user_id = (select auth.uid());
$$;

revoke execute on function private.user_org_ids() from public, anon;

-- Misma razón, para el rol de propietario. Comprobar "es owner de esta
-- organización" con un EXISTS sobre organization_memberships desde una política
-- de esa misma tabla provoca "infinite recursion detected in policy": la
-- subconsulta vuelve a evaluar la política que la contiene. SECURITY DEFINER
-- corta el ciclo porque la lectura interna no pasa por RLS.
create or replace function private.is_org_owner(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.organization_memberships
    where organization_id = p_org_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

revoke execute on function private.is_org_owner(uuid) from public, anon;

-- Quiénes comparten organización con quien consulta. Se resuelve aquí, y no
-- con una subconsulta dentro de la política de users, para que esa lectura no
-- tenga que atravesar a su vez las políticas de organization_memberships.
create or replace function private.org_teammate_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select m.user_id
  from public.organization_memberships m
  where m.organization_id in (
    select organization_id
    from public.organization_memberships
    where user_id = (select auth.uid())
  );
$$;

revoke execute on function private.org_teammate_ids() from public, anon;

-- Cada evaluación de política consulta las membresías del usuario. Sin este
-- índice sería un recorrido secuencial por fila comprobada.
create index if not exists idx_org_memberships_user
  on public.organization_memberships(user_id);

create index if not exists idx_org_memberships_org_user
  on public.organization_memberships(organization_id, user_id);

-- ---------------------------------------------------------------------------
-- 2. Tablas con organization_id: mismo patrón para todas
-- ---------------------------------------------------------------------------
--
-- Se genera en bucle en lugar de escribir noventa y tantas políticas a mano:
-- el patrón es idéntico y una errata en una sola tabla abriría un hueco difícil
-- de ver revisando el diff.
--
-- `to authenticated` deja fuera al rol anon. `using` filtra lo que se lee y
-- `with check` impide escribir filas en una organización ajena — sin él, un
-- INSERT podría poner cualquier organization_id.
--
-- La llamada va envuelta en (select ...) para que Postgres la evalúe una vez
-- por consulta y no una vez por fila.
do $$
declare
  t text;
  tablas text[] := array[
    'ai_agent_logs', 'automation_jobs', 'call_ai_analysis', 'call_sessions',
    'client_action_audit', 'client_deliverables', 'client_files',
    'client_project_access', 'communication_messages', 'contracts',
    'crm_companies', 'crm_contacts', 'crm_deals', 'deal_ai_insights',
    'growth_content', 'invoices', 'operations_projects', 'operations_tasks',
    'task_activity_history'
  ];
begin
  foreach t in array tablas loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabla % no existe, se omite', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "org_members_manage" on public.%I', t);
    execute format($f$
      create policy "org_members_manage" on public.%I
        for all
        to authenticated
        using (organization_id in (select private.user_org_ids()))
        with check (organization_id in (select private.user_org_ids()))
    $f$, t);

    -- El filtro de la política es por organization_id: sin índice, cada
    -- consulta recorre la tabla entera.
    execute format('create index if not exists %I on public.%I(organization_id)',
                   'idx_' || t || '_org', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Tablas cuya tenencia no se expresa con organization_id
-- ---------------------------------------------------------------------------

-- organizations: la propia fila es el tenant.
drop policy if exists "org_members_read" on public.organizations;
create policy "org_members_read" on public.organizations
  for select to authenticated
  using (id in (select private.user_org_ids()));

-- Modificar la organización (nombre, plan, ajustes) es cosa del propietario,
-- no de cualquier miembro.
drop policy if exists "org_owners_update" on public.organizations;
create policy "org_owners_update" on public.organizations
  for update to authenticated
  using ((select private.is_org_owner(id)))
  with check ((select private.is_org_owner(id)));

-- organization_memberships: se ven las membresías de las organizaciones
-- propias — así el equipo aparece en la interfaz — pero sólo el propietario
-- puede alterarlas. Sin la función SECURITY DEFINER esto sería recursivo.
drop policy if exists "members_read_own_orgs" on public.organization_memberships;
create policy "members_read_own_orgs" on public.organization_memberships
  for select to authenticated
  using (organization_id in (select private.user_org_ids()));

drop policy if exists "owners_manage_members" on public.organization_memberships;
create policy "owners_manage_members" on public.organization_memberships
  for all to authenticated
  using ((select private.is_org_owner(organization_id)))
  with check ((select private.is_org_owner(organization_id)));

-- users: cada cual ve y edita su propia fila, y ve a quienes comparten
-- organización con él.
drop policy if exists "users_read_self_and_teammates" on public.users;
create policy "users_read_self_and_teammates" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or id in (select private.org_teammate_ids())
  );

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- tenants: modelo antiguo, ligado al usuario de auth y no a la organización.
-- Conviven dos convenciones —id = user id, o auth_user_id— y resolveOwnTenant()
-- en el backend acepta ambas; la política hace lo mismo para no invalidar filas
-- creadas por cualquiera de las dos vías.
do $$
begin
  if to_regclass('public.tenants') is not null then
    execute 'alter table public.tenants enable row level security';
    execute 'drop policy if exists "tenant_owner_all" on public.tenants';
    execute $f$
      create policy "tenant_owner_all" on public.tenants
        for all to authenticated
        using (auth_user_id = (select auth.uid()) or id = (select auth.uid()))
        with check (auth_user_id = (select auth.uid()) or id = (select auth.uid()))
    $f$;
  end if;
end $$;

-- client_provider_keys: credenciales cifradas, colgadas del tenant antiguo.
do $$
begin
  if to_regclass('public.client_provider_keys') is not null then
    execute 'alter table public.client_provider_keys enable row level security';
    execute 'drop policy if exists "tenant_owner_keys" on public.client_provider_keys';
    execute $f$
      create policy "tenant_owner_keys" on public.client_provider_keys
        for all to authenticated
        using (tenant_id in (
          select id from public.tenants
          where auth_user_id = (select auth.uid()) or id = (select auth.uid())
        ))
        with check (tenant_id in (
          select id from public.tenants
          where auth_user_id = (select auth.uid()) or id = (select auth.uid())
        ))
    $f$;
    execute 'create index if not exists idx_client_provider_keys_tenant
             on public.client_provider_keys(tenant_id)';
  end if;
end $$;

-- proposal_acceptance_logs: no lleva organization_id; su tenencia es la de la
-- propuesta a la que pertenece. Ya tenía SELECT e INSERT; se cierran UPDATE y
-- DELETE, que en un registro de auditoría no debería poder hacer nadie desde la
-- aplicación.
do $$
begin
  if to_regclass('public.proposal_acceptance_logs') is not null then
    execute 'drop policy if exists "no_modificar_auditoria" on public.proposal_acceptance_logs';
    execute $f$
      create policy "no_modificar_auditoria" on public.proposal_acceptance_logs
        for update to authenticated using (false)
    $f$;
    execute 'drop policy if exists "no_borrar_auditoria" on public.proposal_acceptance_logs';
    execute $f$
      create policy "no_borrar_auditoria" on public.proposal_acceptance_logs
        for delete to authenticated using (false)
    $f$;
  end if;
end $$;

-- invitations: tenía SELECT. La validación y el canje los sirve el router
-- público con service_role —quien canjea todavía no tiene sesión—, así que
-- aquí sólo se cubre la gestión desde la aplicación.
do $$
begin
  if to_regclass('public.invitations') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'invitations'
                   and column_name = 'organization_id') then
    execute 'drop policy if exists "org_members_manage_invitations" on public.invitations';
    execute $f$
      create policy "org_members_manage_invitations" on public.invitations
        for all to authenticated
        using (organization_id in (select private.user_org_ids()))
        with check (organization_id in (select private.user_org_ids()))
    $f$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Pendiente, deliberadamente fuera de esta migración
-- ---------------------------------------------------------------------------
-- Las políticas escritas antes de 2026-08-16 usan `auth.uid()` sin envolver en
-- (select ...), de modo que Postgres las evalúa una vez por fila en lugar de
-- una vez por consulta. Reescribirlas es mecánico, pero toca 18 tablas que hoy
-- funcionan y merece su propia migración y su propia verificación.
