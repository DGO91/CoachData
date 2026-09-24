-- Purpose: Ejecuciones de agente, con candado por organización.
-- ====================================================================
-- Migration: 041_agent_runs.sql
--
-- Hasta ahora "¿está corriendo este agente?" era una variable de módulo en
-- agentRoutes.js (isEveningSummaryRunning). Al ser global del proceso, una
-- organización que lanzaba el Evening Summary dejaba a todas las demás con
-- "Agent is already running", y el estado se perdía en cada despliegue.
--
-- El candado es un índice único parcial sobre singleton_key limitado a las
-- filas activas, como hace pg-boss. Así la exclusión la garantiza Postgres: dos
-- peticiones simultáneas no pueden crear dos ejecuciones activas de la misma
-- clave, sin comprobar-y-luego-insertar, que es una carrera.
--
-- Las políticas envuelven `auth.uid()` y `auth.role()` en un subselect, como
-- dejaron las migraciones 032 y 033: sin envolver, Postgres las trata como
-- volátiles y las evalúa una vez por fila examinada.

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_type text not null,
  -- '<agent_type>:<organization_id>': el ámbito del candado es la organización,
  -- nunca el proceso.
  singleton_key text not null,
  state text not null default 'active',
  started_on timestamptz not null default now(),
  -- Se refresca mientras la ejecución vive. Una activa cuyo latido pasó de
  -- expire_seconds se considera muerta y su candado se puede reclamar: si no,
  -- un proceso que muere a media ejecución bloquea al agente para siempre.
  heartbeat_on timestamptz not null default now(),
  completed_on timestamptz,
  expire_seconds integer not null default 900,
  output jsonb,
  error text,
  constraint agent_runs_state_valido
    check (state in ('active', 'completed', 'failed', 'cancelled'))
);

-- El candado. Sólo una fila activa por clave; las terminadas no estorban.
create unique index if not exists agent_runs_singleton_activo
  on public.agent_runs (singleton_key)
  where state = 'active';

create index if not exists agent_runs_org_agente
  on public.agent_runs (organization_id, agent_type, started_on desc);

alter table public.agent_runs enable row level security;

drop policy if exists "members see own org agent runs" on public.agent_runs;
create policy "members see own org agent runs" on public.agent_runs
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "service_role select agent runs" on public.agent_runs;
drop policy if exists "service_role insert agent runs" on public.agent_runs;
drop policy if exists "service_role update agent runs" on public.agent_runs;
drop policy if exists "service_role delete agent runs" on public.agent_runs;

create policy "service_role select agent runs" on public.agent_runs for select using ((select auth.role()) = 'service_role');
create policy "service_role insert agent runs" on public.agent_runs for insert with check ((select auth.role()) = 'service_role');
create policy "service_role update agent runs" on public.agent_runs for update using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');
create policy "service_role delete agent runs" on public.agent_runs for delete using ((select auth.role()) = 'service_role');
