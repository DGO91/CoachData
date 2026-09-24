/**
 * rotate-encryption-key.js
 * Reescribe las credenciales cifradas a la versión de clave activa.
 * POR DEFECTO NO ESCRIBE NADA.
 *
 *   node scripts/rotate-encryption-key.js             → informe
 *   node scripts/rotate-encryption-key.js --execute   → reescribe
 *
 * Cómo rotar la clave sin perder nada:
 *
 *   1. Genera una clave nueva:  openssl rand -hex 32
 *   2. En el .env, mueve la actual a ENCRYPTION_MASTER_KEY_V<versión actual>
 *      y pon la nueva en ENCRYPTION_MASTER_KEY.
 *   3. Sube ENCRYPTION_KEY_VERSION en uno.
 *   4. Ejecuta este script con --execute.
 *   5. Comprueba que quedan 0 pendientes y sólo entonces retira la clave vieja.
 *
 * Saltarse el paso 2 es exactamente lo que dejó ocho credenciales ilegibles.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { decrypt, encrypt, necesitaReescritura } = require('../src/backend/infrastructure/services/encryptionService');

const EJECUTAR = process.argv.includes('--execute');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Dónde vive cada secreto: tabla, columna con el texto cifrado y columnas que
// sirven para identificar la fila en el informe.
const ALMACENES = [
  { tabla: 'client_provider_keys', columna: 'api_key_encrypted', etiqueta: ['tenant_id', 'provider_name'] },
];

(async () => {
  console.log(EJECUTAR ? '*** REESCRIBIENDO ***\n' : '=== INFORME — no se escribe nada ===\n');
  console.log(`Versión de clave activa: ${process.env.ENCRYPTION_KEY_VERSION || '1'}\n`);

  let totalPend = 0, totalIleg = 0, totalOk = 0;

  for (const almacen of ALMACENES) {
    const { data, error } = await s.from(almacen.tabla).select('*');
    if (error) { console.log(`${almacen.tabla}: ${error.message}`); continue; }

    const ilegibles = [];
    const pendientes = [];

    for (const fila of data || []) {
      const valor = fila[almacen.columna];
      if (!valor) continue;
      try {
        decrypt(valor);
        if (necesitaReescritura(valor)) pendientes.push(fila); else totalOk++;
      } catch {
        ilegibles.push(fila);
      }
    }

    totalPend += pendientes.length;
    totalIleg += ilegibles.length;

    console.log(`${almacen.tabla}`);
    console.log(`   al día:      ${totalOk}`);
    console.log(`   pendientes:  ${pendientes.length}`);
    console.log(`   ilegibles:   ${ilegibles.length}`);

    if (ilegibles.length) {
      console.log('\n   Ilegibles — cifradas con una clave que ya no está configurada.');
      console.log('   Si conservas esa clave en algún sitio, añádela como');
      console.log('   ENCRYPTION_MASTER_KEY_V<n> y vuelve a ejecutar; si no, sus dueños');
      console.log('   tienen que reconectar la integración:');
      for (const f of ilegibles) {
        const et = almacen.etiqueta.map(c => `${c}=${String(f[c] || '').slice(0, 8)}`).join(' ');
        console.log(`     · ${et}`);
      }
    }

    if (!EJECUTAR) continue;
    if (!pendientes.length) { console.log('\n   Nada que reescribir.'); continue; }

    console.log('\n   Reescribiendo…');
    let hechas = 0, fallos = 0;
    for (const fila of pendientes) {
      try {
        // Descifrar y volver a cifrar por separado: si el cifrado fallara, no
        // se llega a escribir y la fila se queda como estaba.
        const nuevo = encrypt(decrypt(fila[almacen.columna]));
        const { error: errUpd } = await s.from(almacen.tabla)
          .update({ [almacen.columna]: nuevo })
          .eq('id', fila.id);
        if (errUpd) { fallos++; console.log(`     fallo en ${fila.id}: ${errUpd.message.slice(0, 50)}`); }
        else hechas++;
      } catch (err) {
        fallos++;
        console.log(`     fallo en ${fila.id}: ${err.message.slice(0, 50)}`);
      }
    }
    console.log(`   reescritas: ${hechas}   fallos: ${fallos}`);
  }

  console.log(`\nResumen — al día: ${totalOk}   pendientes: ${totalPend}   ilegibles: ${totalIleg}`);
  if (!EJECUTAR && totalPend) {
    console.log('\nPara reescribir:  node scripts/rotate-encryption-key.js --execute');
  }
})();
