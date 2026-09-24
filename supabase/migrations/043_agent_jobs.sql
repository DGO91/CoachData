-- Purpose: Cola de trabajos en Postgres, por organización.
-- ====================================================================
-- Migration: 043_agent_jobs.sql
--
-- Hoy 21 componentes del frontend lanzan trabajo con `await fetch` y se quedan
-- con la conexión HTTP abierta mientras el agente piensa. Un análisis de Claude
-- tarda entre 30 y 120 segundos, así que:
--
--   - recargar la página pierde el trabajo, y el backend sigue gastando
--     tokens para nadie;
--   - un proxy con tiempo de espera de 60 segundos corta la petición aunque el
--     backend termine bien: pagado y tirado;
--   - el resultado vive en useState y desaparece al cambiar de pestaña;
--   - no hay forma de auditar qué hizo cada agente y cuándo.
--
-- El esquema sigue al de pg-boss (timgit/pg-boss), leído en
-- COMPARATIVA-REFERENCIAS.md. No se adopta la librería: necesita conexión
-- directa a Postgres, que este proyecto no tiene configurada, y crea su propio
-- esquema con particiones y funciones que convivirían mal con las políticas RLS
-- que ya existen. Lo que se copia es el diseño, que está probado.
--
-- Diferencias deliberadas con pg-boss:
--   - No hay estado 'retry' aparte: un trabajo a reintentar vuelve a 'created'
--     con start_after en el futuro y retry_count mayor que cero. Un estado
--     menos que razonar.
--   - Cada trabajo lleva organization_id, porque aquí la cola es multi-inquilino
--     y el aislamiento no es opcional.

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Qué clase de trabajo es. Equivale al 'name' de pg-boss.
  queue text not null,
  state text not null default 'created',
  priority integer not null default 0,
  -- La entrada del trabajo y su resultado. Ambos jsonb: cada cola define su
  -- forma, y validarla es tarea de quien la encola.
  data jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  retry_limit integer not null default 2,
  retry_count integer not null default 0,
  retry_delay_seconds integer not null default 30,
  -- Opcional: impide dos trabajos vivos con la misma clave, igual que en
  -- agent_runs. Sirve para "no encolar otro informe si ya hay uno esperando".
  singleton_key text,
  -- Antes de esta hora el trabajo no se toma. Es lo que implementa el retroceso
  -- entre reintentos y los trabajos programados.
  start_after timestamptz not null default now(),
  started_on timestamptz,
  completed_on timestamptz,
  -- Se refresca mientras el trabajo corre. Uno activo cuyo latido pasó de
  -- expire_seconds se da por perdido y vuelve a la cola.
  heartbeat_on timestamptz,
  expire_seconds integer not null default 900,
  created_on timestamptz not null default now(),
  created_by uuid,
  constraint agent_jobs_state_valido
    check (state in ('created', 'active', 'completed', 'failed', 'cancelled')),
  constraint agent_jobs_reintentos_coherentes
    check (retry_count >= 0 and retry_limit >= 0)
);

-- El índice que usa la toma: sólo mira los que esperan turno.
create index if not exists agent_jobs_por_tomar
  on public.agent_jobs (queue, start_after, priority desc, created_on)
  where state = 'created';

-- Para el panel: los trabajos de una organización, del más nuevo al más viejo.
create index if not exists agent_jobs_por_organizacion
  on public.agent_jobs (organization_id, created_on desc);

-- Para reclamar los que dejaron de latir.
create index if not exists agent_jobs_activos
  on public.agent_jobs (heartbeat_on)
  where state = 'active';

-- Un trabajo vivo por clave. Como en agent_runs: la exclusión la garantiza
-- Postgres, no una comprobación previa que dos peticiones simultáneas pasarían.
create unique index if not exists agent_jobs_singleton_vivo
  on public.agent_jobs (singleton_key)
  where singleton_key is not null and state in ('created', 'active');

alter table public.agent_jobs enable row level security;

drop policy if exists "members see own org agent jobs" on public.agent_jobs;
create policy "members see own org agent jobs" on public.agent_jobs
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "service_role select agent jobs" on public.agent_jobs;
drop policy if exists "service_role insert agent jobs" on public.agent_jobs;
drop policy if exists "service_role update agent jobs" on public.agent_jobs;
drop policy if exists "service_role delete agent jobs" on public.agent_jobs;

create policy "service_role select agent jobs" on public.agent_jobs for select using ((select auth.role()) = 'service_role');
create policy "service_role insert agent jobs" on public.agent_jobs for insert with check ((select auth.role()) = 'service_role');
create policy "service_role update agent jobs" on public.agent_jobs for update using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');
create policy "service_role delete agent jobs" on public.agent_jobs for delete using ((select auth.role()) = 'service_role');

-- La toma del siguiente trabajo, en una sola sentencia.
--
-- FOR UPDATE SKIP LOCKED es la pieza que hace que esto sea una cola y no una
-- carrera: cada trabajador bloquea la fila que se lleva y los demás la saltan
-- en vez de esperarla. Sin eso, dos trabajadores tomarían el mismo trabajo o se
-- quedarían en fila india.
--
-- Hacerlo desde el cliente sería un select y luego un update, y entre los dos
-- cabe otro trabajador.
create or replace function public.tomar_siguiente_trabajo(p_queue text)
returns setof public.agent_jobs
language sql
volatile
security invoker
set search_path = public, pg_temp
as $$
  update public.agent_jobs
  set state = 'active',
      started_on = now(),
      heartbeat_on = now()
  where id = (
    select id
    from public.agent_jobs
    where queue = p_queue
      and state = 'created'
      and start_after <= now()
    order by priority desc, created_on
    for update skip locked
    limit 1
  )
  returning *;
$$;

-- Sólo el backend toma trabajos. Un usuario autenticado no debe poder vaciar
-- la cola de nadie.
revoke all on function public.tomar_siguiente_trabajo(text) from public, anon, authenticated;
grant execute on function public.tomar_siguiente_trabajo(text) to service_role;

comment on table public.agent_jobs is
  'Cola de trabajos por organización. Esquema inspirado en pg-boss; ver migración 043.';
