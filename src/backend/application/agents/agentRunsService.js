'use strict';

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

/**
 * Candado de ejecución por agente y organización.
 *
 * Sustituye a `isEveningSummaryRunning`, que era una variable de módulo: al ser
 * global del proceso, una organización que lanzaba el agente dejaba a todas las
 * demás con "Agent is already running", y el estado se perdía en cada
 * despliegue.
 *
 * La exclusión la garantiza Postgres con un índice único parcial sobre
 * singleton_key limitado a las filas activas (migración 041). Por eso aquí no
 * se consulta antes de insertar: se intenta insertar y se deja que la base de
 * datos rechace el duplicado. Comprobar y luego escribir es una carrera; dos
 * peticiones a la vez pasarían las dos la comprobación.
 *
 * El patrón viene de pg-boss, que resuelve lo mismo con singleton_key sobre una
 * tabla de Postgres.
 */

/** Violación de unicidad en Postgres: alguien ya tiene el candado. */
const CLAVE_DUPLICADA = '23505';

/** Cuánto puede vivir una ejecución antes de considerarse muerta. */
const EXPIRACION_POR_DEFECTO = 900; // 15 minutos

function claveDe(agentType, organizationId) {
  return `${agentType}:${organizationId}`;
}

/**
 * Libera los candados cuyo latido lleva más de su expiración sin refrescarse.
 *
 * Sin esto, un proceso que muere a media ejecución deja el agente bloqueado
 * para siempre en esa organización. Se marcan como 'failed' en vez de
 * borrarse, para que quede rastro de que se perdieron.
 */
async function liberarCaducados(supabase, singletonKey) {
  // audit-tenant-filter: exento — singleton_key es `agentType:organizationId`,
  // así que la organización ya está dentro del filtro; el barrido por regex no
  // la ve porque no aparece con ese nombre.
  const { error } = await supabase
    .from('agent_runs')
    .update({
      state: 'failed',
      completed_on: new Date().toISOString(),
      error: 'La ejecución dejó de dar señales y se dio por perdida'
    })
    .eq('singleton_key', singletonKey)
    .eq('state', 'active')
    .lt('heartbeat_on', new Date(Date.now() - EXPIRACION_POR_DEFECTO * 1000).toISOString());

  if (error) console.error('[AgentRuns] No se pudieron liberar candados caducados:', error.message);
}

/**
 * Intenta tomar el candado de este agente para esta organización.
 *
 * Devuelve { tomado: true, runId } si ha quedado en sus manos, o
 * { tomado: false, motivo } si ya estaba ocupado. Nunca lanza por el caso
 * normal de "ya está corriendo": eso es una respuesta, no un error.
 */
async function tomarCandado(organizationId, agentType, { expireSeconds = EXPIRACION_POR_DEFECTO } = {}) {
  if (!organizationId) throw new Error('Falta la organización');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('La base de datos no está disponible');

  const singletonKey = claveDe(agentType, organizationId);
  await liberarCaducados(supabase, singletonKey);

  const { data, error } = await supabase
    .from('agent_runs')
    .insert({
      organization_id: organizationId,
      agent_type: agentType,
      singleton_key: singletonKey,
      state: 'active',
      expire_seconds: expireSeconds
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === CLAVE_DUPLICADA) {
      return { tomado: false, motivo: 'Ya hay una ejecución en curso para esta organización' };
    }
    console.error('[AgentRuns] No se pudo tomar el candado:', error.message);
    throw new Error('No se pudo registrar la ejecución');
  }

  return { tomado: true, runId: data.id };
}

/** Refresca el latido de una ejecución viva, para que no se dé por perdida. */
async function latir(runId) {
  if (!runId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // audit-tenant-filter: exento — el latido lo emite quien sostiene el candado,
  // con el runId que recibió al tomarlo; no hay id que venga del cliente.
  const { error } = await supabase
    .from('agent_runs')
    .update({ heartbeat_on: new Date().toISOString() })
    .eq('id', runId)
    .eq('state', 'active');

  if (error) console.error('[AgentRuns] No se pudo refrescar el latido:', error.message);
}

/**
 * Cierra una ejecución y suelta el candado. `estado` es 'completed', 'failed' o
 * 'cancelled'.
 */
async function soltarCandado(runId, estado = 'completed', { output = null, error: motivo = null } = {}) {
  if (!runId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // audit-tenant-filter: exento — suelta el mismo candado que tomó quien llama,
  // por el runId que se le entregó.
  const { error } = await supabase
    .from('agent_runs')
    .update({
      state: estado,
      completed_on: new Date().toISOString(),
      ...(output === null ? {} : { output }),
      ...(motivo === null ? {} : { error: motivo })
    })
    .eq('id', runId);

  if (error) console.error('[AgentRuns] No se pudo cerrar la ejecución:', error.message);
}

/** La ejecución activa de este agente en esta organización, si la hay. */
async function ejecucionActiva(organizationId, agentType) {
  if (!organizationId) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const singletonKey = claveDe(agentType, organizationId);
  await liberarCaducados(supabase, singletonKey);

  // audit-tenant-filter: exento — filtra por singleton_key, que se construye
  // con el organizationId recibido como parámetro.
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, started_on, heartbeat_on')
    .eq('singleton_key', singletonKey)
    .eq('state', 'active')
    .maybeSingle();

  if (error) {
    console.error('[AgentRuns] No se pudo consultar la ejecución activa:', error.message);
    return null;
  }
  return data || null;
}

/** El resultado de la última ejecución terminada, para el panel de estado. */
async function ultimaEjecucion(organizationId, agentType) {
  if (!organizationId) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, state, started_on, completed_on, error')
    .eq('organization_id', organizationId)
    .eq('agent_type', agentType)
    .order('started_on', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[AgentRuns] No se pudo consultar la última ejecución:', error.message);
    return null;
  }
  return data || null;
}

module.exports = {
  EXPIRACION_POR_DEFECTO,
  claveDe,
  tomarCandado,
  latir,
  soltarCandado,
  ejecucionActiva,
  ultimaEjecucion
};
