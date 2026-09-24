'use strict';

/**
 * La lógica pura de la cola de trabajos.
 *
 * Lo que toca base de datos se prueba aparte, contra Postgres: FOR UPDATE SKIP
 * LOCKED no se puede simular con un doble sin probar otra cosa distinta. Aquí
 * van las decisiones que se toman sin consultar nada.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');
const j = require('../../src/backend/application/agents/agentJobsService');

test('el retroceso entre reintentos crece de forma exponencial', () => {
  // Un fallo por un servicio caído no debe convertirse en una tanda de
  // peticiones cada treinta segundos contra algo que ya está en apuros.
  assert.equal(j.esperaDelReintento(1, 30), 30);
  assert.equal(j.esperaDelReintento(2, 30), 60);
  assert.equal(j.esperaDelReintento(3, 30), 120);
  assert.equal(j.esperaDelReintento(4, 30), 240);
});

test('el retroceso tiene tope', () => {
  // Sin tope, el intento doce se programaría para dentro de un mes.
  assert.equal(j.esperaDelReintento(20, 30), j.ESPERA_MAXIMA_SEGUNDOS);
  assert.ok(j.esperaDelReintento(100, 30) <= j.ESPERA_MAXIMA_SEGUNDOS);
});

test('el primer intento no espera de más', () => {
  assert.equal(j.esperaDelReintento(0, 30), 30);
  assert.equal(j.esperaDelReintento(-5, 30), 30);
});

test('un trabajo activo con latido reciente no está perdido', () => {
  const ahora = Date.now();
  const vivo = {
    state: 'active',
    heartbeat_on: new Date(ahora - 10_000).toISOString(),
    expire_seconds: 900
  };
  assert.equal(j.estaPerdido(vivo, ahora), false);
});

test('un trabajo activo sin latido desde hace rato está perdido', () => {
  const ahora = Date.now();
  const colgado = {
    state: 'active',
    heartbeat_on: new Date(ahora - 3_600_000).toISOString(),
    expire_seconds: 900
  };
  assert.equal(j.estaPerdido(colgado, ahora), true);
});

test('un trabajo que nunca latió está perdido', () => {
  // Pasa cuando el proceso muere justo después de tomarlo.
  assert.equal(j.estaPerdido({ state: 'active', heartbeat_on: null, expire_seconds: 900 }), true);
});

test('sólo los activos pueden estar perdidos', () => {
  const ahora = Date.now();
  for (const estado of ['created', 'completed', 'failed', 'cancelled']) {
    const trabajo = { state: estado, heartbeat_on: null, expire_seconds: 900 };
    assert.equal(j.estaPerdido(trabajo, ahora), false, `${estado} no debería darse por perdido`);
  }
  assert.equal(j.estaPerdido(null, ahora), false);
});

test('los estados son los que declara el CHECK de la migración 043', () => {
  assert.deepEqual(j.ESTADOS, ['created', 'active', 'completed', 'failed', 'cancelled']);
  assert.deepEqual(j.ESTADOS_VIVOS, ['created', 'active']);
});

test('encolar sin organización o sin cola se rechaza', async () => {
  await assert.rejects(() => j.encolar(null, 'cola'), j.TrabajoInvalidoError);
  await assert.rejects(() => j.encolar('org', null), j.TrabajoInvalidoError);
  await assert.rejects(() => j.encolar('org', 123), j.TrabajoInvalidoError);
});
