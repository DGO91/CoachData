-- 039_client_workspaces.sql
--
-- `client_workspaces` es la tabla que el Portal de Clientes consulta y que
-- nunca existió. No es una migración sin aplicar como las cinco de esta misma
-- jornada: **nadie la había escrito**. La leía
-- `ClientPortalHome.jsx:40` y la escribía `AutomationDispatcher.js:119`, y el
-- portal llevaba desde siempre devolviendo su estado vacío.
--
-- Por qué no se detectó antes: la documentación afirmaba que existía.
-- `SUPABASE_MIGRATION_INVENTORY_v1.0.md` dice que la 005 crea
-- `client_workspaces` y `deliverables` —crea `client_project_access` y
-- `client_deliverables`—, y `REVENUE_E2E_VALIDATION.md` marca **PASS** para
-- «Client Workspace → client_workspaces». Un documento daba por validada una
-- tabla que no estaba.
--
-- El esquema se deduce de los dos únicos sitios que la usan, no de esos
-- documentos:
--
--   organization_id     la organización DEL CLIENTE, que
--                       AutomationDispatcher crea justo antes con plan_tier
--                       'client'. Única: una organización de cliente es un
--                       workspace y no dos.
--   provider_tenant_id  la organización DEL COACH. El nombre engaña —contiene
--                       un organization_id, no un tenant_id— pero no se
--                       renombra: es por donde filtra ClientPortalHome y
--                       cambiarlo rompería los dos ficheros que lo usan.
--   status              sólo se escribe 'active'. El CHECK admite además
--                       'suspended' y 'archived', que son los estados que un
--                       workspace puede necesitar; si hiciera falta otro, se
--                       amplía aquí.
--   proposal_id         la propuesta aprobada que disparó el aprovisionamiento.
--                       ON DELETE SET NULL: borrar una propuesta no debe
--                       llevarse por delante el workspace del cliente.
--
-- Las políticas usan `private.user_org_ids()` con subselect, que es la
-- generación vigente tras las migraciones 026, 032 y 033.
--
-- ATENCIÓN: esta migración por sí sola NO arregla el aprovisionamiento. El
-- insert previo en `organizations` escribía `owner_email` y
-- `created_by_tenant`, dos columnas que no existen en esa tabla, así que
-- fallaba antes de llegar aquí. Eso se corrige en el mismo commit, en
-- AutomationDispatcher.js: esos datos ya viven en esta tabla —client_email y
-- provider_tenant_id— y duplicarlos en `organizations` sólo daría ocasión de
-- que se desincronizaran.

begin;

create table if not exists public.client_workspaces (
    id uuid primary key default uuid_generate_v4(),

    organization_id uuid not null unique
        references public.organizations(id) on delete cascade,

    provider_tenant_id uuid not null
        references public.organizations(id) on delete cascade,

    client_name text,
    client_email text,
    client_company text,

    status text not null default 'active'
        check (status in ('active', 'suspended', 'archived')),

    proposal_id uuid
        references public.proposals(id) on delete set null,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- El portal filtra por provider_tenant_id y ordena por created_at.
create index if not exists idx_client_workspaces_provider
    on public.client_workspaces(provider_tenant_id, created_at desc);

-- Las otras dos claves ajenas, para que no engrosen el aviso de
-- `unindexed_foreign_keys` que la 034 acaba de dejar a cero.
create index if not exists idx_client_workspaces_org
    on public.client_workspaces(organization_id);
create index if not exists idx_client_workspaces_proposal
    on public.client_workspaces(proposal_id);

alter table public.client_workspaces enable row level security;

-- El coach ve y gobierna los workspaces que ha provisionado.
drop policy if exists client_workspaces_select on public.client_workspaces;
create policy client_workspaces_select on public.client_workspaces
    for select to authenticated
    using (provider_tenant_id in (select (select private.user_org_ids())));

drop policy if exists client_workspaces_insert on public.client_workspaces;
create policy client_workspaces_insert on public.client_workspaces
    for insert to authenticated
    with check (provider_tenant_id in (select (select private.user_org_ids())));

drop policy if exists client_workspaces_update on public.client_workspaces;
create policy client_workspaces_update on public.client_workspaces
    for update to authenticated
    using (provider_tenant_id in (select (select private.user_org_ids())));

-- Sin política de DELETE a propósito: un workspace se archiva cambiando
-- `status`, no se borra. Si alguna vez hace falta borrarlos, será una decisión
-- explícita con su propia política.

commit;
