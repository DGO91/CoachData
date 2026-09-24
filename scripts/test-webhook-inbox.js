/**
 * test-webhook-inbox.js
 * El buzón de eventos entrantes y su consumidor.
 *
 * Lo que separa este diseño del anterior: el webhook guarda y responde 200, y la
 * normalización ocurre después. Antes se normalizaba dentro de la petición del
 * proveedor, así que un fallo de la base de datos devolvía un error y el evento
 * sólo sobrevivía si el proveedor decidía reintentar.
 *
 * Se prueba con dobles en memoria: lo que importa aquí son las reglas —qué se
 * considera duplicado, qué se reintenta y cuándo se deja de reintentar—, no que
 * Supabase sepa insertar filas.
 */
require('dotenv').config();

const { WebhookInbox } = require('../src/backend/modules/webhooks/application/WebhookInbox');
const { InboxConsumer } = require('../src/backend/modules/webhooks/application/InboxConsumer');

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

/** Supabase de mentira con una tabla en memoria y unicidad real por huella. */
function fakeDb() {
  const filas = [];
  return {
    filas,
    from() {
      let pendientesFiltro = null;
      const api = {
        insert(row) {
          const choca = filas.some(f => f.fingerprint && f.fingerprint === row.fingerprint && f.provider === row.provider);
          if (choca) {
            api._resultado = { data: null, error: { code: '23505', message: 'duplicate key' } };
          } else {
            const nueva = { id: `id-${filas.length + 1}`, status: 'pending', attempts: 0, ...row };
            filas.push(nueva);
            api._resultado = { data: nueva, error: null };
          }
          return api;
        },
        select() { return api; },
        single: async () => api._resultado,
        in(_col, valores) { pendientesFiltro = valores; return api; },
        order() { return api; },
        limit: async (n) => ({
          data: filas.filter(f => !pendientesFiltro || pendientesFiltro.includes(f.status)).slice(0, n),
          error: null,
        }),
        update(payload) { api._update = payload; return api; },
        eq(_col, valor) {
          if (api._update) {
            const f = filas.find(x => x.id === valor);
            if (f) Object.assign(f, api._update);
            api._update = null;
            return Promise.resolve({ error: null });
          }
          return api;
        },
      };
      return api;
    },
  };
}

(async () => {
  // 1. Un evento entra una vez.
  let db = fakeDb();
  let inbox = new WebhookInbox({ supabaseClient: db });
  const evento = { id: 'evt_1', type: 'payment' };
  const primero = await inbox.recibir({ tenantRef: 't1', provider: 'tally', payload: evento });
  check('un evento nuevo se guarda', primero.duplicado === false && db.filas.length === 1,
    `duplicado=${primero.duplicado} filas=${db.filas.length}`);

  // 2. El mismo evento reenviado no entra dos veces. Es lo que impide contar dos
  //    veces un pago cuando el proveedor reintenta por no haber visto el 200.
  const segundo = await inbox.recibir({ tenantRef: 't1', provider: 'tally', payload: evento });
  check('un reenvío del mismo evento se detecta como duplicado',
    segundo.duplicado === true && db.filas.length === 1,
    `duplicado=${segundo.duplicado} filas=${db.filas.length}`);

  // 3. Un evento distinto sí entra. CONTROL: sin esto, un buzón que rechazara
  //    todo pasaría la prueba anterior.
  await inbox.recibir({ tenantRef: 't1', provider: 'tally', payload: { id: 'evt_2' } });
  check('CONTROL: un evento distinto sí se guarda', db.filas.length === 2, `filas=${db.filas.length}`);

  // 4. Sin identificador propio, la huella sale del cuerpo: dos cuerpos iguales
  //    son el mismo evento, dos distintos no.
  const h1 = WebhookInbox.fingerprint('kajabi', { a: 1 }, '{"a":1}');
  const h2 = WebhookInbox.fingerprint('kajabi', { a: 1 }, '{"a":1}');
  const h3 = WebhookInbox.fingerprint('kajabi', { a: 2 }, '{"a":2}');
  check('sin id propio, cuerpos iguales dan la misma huella', h1 === h2, `${h1} vs ${h2}`);
  check('sin id propio, cuerpos distintos dan huellas distintas', h1 !== h3, 'coincidieron');

  // 5. El consumidor procesa y marca.
  db = fakeDb();
  inbox = new WebhookInbox({ supabaseClient: db });
  await inbox.recibir({ tenantRef: 't1', provider: 'tally', payload: { id: 'ok_1' } });
  let consumer = new InboxConsumer({
    supabaseClient: db,
    dispatcher: { dispatch: async () => ({ organizationId: 'org-1' }) },
  });
  let r = await consumer.procesarTanda();
  check('el consumidor procesa lo pendiente', r.procesados === 1 && db.filas[0].status === 'processed',
    `procesados=${r.procesados} status=${db.filas[0].status}`);
  check('guarda la organización que resolvió el dispatcher',
    db.filas[0].organization_id === 'org-1', `org=${db.filas[0].organization_id}`);

  // 6. Un fallo deja el evento reintentable, no perdido. Esta es la diferencia
  //    con el diseño anterior, donde el evento simplemente desaparecía.
  db = fakeDb();
  inbox = new WebhookInbox({ supabaseClient: db });
  await inbox.recibir({ tenantRef: 't1', provider: 'tally', payload: { id: 'ko_1' } });
  consumer = new InboxConsumer({
    supabaseClient: db,
    dispatcher: { dispatch: async () => { throw new Error('Supabase caído'); } },
    maxIntentos: 3,
  });
  r = await consumer.procesarTanda();
  check('un fallo deja el evento como reintentable',
    r.fallidos === 1 && db.filas[0].status === 'failed' && db.filas[0].attempts === 1,
    `status=${db.filas[0].status} intentos=${db.filas[0].attempts}`);
  check('el evento conserva el motivo del fallo',
    /Supabase caído/.test(db.filas[0].last_error || ''), db.filas[0].last_error);

  // 7. Pero no se reintenta para siempre: un evento que nadie sabe procesar
  //    acabaría tapando a los que sí pueden avanzar.
  await consumer.procesarTanda();   // 2º intento
  await consumer.procesarTanda();   // 3º intento → tope
  check('al llegar al tope de intentos se descarta',
    db.filas[0].status === 'discarded' && db.filas[0].attempts === 3,
    `status=${db.filas[0].status} intentos=${db.filas[0].attempts}`);

  const tras = await consumer.procesarTanda();
  check('un evento descartado ya no se vuelve a leer', tras.leidos === 0, `leidos=${tras.leidos}`);

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
