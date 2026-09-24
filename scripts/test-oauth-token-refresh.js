/**
 * test-oauth-token-refresh.js
 *
 * Verifica el auto-refresh y la persistencia del token de Google OAuth
 * (plan google_oauth_auto_refresh_plan.md).
 *
 * Qué prueba, y por qué cada caso puede fallar de verdad:
 *  0. Sin token interno / con token mal firmado -> 401 / 403.
 *  1. Un token de Google renovado se guarda CIFRADO y se recupera igual.
 *     Control positivo real: se lee la fila de vuelta y se compara el contenido.
 *  2. Un provider_name fuera de la lista blanca se rechaza con 400 y NO escribe.
 *     Sin este filtro, un provider_name cualquiera sobrescribe cualquier
 *     credencial del coach (incluido whatsapp_number).
 *
 * Usa un tenant efímero propio y lo borra al terminar: no toca datos reales.
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { SUBSYSTEMS } = require('../src/backend/application/orchestrator/agentOrchestrator');
const { createApp } = require('../src/backend/infrastructure/web/app');
const { INTERNAL_SECRET } = require('../src/backend/config/env');

const EPHEMERAL_TENANT_ID = 'e0000000-0000-4000-a000-0000000000aa';

let passed = true;
function ok(msg)   { console.log(`  [PASS] ${msg}`); }
function fail(msg) { console.error(`  [FAIL] ${msg}`); passed = false; }

(async () => {
    console.log('====================================================');
    console.log('COACHDATA — GOOGLE OAUTH TOKEN REFRESH PERSISTENCE SUITE');
    console.log('====================================================');

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const app = createApp(SUBSYSTEMS || []);
    const server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    const base = `http://127.0.0.1:${server.address().port}`;
    console.log(`[Setup] Test server on ${base}`);

    const validToken   = jwt.sign({ role: 'internal-agent' }, INTERNAL_SECRET, { expiresIn: '5m' });
    const forgedToken  = jwt.sign({ role: 'internal-agent' }, 'wrong-secret-on-purpose', { expiresIn: '5m' });
    const url = `${base}/api/internal/credentials/${EPHEMERAL_TENANT_ID}/update`;

    const post = async (headers, body) => {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
        });
        return { status: res.status, body: await res.text() };
    };

    try {
        // Tenant efímero: la FK de client_provider_keys exige que exista.
        const { data: anyOrg } = await supabase
            .from('organizations').select('id').order('created_at').limit(1).maybeSingle();
        const { error: setupErr } = await supabase.from('tenants').upsert({
            id: EPHEMERAL_TENANT_ID,
            company_name: 'Ephemeral OAuth Test Tenant',
            primary_contact_email: 'ephemeral-oauth-test@coachdata.local',
            market_language: 'es',
            active_package: 'Pending / Free Tier',
            organization_id: anyOrg?.id || null,
        });
        // Si el tenant no se crea, todo lo que sigue fallaría por la FK y el
        // motivo real quedaría enterrado en un 500 genérico.
        if (setupErr) throw new Error(`No se pudo crear el tenant efímero: ${setupErr.message}`);

        // ── 0. Seguridad ────────────────────────────────────────────────────
        console.log('\n0. SECURITY (internal token enforcement):');
        const noTok = await post({}, { provider_name: 'google_calendar_oauth', token_data: { a: 1 } });
        noTok.status === 401
            ? ok(`Sin x-internal-token -> HTTP 401.`)
            : fail(`Sin token esperaba 401, llegó ${noTok.status}.`);

        const badTok = await post({ 'x-internal-token': forgedToken }, { provider_name: 'google_calendar_oauth', token_data: { a: 1 } });
        badTok.status === 403
            ? ok(`Token firmado con otro secreto -> HTTP 403.`)
            : fail(`Token falso esperaba 403, llegó ${badTok.status}.`);

        // ── 1. Control positivo: se persiste y se puede releer ──────────────
        console.log('\n1. CONTROL POSITIVE (refreshed token is persisted encrypted):');
        const refreshed = {
            token: `ya29.test-${Date.now()}`,
            refresh_token: '1//test-refresh-token',
            expiry: '2099-01-01T00:00:00.000Z',
        };
        const saved = await post({ 'x-internal-token': validToken }, {
            provider_name: 'google_calendar_oauth',
            token_data: refreshed,
        });

        if (saved.status !== 200) {
            fail(`El guardado devolvió HTTP ${saved.status}: ${saved.body}`);
        } else {
            const { data: row } = await supabase
                .from('client_provider_keys')
                .select('api_key_encrypted, provider_type, provider_name')
                .eq('tenant_id', EPHEMERAL_TENANT_ID)
                .eq('provider_name', 'google_calendar_oauth')
                .maybeSingle();

            if (!row) {
                fail('HTTP 200 pero no existe la fila en client_provider_keys.');
            } else if (row.api_key_encrypted.includes(refreshed.token)) {
                fail('El token se guardó EN CLARO: aparece literal en api_key_encrypted.');
            } else {
                const { getDecryptedTenantKeys } = require('../src/backend/application/credentials/credentialsUseCase');
                const creds = await getDecryptedTenantKeys(EPHEMERAL_TENANT_ID);
                const stored = creds.keys?.google_calendar_oauth;
                const parsed = stored ? JSON.parse(stored) : null;
                parsed?.token === refreshed.token && parsed?.refresh_token === refreshed.refresh_token
                    ? ok('Token guardado cifrado y recuperado idéntico (token + refresh_token).')
                    : fail(`Lo recuperado no coincide con lo guardado: ${stored}`);
            }
        }

        // ── 2. Lista blanca ────────────────────────────────────────────────
        console.log('\n2. PROVIDER WHITELIST (must not overwrite other credentials):');
        const intruso = 'whatsapp_number';
        const rejected = await post({ 'x-internal-token': validToken }, {
            provider_name: intruso,
            token_data: { number: '34600000000' },
        });

        const { data: leaked } = await supabase
            .from('client_provider_keys')
            .select('id')
            .eq('tenant_id', EPHEMERAL_TENANT_ID)
            .eq('provider_name', intruso);

        if (rejected.status !== 400) {
            fail(`provider_name='${intruso}' esperaba HTTP 400, llegó ${rejected.status}.`);
        } else if (leaked && leaked.length > 0) {
            fail(`Devolvió 400 pero escribió igualmente la fila '${intruso}'.`);
        } else {
            ok(`provider_name='${intruso}' -> HTTP 400 y no se escribió ninguna fila.`);
        }
    } catch (err) {
        fail(`Excepción durante la suite: ${err.message}`);
    } finally {
        await supabase.from('client_provider_keys').delete().eq('tenant_id', EPHEMERAL_TENANT_ID);
        await supabase.from('tenants').delete().eq('id', EPHEMERAL_TENANT_ID);
        server.close();
    }

    console.log('\n----------------------------------------------------');
    if (passed) {
        console.log('OAUTH TOKEN REFRESH VERDICT: ALL TESTS PASSED — PASS');
        process.exit(0);
    } else {
        console.error('OAUTH TOKEN REFRESH VERDICT: FAIL');
        process.exit(1);
    }
})();
