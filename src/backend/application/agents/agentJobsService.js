'use strict';

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

/**
 * Cola de trabajos en Postgres.
 *
 * Sustituye al patrón de "await fetch y esperar con la conexión abierta" que
 * usan hoy 21 componentes. Un análisis de Claude tarda entre 30 y 120 segundos:
 * recargar la página perdía el trabajo, un proxy con tiempo de espera de 60
 * segundos lo cortaba aunque el backend terminase bien, y el resultado vivía en
 * useState hasta que alguien cambiaba de pestaña.
 *
 * El diseño viene de pg-boss. La librería no se adopta porque necesita conexión
 * directa a Postgres, que este proyecto no configura, y crea su propio esquema
 * con particiones que convivirían mal con las políticas RLS ya escritas.
 *
 * Quien encola no espera. Encola, recibe un identificador, y pregunta por el
 * estado cuando quiera. El trabajo sobrevive a que se cierre el navegador, a
 * que se reinicie el proceso y a que se despliegue una versión nueva.
 */

const ESTADOS = ['created', 'active', 'completed', 'failed', 'cancelled'];
const ESTADOS_VIVOS = ['created', 'active'];

/** Tope de seguridad: un trabajo activo sin latido se da por perdido. */
const EXPIRACION_POR_DEFECTO = 900;

class TrabajoInvalidoError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'TrabajoInvalidoError';
  }
}

/** Violación de unicidad: ya hay un trabajo vivo con esa clave. */
const CLAVE_DUPLICADA = '23505';

/**
 * Cuánto espera un trabajo antes del siguiente intento.
 *
 * Retroceso exponencial a partir de su propio retardo: 30s, 60s, 120s. Un fallo
 * por un servicio caído no debe convertirse en una tanda de peticiones cada
 * treinta segundos contra algo que ya está en apuros.
 *
 * El tope evita que el sexto intento se programe para dentro de un día.
 */
const ESPERA_MAXIMA_SEGUNDOS = 3600;

function esperaDelReintento(intento, retardoBase) {
  const espera = retardoBase * Math.pow(2, Math.max(0, intento - 1));
  return Math.min(espera, ESPERA_MAXIMA_SEGUNDOS);
}

/** Si un trabajo activo dejó de dar señales. */
function estaPerdido(trabajo, ahora = Date.now()) {
  if (!trabajo || trabajo.state !== 'active') return false;
  const latido = trabajo.heartbeat_on ? new Date(trabajo.heartbeat_on).getTime() : 0;
  return ahora - latido > (trabajo.expire_seconds || EXPIRACION_POR_DEFECTO) * 1000;
}

function db() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('La base de datos no está disponible');
  return supabase;
}

/**
 * Pone un trabajo en la cola. Devuelve { encolado, jobId } o
 * { encolado: false, motivo } si ya hay uno vivo con la misma clave: eso es una
 * respuesta normal, no un error.
 *
 * `singletonKey` sirve para "no encoles otro informe si el anterior sigue
 * esperando". Sin ella se encolan tantos como se pidan.
 */
async function encolar(organizationId, queue, {
  data = {},
  priority = 0,
  singletonKey = null,
  retryLimit = 2,
  retryDelaySeconds = 30,
  expireSeconds = EXPIRACION_POR_DEFECTO,
  startAfter = null,
  createdBy = null
} = {}) {
  if (!organizationId) throw new TrabajoInvalidoError('Falta la organización');
  if (!queue || typeof queue !== 'string') throw new TrabajoInvalidoError('Falta la cola');

  const { data: fila, error } = await db()
    .from('agent_jobs')
    .insert({
      organization_id: organizationId,
      queue,
      data,
      priority,
      singleton_key: singletonKey,
      retry_limit: retryLimit,
      retry_delay_seconds: retryDelaySeconds,
      expire_seconds: expireSeconds,
      created_by: createdBy,
      ...(startAfter ? { start_after: new Date(startAfter).toISOString() } : {})
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === CLAVE_DUPLICADA) {
      return { encolado: false, motivo: 'Ya hay un trabajo en marcha para esta petición' };
    }
    console.error('[AgentJobs] No se pudo encolar:', error.message);
    throw new Error('No se pudo encolar el trabajo');
  }

  return { encolado: true, jobId: fila.id };
}

/**
 * Devuelve a la cola los trabajos activos que dejaron de dar señales.
 *
 * Un proceso que muere a media ejecución dejaría su trabajo en 'active' para
 * siempre. Se reencolan si les quedan reintentos; si no, quedan como fallidos
 * con el motivo escrito.
 */
async function recuperarPerdidos(queue) {
  const supabase = db();
  const ahora = Date.now();

  const { data: perdidos, error } = await supabase
    .from('agent_jobs')
    .select('id, retry_count, retry_limit, retry_delay_seconds, expire_seconds, heartbeat_on')
    .eq('queue', queue)
    .eq('state', 'active');

  if (error) {
    console.error('[AgentJobs] No se pudieron revisar los activos:', error.message);
    return 0;
  }

  let recuperados = 0;
  for (const trabajo of perdidos || []) {
    if (!estaPerdido({ ...trabajo, state: 'active' }, ahora)) continue;

    /* Se le descuenta el intento perdido, como haría un reintento normal: un
       trabajo que mata al proceso cada vez no debe reencolarse sin fin. */
    const puedeReintentar = trabajo.retry_count < trabajo.retry_limit;
    await supabase
      .from('agent_jobs')
      .update(puedeReintentar
        ? {
            state: 'created',
            retry_count: trabajo.retry_count + 1,
            start_after: new Date(ahora + trabajo.retry_delay_seconds * 1000).toISOString(),
            started_on: null,
            heartbeat_on: null
          }
        : {
            state: 'failed',
            completed_on: new Date(ahora).toISOString(),
            error: 'La ejecución dejó de dar señales y agotó sus reintentos'
          })
      .eq('id', trabajo.id)
      .eq('state', 'active');
    recuperados++;
  }

  return recuperados;
}

/**
 * Toma el siguiente trabajo de una cola, o null si no hay ninguno esperando.
 *
 * La toma la hace una función de Postgres con FOR UPDATE SKIP LOCKED: cada
 * trabajador bloquea la fila que se lleva y los demás la saltan. Hacerlo desde
 * aquí sería un select y luego un update, y entre los dos cabe otro trabajador.
 */
async function tomarSiguiente(queue) {
  await recuperarPerdidos(queue);

  const { data, error } = await db().rpc('tomar_siguiente_trabajo', { p_queue: queue });

  if (error) {
    console.error('[AgentJobs] No se pudo tomar el siguiente trabajo:', error.message);
    return null;
  }

  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
}

/** Refresca el latido de un trabajo en curso. */
async function latir(jobId) {
  if (!jobId) return;
  const { error } = await db()
    .from('agent_jobs')
    .update({ heartbeat_on: new Date().toISOString() })
    .eq('id', jobId)
    .eq('state', 'active');
  if (error) console.error('[AgentJobs] No se pudo refrescar el latido:', error.message);
}

/** Cierra un trabajo con su resultado. */
async function completar(jobId, output = null) {
  if (!jobId) throw new TrabajoInvalidoError('Falta el trabajo');
  const { error } = await db()
    .from('agent_jobs')
    .update({
      state: 'completed',
      completed_on: new Date().toISOString(),
      output,
      error: null
    })
    .eq('id', jobId);
  if (error) {
    console.error('[AgentJobs] No se pudo completar:', error.message);
    throw new Error('No se pudo cerrar el trabajo');
  }
}

/**
 * Marca un intento fallido. Si quedan reintentos, el trabajo vuelve a la cola
 * con un retroceso creciente; si no, queda como fallido con su motivo.
 *
 * Devuelve { reintentara, intentosRestantes } para que quien llama pueda
 * decirlo en el registro sin volver a consultar.
 */
async function fallar(jobId, motivo) {
  if (!jobId) throw new TrabajoInvalidoError('Falta el trabajo');
  const supabase = db();

  const { data: trabajo, error: errorLectura } = await supabase
    .from('agent_jobs')
    .select('retry_count, retry_limit, retry_delay_seconds')
    .eq('id', jobId)
    .single();

  if (errorLectura || !trabajo) {
    console.error('[AgentJobs] No se pudo leer el trabajo a marcar como fallido:', errorLectura?.message);
    throw new Error('No se pudo cerrar el trabajo');
  }

  const intento = trabajo.retry_count + 1;
  const reintentara = intento <= trabajo.retry_limit;
  const espera = esperaDelReintento(intento, trabajo.retry_delay_seconds);

  const { error } = await supabase
    .from('agent_jobs')
    .update(reintentara
      ? {
          state: 'created',
          retry_count: intento,
          start_after: new Date(Date.now() + espera * 1000).toISOString(),
          started_on: null,
          heartbeat_on: null,
          error: motivo
        }
      : {
          state: 'failed',
          retry_count: intento,
          completed_on: new Date().toISOString(),
          error: motivo
        })
    .eq('id', jobId);

  if (error) {
    console.error('[AgentJobs] No se pudo marcar como fallido:', error.message);
    throw new Error('No se pudo cerrar el trabajo');
  }

  return { reintentara, intentosRestantes: Math.max(0, trabajo.retry_limit - intento) };
}

/** Cancela un trabajo que aún no ha terminado. */
async function cancelar(jobId, motivo = 'Cancelado') {
  if (!jobId) throw new TrabajoInvalidoError('Falta el trabajo');
  const { error } = await db()
    .from('agent_jobs')
    .update({ state: 'cancelled', completed_on: new Date().toISOString(), error: motivo })
    .eq('id', jobId)
    .in('state', ESTADOS_VIVOS);
  if (error) {
    console.error('[AgentJobs] No se pudo cancelar:', error.message);
    throw new Error('No se pudo cancelar el trabajo');
  }
}

/**
 * El estado de un trabajo, acotado a su organización.
 *
 * El identificador se pide junto a la organización a propósito: quien consulta
 * no puede preguntar por el trabajo de otro inquilino aunque conozca su uuid.
 */
async function estadoDe(organizationId, jobId) {
  if (!organizationId || !jobId) return null;
  const { data, error } = await db()
    .from('agent_jobs')
    .select('id, queue, state, output, error, retry_count, created_on, started_on, completed_on')
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    console.error('[AgentJobs] No se pudo consultar el estado:', error.message);
    return null;
  }
  return data || null;
}

/** Los trabajos de una organización, del más nuevo al más viejo. */
async function listar(organizationId, { queue = null, estados = null, limite = 50 } = {}) {
  if (!organizationId) return [];
  let consulta = db()
    .from('agent_jobs')
    .select('id, queue, state, error, retry_count, created_on, started_on, completed_on')
    .eq('organization_id', organizationId)
    .order('created_on', { ascending: false })
    .limit(Math.min(limite, 200));

  if (queue) consulta = consulta.eq('queue', queue);
  if (estados?.length) consulta = consulta.in('state', estados);

  const { data, error } = await consulta;
  if (error) {
    console.error('[AgentJobs] No se pudo listar:', error.message);
    return [];
  }
  return data || [];
}

module.exports = {
  ESTADOS,
  ESTADOS_VIVOS,
  EXPIRACION_POR_DEFECTO,
  ESPERA_MAXIMA_SEGUNDOS,
  TrabajoInvalidoError,
  esperaDelReintento,
  estaPerdido,
  encolar,
  tomarSiguiente,
  recuperarPerdidos,
  latir,
  completar,
  fallar,
  cancelar,
  estadoDe,
  listar
};
