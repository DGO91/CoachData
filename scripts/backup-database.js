/**
 * backup-database.js
 *
 * Exporta a JSON todas las tablas de datos de la plataforma.
 *
 * Por qué existe: el plan Free de Supabase **no hace copias de seguridad
 * automáticas** — ni diarias ni PITR. En Pro hay 7 días de copias diarias, y
 * PITR es un extra de pago. Hasta confirmar qué plan tiene el proyecto, esta
 * es la única red que hay.
 *
 * Uso:
 *   node scripts/backup-database.js [carpeta-destino]
 *
 * Por defecto escribe en ./backups/, que está fuera de git a propósito:
 * el volcado incluye `client_provider_keys` con las claves de los coaches
 * (cifradas, pero no deben acabar en el repositorio ni en un adjunto).
 *
 * NO sustituye a las copias del proveedor: no incluye usuarios de Supabase
 * Auth (esquema `auth`), políticas RLS, funciones ni triggers. Es una red
 * para los datos de negocio, no un clon del proyecto.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Todo lo que perderíamos. Orden pensado para restaurar respetando las claves
// foráneas: primero lo que otras tablas referencian.
const TABLAS = [
    'organizations',
    'profiles',
    'tenants',
    'organization_memberships',
    'client_provider_keys',
    'crm_companies',
    'crm_contacts',
    'crm_deals',
    'canonical_contact',
    'canonical_payment',
    'canonical_session',
    'canonical_form_entry',
    'operations_tasks',
    'proposals',
    'contracts',
    'invoices',
    'call_sessions',
    'waitlist',
    'lead_scoring_config',
    'agent_schedules',
];

async function main() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
        process.exit(1);
    }

    const supabase = createClient(url, key);
    const destino = process.argv[2] || path.join(process.cwd(), 'backups');
    fs.mkdirSync(destino, { recursive: true });

    const marca = new Date().toISOString().replace(/[:.]/g, '-');
    const archivo = path.join(destino, `coachdata-backup-${marca}.json`);

    const volcado = { generado_en: new Date().toISOString(), proyecto: url, tablas: {} };
    let totalFilas = 0;
    let fallos = 0;

    console.log('Exportando…\n');

    for (const tabla of TABLAS) {
        const { data, error } = await supabase.from(tabla).select('*');
        if (error) {
            // Una tabla que no existe no es un fallo: el esquema evoluciona.
            // Pero un error de permisos o de red sí lo es, y no puede pasar
            // desapercibido en un backup.
            const noExiste = /does not exist|schema cache/i.test(error.message);
            console.log(`  ${tabla.padEnd(26)} ${noExiste ? '— no existe, se omite' : 'ERROR: ' + error.message}`);
            if (!noExiste) fallos++;
            continue;
        }
        volcado.tablas[tabla] = data || [];
        totalFilas += (data || []).length;
        console.log(`  ${tabla.padEnd(26)} ${String((data || []).length).padStart(5)} filas`);
    }

    fs.writeFileSync(archivo, JSON.stringify(volcado, null, 2), 'utf8');
    const kb = (fs.statSync(archivo).size / 1024).toFixed(1);

    console.log(`\nGuardado en: ${archivo}`);
    console.log(`Total: ${totalFilas} filas · ${kb} KB`);

    if (fallos > 0) {
        console.error(`\nATENCIÓN: ${fallos} tabla(s) fallaron por algo que no es "no existe".`);
        console.error('El backup está INCOMPLETO. Revisa los errores de arriba antes de fiarte de él.');
        process.exit(1);
    }

    console.log('\nRecuerda: este archivo contiene credenciales cifradas de los coaches.');
    console.log('No lo subas al repositorio ni lo envíes por correo.');
}

main().catch((err) => {
    console.error('Backup fallido:', err.message);
    process.exit(1);
});
