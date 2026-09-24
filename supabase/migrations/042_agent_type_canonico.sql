-- Purpose: Un único nombre por agente, garantizado por la base de datos.
-- ====================================================================
-- Migration: 042_agent_type_canonico.sql
--
-- La 020 documentaba en un comentario los tipos 'evening_summary',
-- 'personal_agent' y 'precall'. Pero aplicarPackDeSector.js lleva meses
-- escribiendo 'morning_briefing' y 'pre_call', más 'weekly_digest' y
-- 'prospect_analyzer', que el comentario no contemplaba. Sólo coincidía uno.
--
-- El comentario nunca fue una restricción, así que las dos formas podían
-- convivir: el mismo agente con dos nombres en dos filas, y ninguna mandando.
-- Se adoptan los nombres que ya están escritos en los datos y se cierra la
-- puerta con un CHECK, para que la ambigüedad no pueda volver por descuido.

-- 1. Normalizar cualquier fila que haya quedado con el nombre viejo.
--    A día de hoy no hay ninguna; el update existe para que la migración sea
--    correcta en cualquier entorno, no sólo en producción.
--
--    Si una organización tuviera las dos formas del mismo agente, el índice
--    único (organization_id, agent_type) rechazaría el cambio. En ese caso se
--    borra primero la que no está siendo usada por el planificador: la que
--    lleva el nombre viejo, que ningún código escribe desde la migración 041.
delete from public.agent_schedules viejo
where viejo.agent_type in ('personal_agent', 'precall', 'morning_brief')
  and exists (
    select 1 from public.agent_schedules nuevo
    where nuevo.organization_id = viejo.organization_id
      and nuevo.agent_type = case viejo.agent_type
        when 'personal_agent' then 'morning_briefing'
        when 'morning_brief'  then 'morning_briefing'
        when 'precall'        then 'pre_call'
      end
  );

update public.agent_schedules
set agent_type = case agent_type
  when 'personal_agent' then 'morning_briefing'
  when 'morning_brief'  then 'morning_briefing'
  when 'precall'        then 'pre_call'
end
where agent_type in ('personal_agent', 'precall', 'morning_brief');

-- 2. Cerrar la puerta. Los cinco nombres son los que escribe el pack de sector
--    y los que lee agentSchedulesService.js.
alter table public.agent_schedules
  drop constraint if exists agent_schedules_agent_type_canonico;

alter table public.agent_schedules
  add constraint agent_schedules_agent_type_canonico
  check (agent_type in (
    'morning_briefing',
    'evening_summary',
    'pre_call',
    'weekly_digest',
    'prospect_analyzer'
  ));

-- 3. Lo mismo para las ejecuciones, que nacieron en la 041 sin restricción.
alter table public.agent_runs
  drop constraint if exists agent_runs_agent_type_canonico;

alter table public.agent_runs
  add constraint agent_runs_agent_type_canonico
  check (agent_type in (
    'morning_briefing',
    'evening_summary',
    'pre_call',
    'weekly_digest',
    'prospect_analyzer'
  ));

comment on column public.agent_schedules.agent_type is
  'Nombre canónico del agente. Restringido por agent_schedules_agent_type_canonico; ver migración 042.';
