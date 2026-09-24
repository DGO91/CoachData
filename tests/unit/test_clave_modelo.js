'use strict';

/**
 * Resolución de la clave de modelo en el agente prospect_analyzer.
 *
 * Antes la clave llegaba en el cuerpo de la petición, y el frontend la sacaba
 * de localStorage: cualquier script de la página podía leerla. Ahora la pone el
 * proxy de la suite como cabecera, leyéndola de la bóveda cifrada del
 * inquilino.
 *
 * Se prueba la función tal como está escrita en el agente, sin levantar su
 * servidor, que necesita puertos y dependencias propias.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

/* El agente es un servidor que arranca al requerirlo, así que se extraen las
   dos tablas y la función del fuente en vez de importarlo. Si alguien cambia
   los nombres de las cabeceras, esto deja de encontrarlas y el test falla, que
   es justo lo que se quiere. */
const fuente = fs.readFileSync(
  path.join(__dirname, '../../src/agents/prospect_analyzer/server.js'),
  'utf8'
);

function extraer(nombre) {
  const inicio = fuente.indexOf(`const ${nombre} = {`);
  assert.notEqual(inicio, -1, `no se encontró ${nombre} en el agente`);
  const fin = fuente.indexOf('};', inicio);
  return fuente.slice(inicio, fin + 2);
}

const contexto = {};
// eslint-disable-next-line no-new-func
new Function('ctx', `
  ${extraer('CABECERA_POR_PROVEEDOR')}
  ${extraer('VARIABLE_POR_PROVEEDOR')}
  ${fuente.slice(fuente.indexOf('function resolverClave'), fuente.indexOf('app.post(\'/api/generate\''))}
  ctx.resolverClave = resolverClave;
  ctx.CABECERA_POR_PROVEEDOR = CABECERA_POR_PROVEEDOR;
`)(contexto);

const { resolverClave, CABECERA_POR_PROVEEDOR } = contexto;

test('la clave del inquilino llega por cabecera, no por el cuerpo', () => {
  const req = { headers: { 'x-anthropic-key': 'sk-ant-del-inquilino' }, body: {} };
  assert.equal(resolverClave(req, 'anthropic'), 'sk-ant-del-inquilino');
});

test('la cabecera del inquilino manda sobre la del despliegue', () => {
  const anterior = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'sk-ant-del-despliegue';
  try {
    const req = { headers: { 'x-anthropic-key': 'sk-ant-del-inquilino' }, body: {} };
    assert.equal(resolverClave(req, 'anthropic'), 'sk-ant-del-inquilino');
  } finally {
    if (anterior === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = anterior;
  }
});

test('sin cabecera se usa la del despliegue', () => {
  const anterior = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'sk-ant-del-despliegue';
  try {
    assert.equal(resolverClave({ headers: {}, body: {} }, 'anthropic'), 'sk-ant-del-despliegue');
  } finally {
    if (anterior === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = anterior;
  }
});

test('una clave en el cuerpo ya no se acepta', () => {
  const anterior = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const req = { headers: {}, body: { apiKey: 'sk-ant-colada-por-el-cuerpo' } };
    assert.equal(resolverClave(req, 'anthropic'), '', 'el cuerpo no debe ser una vía');
  } finally {
    if (anterior !== undefined) process.env.ANTHROPIC_API_KEY = anterior;
  }
});

test('los tres proveedores tienen su cabecera', () => {
  assert.deepEqual(CABECERA_POR_PROVEEDOR, {
    anthropic: 'x-anthropic-key',
    openai: 'x-openai-key',
    google: 'x-google-key'
  });
});

test('un proveedor desconocido no resuelve nada', () => {
  assert.equal(resolverClave({ headers: { 'x-anthropic-key': 'x' }, body: {} }, 'inventado'), '');
});

test('el frontend ya no guarda ni envía la clave', () => {
  const componente = fs.readFileSync(
    path.join(__dirname, '../../src/frontend/src/components/ProspectAnalyzer.jsx'),
    'utf8'
  );
  assert.ok(!componente.includes('setItem(\'coachdata_api_key\''), 'no debe escribir en localStorage');
  assert.ok(!/body: JSON.stringify\(\{[^}]*\bapiKey\b/.test(componente), 'no debe enviar la clave en el cuerpo');
  assert.ok(componente.includes('removeItem(\'coachdata_api_key\')'), 'debe limpiar la clave antigua');
});
