'use strict';

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

/**
 * Horarios de los agentes, por organización.
 *
 * Hasta ahora vivían en variables de módulo dentro de agentRoutes.js. Eso
 * significaba tres cosas, todas malas: el horario que ponía una organización se
 * lo cambiaba a todas las demás, se perdía en cada despliegue, y con más de una
 * instancia detrás del balanceador cada proceso tenía su propia copia.
 *
 * La tabla agent_schedules existe desde la migración 020 y nació justo para
 * esto ("persists schedules across process restarts"), pero nadie llegó a
 * conectarla. Este servicio es esa conexión.
 *
 * Dos decisiones que vienen de mirar los datos que ya hay en la tabla, no de
 * leer la migración:
 *
 * 1. Los nombres de agente son los que escribe aplicarPackDeSector.js
 *    ('morning_briefing', 'pre_call'), no los del comentario de la migración
 *    020 ('personal_agent', 'precall'). Desde la migración 042 hay un CHECK
 *    que sólo admite los canónicos, así que en la tabla ya no puede haber dos
 *    nombres para el mismo agente. Los alias siguen aquí para traducir una
 *    llamada de API que use el nombre viejo, no para leer datos viejos.
 *
 * 2. El cron se evalúa entero, con su día de la semana. El pack guarda cosas
 *    como "0 19 * * 1-5" (de lunes a viernes), así que comparar la cadena
 *    completa contra la del minuto en curso no habría disparado nunca.
 *
 * 3. La hora se compara en la zona horaria de la organización, no en la del
 *    servidor. Las filas ya traían "timezone": "Europe/Madrid" en settings y
 *    nadie la leía: un agente puesto a las 8:00 disparaba a las 10:00 con el
 *    servidor en UTC durante el horario de verano, y a las 9:00 en invierno.
 */

/** Nombre canónico de cada agente: el que está escrito en la tabla. */
const TIPOS_DE_AGENTE = [
  'morning_briefing',
  'evening_summary',
  'pre_call',
  'weekly_digest',
  'prospect_analyzer'
];

/* Nombres que puede traer una llamada de API antigua. Se resuelven al canónico
   antes de tocar la base de datos. Escribir el nombre viejo es imposible desde
   la migración 042, que lo rechaza con un CHECK. */
const ALIAS = {
  personal_agent: 'morning_briefing',
  precall: 'pre_call',
  morning_brief: 'morning_briefing'
};

const POR_DEFECTO = {
  morning_briefing: { active: false, hour: 8, minute: 0 },
  evening_summary: { active: false, hour: 20, minute: 0 },
  pre_call: { active: false, hour: 8, minute: 0 },
  weekly_digest: { active: false, hour: 9, minute: 0 },
  prospect_analyzer: { active: false, hour: 9, minute: 0 }
};

class HorarioInvalidoError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'HorarioInvalidoError';
  }
}

function normalizarTipo(agentType) {
  const canonico = ALIAS[agentType] || agentType;
  if (!TIPOS_DE_AGENTE.includes(canonico)) {
    throw new HorarioInvalidoError(`Tipo de agente desconocido: ${agentType}`);
  }
  return canonico;
}

/**
 * Valida y normaliza lo que llega del cliente. Antes esto era
 * `parseInt(hour, 10)` sin más: una hora 99 entraba, y "abc" dejaba el cron en
 * NaN, que no dispara nunca y no avisa de nada.
 *
 * Los campos ausentes conservan su valor anterior, como hacían las rutas
 * originales.
 */
function validarHorario(entrada, actual) {
  if (entrada === null || typeof entrada !== 'object') {
    throw new HorarioInvalidoError('El cuerpo de la petición debe ser un objeto');
  }

  const base = actual || { active: false, hour: 8, minute: 0 };
  const salida = { ...base };

  if (entrada.active !== undefined) salida.active = Boolean(entrada.active);
  if (entrada.hour !== undefined) salida.hour = enteroEnRango(entrada.hour, 0, 23, 'hour');
  if (entrada.minute !== undefined) salida.minute = enteroEnRango(entrada.minute, 0, 59, 'minute');

  return salida;
}

function enteroEnRango(valor, min, max, nombre) {
  const numero = typeof valor === 'number' ? valor : Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw new HorarioInvalidoError(`${nombre} debe ser un entero entre ${min} y ${max}`);
  }
  return numero;
}

/* ---------- cron ---------- */

/**
 * Escribe una hora del día conservando el patrón de días que ya tuviera la
 * fila. Cambiar la hora de un agente que corría de lunes a viernes no debe
 * convertirlo en diario sin que nadie lo haya pedido.
 */
function aCron(hour, minute, cronAnterior) {
  const dias = diasDe(cronAnterior);
  return `${minute} ${hour} ${dias.diaMes} ${dias.mes} ${dias.diaSemana}`;
}

function diasDe(cronAnterior) {
  const partes = typeof cronAnterior === 'string' ? cronAnterior.trim().split(/\s+/) : [];
  return {
    diaMes: partes[2] || '*',
    mes: partes[3] || '*',
    diaSemana: partes[4] || '*'
  };
}

/** La hora del día que declara un cron, o null si no se reconoce. */
function desdeCron(cronSchedule) {
  if (typeof cronSchedule !== 'string') return null;
  const partes = cronSchedule.trim().split(/\s+/);
  if (partes.length < 2) return null;
  const minute = Number.parseInt(partes[0], 10);
  const hour = Number.parseInt(partes[1], 10);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Si un campo de cron admite un valor. Cubre lo que el pack escribe y lo
 * razonable alrededor: "*", un número, un rango "1-5", una lista "1,3,5" y un
 * paso "*​/15". No pretende ser un cron completo: lo que no entiende lo
 * rechaza, que es el lado seguro (no disparar) frente a disparar de más.
 */
function campoAdmite(campo, valor) {
  if (campo === '*') return true;

  return campo.split(',').some((trozo) => {
    const [base, pasoTexto] = trozo.split('/');
    const paso = pasoTexto === undefined ? 1 : Number.parseInt(pasoTexto, 10);
    if (!Number.isInteger(paso) || paso < 1) return false;

    let desde;
    let hasta;
    if (base === '*') {
      desde = -Infinity;
      hasta = Infinity;
    } else if (base.includes('-')) {
      const [a, b] = base.split('-').map((n) => Number.parseInt(n, 10));
      if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
      desde = a;
      hasta = b;
    } else {
      const n = Number.parseInt(base, 10);
      if (!Number.isInteger(n)) return false;
      desde = n;
      hasta = n;
    }

    if (valor < desde || valor > hasta) return false;
    if (paso === 1) return true;
    const origen = base === '*' ? 0 : desde;
    return (valor - origen) % paso === 0;
  });
}

/**
 * Zona que se usa cuando una fila no declara la suya. Se puede fijar por
 * entorno; si no, se cae a la del servidor, que es el comportamiento anterior.
 */
const ZONA_POR_DEFECTO = process.env.AGENTS_DEFAULT_TIMEZONE || null;

/* Formateadores por zona: construir uno cuesta bastante y el planificador
   pregunta cada minuto por cada organización. */
const formateadores = new Map();

function formateadorDe(timezone) {
  if (!formateadores.has(timezone)) {
    formateadores.set(timezone, new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }));
  }
  return formateadores.get(timezone);
}

/** true si la zona existe. Una zona inventada hace que Intl lance RangeError. */
function zonaValida(timezone) {
  if (typeof timezone !== 'string' || !timezone.trim()) return false;
  try {
    formateadorDe(timezone);
    return true;
  } catch {
    formateadores.delete(timezone);
    return false;
  }
}

/**
 * Los componentes del reloj en la zona pedida. Sin zona, o con una que no
 * existe, se usa la hora del servidor: es lo que hacía antes, y disparar con la
 * hora equivocada es preferible a no disparar nunca.
 */
function componentesEn(fecha, timezone) {
  const zona = zonaValida(timezone) ? timezone : (zonaValida(ZONA_POR_DEFECTO) ? ZONA_POR_DEFECTO : null);

  if (!zona) {
    if (timezone) {
      console.warn(`[AgentSchedules] Zona horaria desconocida: ${timezone}. Se usa la del servidor.`);
    }
    return {
      minuto: fecha.getMinutes(),
      hora: fecha.getHours(),
      diaMes: fecha.getDate(),
      mes: fecha.getMonth() + 1,
      diaSemana: fecha.getDay()
    };
  }

  const partes = formateadorDe(zona).formatToParts(fecha);
  const valor = (tipo) => Number.parseInt(partes.find((x) => x.type === tipo).value, 10);
  const anio = valor('year');
  const mes = valor('month');
  const diaMes = valor('day');

  return {
    minuto: valor('minute'),
    hora: valor('hour'),
    diaMes,
    mes,
    /* El día de la semana se calcula a partir de la fecha ya trasladada, en vez
       de pedírselo a Intl como nombre y traducirlo. */
    diaSemana: new Date(Date.UTC(anio, mes - 1, diaMes)).getUTCDay()
  };
}

/**
 * Si este cron cae en este momento, leído en la zona horaria de quien lo
 * configuró. El domingo se acepta como 0 y como 7, que es lo que hace cron.
 */
function cronCaeEn(cronSchedule, fecha, timezone) {
  if (typeof cronSchedule !== 'string' || !cronSchedule.trim()) return false;
  const p = cronSchedule.trim().split(/\s+/);
  if (p.length < 5) return false;

  const t = componentesEn(fecha, timezone);
  return (
    campoAdmite(p[0], t.minuto) &&
    campoAdmite(p[1], t.hora) &&
    campoAdmite(p[2], t.diaMes) &&
    campoAdmite(p[3], t.mes) &&
    (campoAdmite(p[4], t.diaSemana) || (t.diaSemana === 0 && campoAdmite(p[4], 7)))
  );
}

/* ---------- lectura y escritura ---------- */

async function filaDe(supabase, organizationId, agentType) {
  const { data, error } = await supabase
    .from('agent_schedules')
    .select('is_active, cron_schedule, settings, agent_type')
    .eq('organization_id', organizationId)
    .in('agent_type', nombresPosibles(agentType))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[AgentSchedules] No se pudo leer el horario:', error.message);
    return null;
  }
  return data;
}

/** El canónico más sus alias. Desde la 042 la tabla sólo contiene canónicos,
    pero la consulta los mantiene por si se restaura un respaldo anterior. */
function nombresPosibles(canonico) {
  const alias = Object.keys(ALIAS).filter((a) => ALIAS[a] === canonico);
  return [canonico, ...alias];
}

/**
 * El horario guardado de una organización, o el valor por defecto del agente si
 * todavía no ha guardado ninguno.
 */
async function leerHorario(organizationId, agentType) {
  const tipo = normalizarTipo(agentType);
  if (!organizationId) throw new HorarioInvalidoError('Falta la organización');

  const supabase = getSupabaseClient();
  if (!supabase) return { ...POR_DEFECTO[tipo] };

  const fila = await filaDe(supabase, organizationId, tipo);
  if (!fila) return { ...POR_DEFECTO[tipo] };

  const hora = desdeCron(fila.cron_schedule) || POR_DEFECTO[tipo];
  return {
    active: Boolean(fila.is_active),
    hour: hora.hour,
    minute: hora.minute,
    cron: fila.cron_schedule || null,
    timezone: fila.settings?.timezone || null
  };
}

/**
 * Guarda el horario de una organización. Devuelve lo que ha quedado guardado,
 * para que la ruta responda con el estado real y no con lo que envió el cliente.
 */
async function guardarHorario(organizationId, agentType, entrada) {
  const tipo = normalizarTipo(agentType);
  if (!organizationId) throw new HorarioInvalidoError('Falta la organización');

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('La base de datos no está disponible');

  const fila = await filaDe(supabase, organizationId, tipo);
  const actual = fila
    ? { active: Boolean(fila.is_active), ...(desdeCron(fila.cron_schedule) || POR_DEFECTO[tipo]) }
    : { ...POR_DEFECTO[tipo] };

  const horario = validarHorario(entrada, actual);
  const cron = aCron(horario.hour, horario.minute, fila?.cron_schedule);

  /* Si la fila existe con un nombre antiguo se actualiza esa misma fila, en vez
     de insertar una nueva con el nombre canónico y dejar el agente duplicado. */
  const destino = fila?.agent_type || tipo;

  const { error } = await supabase
    .from('agent_schedules')
    .upsert({
      organization_id: organizationId,
      agent_type: destino,
      is_active: horario.active,
      cron_schedule: cron,
      /* settings lo escriben los packs de sector; se conserva tal cual. */
      settings: fila?.settings ?? {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'organization_id,agent_type' });

  if (error) {
    console.error('[AgentSchedules] No se pudo guardar el horario:', error.message);
    throw new Error('No se pudo guardar el horario');
  }

  return { ...horario, cron };
}

/**
 * Las organizaciones cuyo horario de este agente cae en este momento.
 *
 * Se traen las filas activas del agente y se evalúa el cron aquí, porque el
 * patrón de días no se puede comparar como cadena: "0 19 * * 1-5" tiene que
 * disparar un martes a las 19:00 y no un domingo. Son pocas filas, una por
 * organización y agente.
 */
async function organizacionesADisparar(agentType, fecha = new Date()) {
  const tipo = normalizarTipo(agentType);

  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('agent_schedules')
    .select('organization_id, cron_schedule, settings')
    .in('agent_type', nombresPosibles(tipo))
    .eq('is_active', true);

  if (error) {
    console.error('[AgentSchedules] No se pudo consultar los horarios activos:', error.message);
    return [];
  }

  return (data || [])
    .filter((fila) => cronCaeEn(fila.cron_schedule, fecha, fila.settings?.timezone))
    .map((fila) => fila.organization_id);
}

module.exports = {
  TIPOS_DE_AGENTE,
  ALIAS,
  POR_DEFECTO,
  HorarioInvalidoError,
  normalizarTipo,
  validarHorario,
  aCron,
  desdeCron,
  campoAdmite,
  cronCaeEn,
  componentesEn,
  zonaValida,
  leerHorario,
  guardarHorario,
  organizacionesADisparar
};
