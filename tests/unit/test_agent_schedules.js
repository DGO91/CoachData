'use strict';

/**
 * Horarios de agentes: las funciones puras.
 *
 * Cubren lo que antes no miraba nadie. Las rutas hacían `parseInt(hour, 10)` y
 * guardaban el resultado: una hora 99 entraba, y "abc" dejaba el cron en NaN,
 * que no dispara nunca y tampoco avisa.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');
const s = require('../../src/backend/application/agents/agentSchedulesService');

test('cron: ida y vuelta', () => {
  assert.equal(s.aCron(8, 30), '30 8 * * *');
  assert.equal(s.aCron(20, 0), '0 20 * * *');
  assert.deepEqual(s.desdeCron('30 8 * * *'), { hour: 8, minute: 30 });
});

test('cron: cambiar la hora conserva los días del patrón anterior', () => {
  // El pack de sector guarda "0 19 * * 1-5". Mover la hora a las 20:30 no debe
  // convertir en diario un agente que sólo corría de lunes a viernes.
  assert.equal(s.aCron(20, 30, '0 19 * * 1-5'), '30 20 * * 1-5');
  assert.equal(s.aCron(9, 0, '0 9 * * 1'), '0 9 * * 1');
});

test('cron: se evalúa el día de la semana, no sólo la hora', () => {
  const viernes = new Date(2026, 8, 25, 19, 0);   // 25-09-2026 es viernes
  const domingo = new Date(2026, 8, 27, 19, 0);
  assert.equal(s.cronCaeEn('0 19 * * 1-5', viernes), true);
  assert.equal(s.cronCaeEn('0 19 * * 1-5', domingo), false);
  assert.equal(s.cronCaeEn('0 19 * * *', domingo), true);
});

test('cron: un horario sin cron no dispara nunca', () => {
  const ahora = new Date(2026, 8, 25, 19, 0);
  assert.equal(s.cronCaeEn(null, ahora), false);
  assert.equal(s.cronCaeEn('', ahora), false);
  assert.equal(s.cronCaeEn('malformado', ahora), false);
});

test('cron: campos con lista, rango y paso', () => {
  assert.equal(s.campoAdmite('*', 7), true);
  assert.equal(s.campoAdmite('1-5', 3), true);
  assert.equal(s.campoAdmite('1-5', 6), false);
  assert.equal(s.campoAdmite('1,3,5', 3), true);
  assert.equal(s.campoAdmite('1,3,5', 4), false);
  assert.equal(s.campoAdmite('*/15', 30), true);
  assert.equal(s.campoAdmite('*/15', 7), false);
});

test('el domingo vale como 0 y como 7', () => {
  const domingo = new Date(2026, 8, 27, 9, 0);
  assert.equal(s.cronCaeEn('0 9 * * 0', domingo), true);
  assert.equal(s.cronCaeEn('0 9 * * 7', domingo), true);
});

test('los alias del pack y de la migración apuntan al mismo agente', () => {
  assert.equal(s.normalizarTipo('personal_agent'), 'morning_briefing');
  assert.equal(s.normalizarTipo('precall'), 'pre_call');
  assert.equal(s.normalizarTipo('morning_briefing'), 'morning_briefing');
  assert.throws(() => s.normalizarTipo('inventado'), s.HorarioInvalidoError);
});

test('cron: lo que no se reconoce devuelve null en vez de lanzar', () => {
  assert.equal(s.desdeCron('abc'), null);
  assert.equal(s.desdeCron('0 99 * * *'), null);
  assert.equal(s.desdeCron(null), null);
  assert.equal(s.desdeCron(''), null);
});

test('validación: rechaza lo que antes entraba sin mirar', () => {
  const base = { active: false, hour: 8, minute: 0 };
  assert.throws(() => s.validarHorario({ hour: 99 }, base), s.HorarioInvalidoError);
  assert.throws(() => s.validarHorario({ hour: -5 }, base), s.HorarioInvalidoError);
  assert.throws(() => s.validarHorario({ hour: 'abc' }, base), s.HorarioInvalidoError);
  assert.throws(() => s.validarHorario({ minute: 60 }, base), s.HorarioInvalidoError);
  assert.throws(() => s.validarHorario(null, base), s.HorarioInvalidoError);
});

test('validación: acepta los extremos del rango', () => {
  const base = { active: false, hour: 8, minute: 0 };
  assert.equal(s.validarHorario({ hour: 0 }, base).hour, 0);
  assert.equal(s.validarHorario({ hour: 23 }, base).hour, 23);
  assert.equal(s.validarHorario({ minute: 59 }, base).minute, 59);
  assert.equal(s.validarHorario({ hour: '14' }, base).hour, 14);
});

test('validación: un campo ausente conserva el valor anterior', () => {
  const actual = { active: true, hour: 9, minute: 15 };
  assert.deepEqual(s.validarHorario({}, actual), actual);
  assert.deepEqual(s.validarHorario({ hour: 10 }, actual), { active: true, hour: 10, minute: 15 });
});

test('validación: active se normaliza a booleano', () => {
  const base = { active: false, hour: 8, minute: 0 };
  assert.equal(s.validarHorario({ active: 1 }, base).active, true);
  assert.equal(s.validarHorario({ active: 0 }, base).active, false);
});

test('los tipos de agente son los que hay escritos en la tabla', () => {
  // No los del comentario de la migración 020: esos nunca fueron una
  // restricción y las filas reales usan estos.
  assert.deepEqual(s.TIPOS_DE_AGENTE, [
    'morning_briefing', 'evening_summary', 'pre_call', 'weekly_digest', 'prospect_analyzer'
  ]);
});

/* ---------- zona horaria ----------

   Las filas ya traían "timezone": "Europe/Madrid" y el planificador comparaba
   contra la hora del servidor. Con el contenedor en UTC, un agente puesto a las
   8:00 disparaba a las 10:00 en Madrid durante el horario de verano. */

test('zona horaria: la misma marca de tiempo cae distinto según la zona', () => {
  // 06:30 UTC del 15-07-2026 son las 08:30 en Madrid (verano, UTC+2)
  const instante = new Date('2026-07-15T06:30:00Z');
  assert.equal(s.cronCaeEn('30 8 * * *', instante, 'Europe/Madrid'), true);
  assert.equal(s.cronCaeEn('30 8 * * *', instante, 'UTC'), false);
  assert.equal(s.cronCaeEn('30 6 * * *', instante, 'UTC'), true);
});

test('zona horaria: el horario de verano cambia el desfase', () => {
  const verano = new Date('2026-07-15T06:00:00Z');   // Madrid UTC+2 -> 08:00
  const invierno = new Date('2026-01-15T07:00:00Z'); // Madrid UTC+1 -> 08:00
  assert.equal(s.cronCaeEn('0 8 * * *', verano, 'Europe/Madrid'), true);
  assert.equal(s.cronCaeEn('0 8 * * *', invierno, 'Europe/Madrid'), true);
  // La misma hora UTC no sirve para los dos
  assert.equal(s.cronCaeEn('0 8 * * *', verano, 'UTC'), false);
});

test('zona horaria: cruzar la medianoche cambia el día de la semana', () => {
  // Domingo 23:30 UTC es lunes 01:30 en Madrid
  const instante = new Date('2026-09-27T23:30:00Z');
  assert.equal(s.componentesEn(instante, 'UTC').diaSemana, 0);        // domingo
  assert.equal(s.componentesEn(instante, 'Europe/Madrid').diaSemana, 1); // lunes
  assert.equal(s.cronCaeEn('30 1 * * 1', instante, 'Europe/Madrid'), true);
  assert.equal(s.cronCaeEn('30 1 * * 1', instante, 'UTC'), false);
});

test('zona horaria: medianoche se lee como 00 y no como 24', () => {
  const instante = new Date('2026-07-14T22:00:00Z'); // 00:00 en Madrid
  assert.equal(s.componentesEn(instante, 'Europe/Madrid').hora, 0);
  assert.equal(s.cronCaeEn('0 0 * * *', instante, 'Europe/Madrid'), true);
});

test('zona horaria: una zona inventada cae a la del servidor sin romper', () => {
  const instante = new Date('2026-07-15T06:30:00Z');
  assert.equal(s.zonaValida('Marte/Olimpo'), false);
  assert.equal(s.zonaValida('Europe/Madrid'), true);
  assert.equal(s.zonaValida(null), false);
  // No lanza: usa la hora del servidor
  const t = s.componentesEn(instante, 'Marte/Olimpo');
  assert.equal(t.hora, instante.getHours());
});

test('zona horaria: sin zona se comporta como antes', () => {
  const instante = new Date('2026-07-15T06:30:00Z');
  const t = s.componentesEn(instante, undefined);
  assert.equal(t.hora, instante.getHours());
  assert.equal(t.minuto, instante.getMinutes());
  assert.equal(t.diaSemana, instante.getDay());
});

test('el nombre viejo se traduce, nunca se escribe', () => {
  // La migración 042 rechaza 'personal_agent' con un CHECK. El alias existe
  // para que una llamada de API antigua no falle, no para guardar ese nombre.
  assert.equal(s.normalizarTipo('personal_agent'), 'morning_briefing');
  assert.equal(s.normalizarTipo('precall'), 'pre_call');
  assert.ok(!s.TIPOS_DE_AGENTE.includes('personal_agent'));
  assert.ok(!s.TIPOS_DE_AGENTE.includes('precall'));
});
