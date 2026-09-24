'use strict';

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

/**
 * Superficies activas por organización.
 *
 * El producto creció hasta nueve zonas navegables mientras su promesa es un
 * único centro de mando. Esto permite apagar las que no forman parte del Sistema
 * Pulpo sin borrar una línea de código: lo que no se usa se oculta, se mide, y
 * sólo entonces se decide si se elimina.
 *
 * Se guardan en organizations.settings_json, igual que el perfil y las etapas de
 * pipeline, porque `organizations` no tiene columnas dedicadas para esto.
 */

// Las tres del Pulpo van encendidas y no se pueden apagar: son el producto.
const SUPERFICIES_NUCLEO = ['dashboard', 'agents-hub', 'reports-hub'];

// Apagables. El valor es el estado por omisión para una organización nueva.
// media-suite y revenue-suite nacieron apagadas mientras se decidía si el
// producto competía de frente con las suites todo-en-uno del mercado. El 19 de
// agosto de 2026 el propietario resolvió que se quedan, así que dejan de nacer
// apagadas: son ~40% del código y esconderlas ya no responde a ninguna duda
// abierta. Siguen siendo apagables por organización desde el Centro de
// Configuración; lo que cambia es el valor por omisión.
const SUPERFICIES_OPCIONALES = {
    'media-suite': true,      // Content Desk, Project Desk, Message Bank
    'revenue-suite': true,    // CRM, propuestas, contratos, facturación
    'client-portal': true,    // lo que ve el cliente final del coach
};

function surfacesFromRow(row) {
    const guardadas = (row?.settings_json || {}).surfaces || {};
    const activas = {};
    for (const [clave, porOmision] of Object.entries(SUPERFICIES_OPCIONALES)) {
        // Sólo un booleano explícito anula el valor por omisión: así, añadir una
        // superficie nueva a la lista no la enciende en las organizaciones que ya
        // existen sin que nadie lo haya decidido.
        activas[clave] = typeof guardadas[clave] === 'boolean' ? guardadas[clave] : porOmision;
    }
    for (const clave of SUPERFICIES_NUCLEO) activas[clave] = true;
    return activas;
}

async function getSurfaces(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('organizations')
        .select('settings_json')
        .eq('id', organizationId)
        .single();

    if (error) throw error;
    return surfacesFromRow(data);
}

async function updateSurfaces(organizationId, cambios) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const aplicables = {};
    for (const [clave, valor] of Object.entries(cambios || {})) {
        if (!(clave in SUPERFICIES_OPCIONALES)) continue;   // clave desconocida: se ignora
        if (typeof valor !== 'boolean') continue;
        aplicables[clave] = valor;
    }

    if (!Object.keys(aplicables).length) {
        const err = new Error('No se recibió ninguna superficie válida que actualizar');
        err.statusCode = 400;
        throw err;
    }

    const { data: actual, error: errLectura } = await supabase
        .from('organizations')
        .select('settings_json')
        .eq('id', organizationId)
        .single();
    if (errLectura) throw errLectura;

    const settings = actual.settings_json || {};
    const { data, error } = await supabase
        .from('organizations')
        .update({
            settings_json: { ...settings, surfaces: { ...(settings.surfaces || {}), ...aplicables } },
            updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
        .select('settings_json')
        .single();

    if (error) throw error;
    return surfacesFromRow(data);
}

module.exports = {
    getSurfaces,
    updateSurfaces,
    SUPERFICIES_NUCLEO,
    SUPERFICIES_OPCIONALES,
};
