'use strict';

/**
 * Coaches de prueba que se crean y se borran.
 *
 * Nueve scripts de este repositorio obtenían sus JWT reescribiendo la contraseña
 * de cuentas reales a un valor fijo escrito en el propio fichero:
 *
 *     await admin.auth.admin.updateUserById(USER_ID, { password: 'TestPassword123!' })
 *
 * Los identificadores más repetidos eran los de los dos administradores del
 * producto. Cada pasada del CI les cambiaba la contraseña, y esa contraseña
 * estaba en el repositorio. Además dependían de UUID escritos a mano, así que
 * borrar un usuario de prueba rompía los tests.
 *
 * Este módulo crea lo que cada prueba necesita, con contraseña aleatoria, y lo
 * retira al terminar. Ninguna cuenta real se toca.
 *
 *   const { crearEntorno } = require('./lib/coaches-efimeros');
 *   const ent = await crearEntorno(['a', 'b']);
 *   try { ... ent.coaches.a.token ... } finally { await ent.limpiar(); }
 */

const { createClient } = require('@supabase/supabase-js');

// Tablas con organization_id que las pruebas pueden llenar. Se vacían antes de
// borrar la organización para no chocar con las claves ajenas.
// `waitlist` no está aquí a propósito: es global, no tiene organization_id.
const TABLAS_DEPENDIENTES = [
    'agent_reports', 'ai_agent_logs', 'crm_contacts', 'crm_companies', 'crm_deals',
    'operations_tasks', 'operations_projects', 'webhook_inbox',
    'canonical_contact', 'canonical_form_entry', 'canonical_payment', 'canonical_session',
    'lead_scoring_config', 'agent_schedules',
    'organization_memberships',
];

function admin() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function anon() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY);
}

/** Cliente que consulta con la identidad del coach: hace que RLS se aplique. */
function clienteDeCoach(token) {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    );
}

async function crearEntorno(etiquetas = ['a']) {
    const db = admin();
    const publico = anon();
    const marca = Date.now();
    const clave = `Efim-${marca}-${Math.random().toString(36).slice(2, 10)}!`;
    const creados = { users: [], orgs: [] };
    const coaches = {};

    for (const etq of etiquetas) {
        const email = `efimero-${etq}-${marca}@coachdata.test`;

        const { data: u, error: eU } = await db.auth.admin.createUser({
            email, password: clave, email_confirm: true,
        });
        if (eU) throw new Error(`No se pudo crear el usuario '${etq}': ${eU.message}`);
        creados.users.push(u.user.id);

        await db.from('users').insert({ id: u.user.id, email, full_name: `Coach ${etq}` });

        const { data: org, error: eO } = await db.from('organizations')
            .insert({ name: `Efímera ${etq} ${marca}`, slug: `efimero-${etq}-${marca}` })
            .select('id, slug').single();
        if (eO) throw new Error(`No se pudo crear la organización '${etq}': ${eO.message}`);
        creados.orgs.push(org.id);

        await db.from('organization_memberships')
            .insert({ organization_id: org.id, user_id: u.user.id, role: 'owner' });

        const { data: s, error: eS } = await publico.auth.signInWithPassword({ email, password: clave });
        if (eS) throw new Error(`No se pudo iniciar sesión como '${etq}': ${eS.message}`);

        coaches[etq] = {
            userId: u.user.id,
            email,
            organizationId: org.id,
            slug: org.slug,
            token: s.session.access_token,
            db: clienteDeCoach(s.session.access_token),
        };
    }

    // Se ejecuta siempre, incluso si la prueba falló: dejar residuos convertiría
    // la base en la que ya estamos —45 consultas sueltas, usuarios de prueba
    // olvidados— en algo peor.
    async function limpiar() {
        if (creados.orgs.length) {
            for (const t of TABLAS_DEPENDIENTES) {
                await db.from(t).delete().in('organization_id', creados.orgs);
            }
            await db.from('organizations').delete().in('id', creados.orgs);
        }
        if (creados.users.length) {
            await db.from('users').delete().in('id', creados.users);
            // `profiles` es una tabla heredada que no aparece en ninguna migración
            // versionada y que se rellena por su cuenta al crear el usuario. Se
            // olvidó en la primera versión de esta limpieza y dejó 22 filas
            // huérfanas: los usuarios ya no existían en auth, pero sus perfiles sí.
            await db.from('profiles').delete().in('id', creados.users);
            for (const id of creados.users) await db.auth.admin.deleteUser(id);
        }
    }

    return { coaches, limpiar, admin: db, marca };
}

module.exports = { crearEntorno, clienteDeCoach };
