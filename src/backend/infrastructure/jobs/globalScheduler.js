const { runPersonalAgentUseCase } = require('../../application/orchestrator/agentOrchestrator');
const { getPersonalAgentStatus } = require('../../application/orchestrator/agentOrchestrator');
const { organizacionesADisparar } = require('../../application/agents/agentSchedulesService');
const { tomarCandado, soltarCandado } = require('../../application/agents/agentRunsService');

function startGlobalScheduler() {
    setInterval(() => {
        const now = new Date();

        /* Cada agente pregunta por las organizaciones cuyo horario cae en este
           minuto. Antes el disparo iba a 'default_tenant' escrito a mano: el
           horario lo ponía una organización y el agente corría para otra. */
        dispararAgentesProgramados(now).catch(err => {
            console.error('[Suite] Error disparando los agentes programados:', err.message);
        });

        // Pre-Call Agent (managed independently)

        // Weekly Digest Agent (Mondays)
        const fs = require('fs');
        const path = require('path');
        const weeklyDigestSettingsPath = path.join(__dirname, '../../../agents/weekly_digest', 'settings.json');
        if (fs.existsSync(weeklyDigestSettingsPath)) {
            try {
                const wdSettings = JSON.parse(fs.readFileSync(weeklyDigestSettingsPath, 'utf8'));
                if (wdSettings.scheduleActive && now.getDay() === 1 && now.getHours() === wdSettings.cronHour && now.getMinutes() === wdSettings.cronMinute) {
                    console.log(`[Suite] Lunes ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} - Weekly Digest programado...`);
                    const hostname = process.env.DOCKER_ENV === 'true' ? 'coachdata_agent_weekly_digest' : 'localhost';
                    fetch(`http://${hostname}:4014/api/trigger-digest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tenantId: wdSettings.tenantId || '' })
                    })
                    .then(res => res.json())
                    .then(data => console.log('[Suite] Scheduled Weekly Digest triggered:', data.message || data.error))
                    .catch(err => console.error('[Suite Error] Failed to trigger Weekly Digest:', err.message));
                }
            } catch (wdErr) {
                console.error('[Suite Error] Failed to read Weekly Digest settings:', wdErr.message);
            }
        }
    }, 60000);

    // Proactive token refresh schedule: runs every 12 hours
    setInterval(() => {
        runProactiveGoogleTokenRefresh().catch(err => {
            console.error('[Proactive OAuth Refresh] Error running background refresh schedule:', err.message);
        });
    }, 12 * 60 * 60 * 1000);

    // Run once on startup after 30 seconds delay to avoid boot bottleneck
    setTimeout(() => {
        runProactiveGoogleTokenRefresh().catch(err => {
            console.error('[Proactive OAuth Refresh] Initial startup refresh run failed:', err.message);
        });
    }, 30000);

    // Buzón de webhooks: el router sólo guarda los eventos entrantes, así que
    // alguien tiene que normalizarlos. Cada 30 segundos es suficiente para que
    // un pago aparezca en el panel casi al instante, y lo bastante espaciado
    // para no tener una consulta permanente contra Supabase.
    //
    // Si esta tanda falla entera, los eventos siguen en el buzón marcados como
    // pendientes: no se pierde nada, se procesan en la siguiente vuelta.
    let tandaEnCurso = false;
    setInterval(() => {
        if (tandaEnCurso) return;   // evita solapar tandas si una se alarga
        tandaEnCurso = true;
        procesarBuzonWebhooks()
            .catch(err => console.error('[InboxConsumer] Error procesando la tanda:', err.message))
            .finally(() => { tandaEnCurso = false; });
    }, 30000);

    // Salud de las integraciones, cada 6 horas. El umbral de silencio son 48
    // horas, así que revisar más a menudo no adelantaría ningún aviso; y como la
    // alerta se actualiza en vez de duplicarse, tampoco molesta que se repita.
    setInterval(() => {
        revisarSaludIntegraciones().catch(err => {
            console.error('[IntegrationHealth] Error en la revisión periódica:', err.message);
        });
    }, 6 * 60 * 60 * 1000);

    // Una primera pasada al arrancar, con margen para no competir con el resto
    // del arranque.
    setTimeout(() => {
        revisarSaludIntegraciones().catch(err => {
            console.error('[IntegrationHealth] Error en la revisión inicial:', err.message);
        });
    }, 90000);
}

/**
 * Dispara, para el minuto en curso, los agentes de cada organización que los
 * tenga programados a esa hora.
 *
 * El Morning Briefing se salta la organización que ya lo tenga corriendo. Ese
 * chequeo sigue siendo global porque el orquestador todavía lleva un único
 * estado de ejecución para todo el proceso; cuando pase a ser por organización,
 * aquí solo cambia la llamada.
 */
async function dispararAgentesProgramados(ahora) {
    const path = require('path');
    const reloj = `${ahora.getHours()}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    const paraBriefing = await organizacionesADisparar('morning_briefing', ahora);
    for (const organizationId of paraBriefing) {
        /* getPersonalAgentStatus() sigue llevando un único estado para todo el
           proceso, así que el candado por organización se toma aquí: mientras
           el orquestador no separe su estado, esto evita al menos que dos
           organizaciones se pisen el registro de ejecución. */
        const candado = await tomarCandado(organizationId, 'morning_briefing');
        if (!candado.tomado) {
            console.log(`[Suite] Morning Briefing omitido para ${organizationId}: ${candado.motivo}`);
            continue;
        }

        const { isRunning } = getPersonalAgentStatus();
        if (isRunning) {
            await soltarCandado(candado.runId, 'cancelled', { error: 'El orquestador ya tenía un briefing en curso' });
            console.log(`[Suite] Morning Briefing ya en curso en el orquestador; se omite ${organizationId}`);
            continue;
        }

        console.log(`[Suite] ${reloj} - Morning Briefing lanzado para la organización ${organizationId}`);
        runPersonalAgentUseCase(organizationId, path.join(__dirname, '../../'), (resultado) => {
            const ok = resultado?.success === true;
            void soltarCandado(candado.runId, ok ? 'completed' : 'failed',
                ok ? {} : { error: resultado?.error || `El briefing terminó con código ${resultado?.code}` });
        });
    }

    const { runEveningSummary } = require('../web/routes/agentRoutes');
    const paraResumen = await organizacionesADisparar('evening_summary', ahora);
    for (const organizationId of paraResumen) {
        /* El candado decide: si esa organización ya lo tiene en marcha, esta
           llamada no lanza nada y lo dice. Antes lo decidía una variable
           global, que bloqueaba a todas las demás. */
        const resultado = await runEveningSummary({ tenantId: organizationId });
        console.log(resultado.lanzado
            ? `[Suite] ${reloj} - Evening Summary lanzado para la organización ${organizationId}`
            : `[Suite] ${reloj} - Evening Summary omitido para ${organizationId}: ${resultado.motivo}`);
    }
}

async function revisarSaludIntegraciones() {
    const { revisarTodas } = require('../../application/integrations/integrationHealthService');
    const resultados = await revisarTodas();
    const conAviso = resultados.filter(r => r.problemas > 0);
    if (conAviso.length) {
        console.log(`[IntegrationHealth] ${conAviso.length} organizacion(es) con integraciones que necesitan atención`);
    }
}

async function procesarBuzonWebhooks() {
    const { getSupabaseClient } = require('../database/supabaseClient');
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { getDispatcher } = require('../web/routes/webhookRoutes');
    const dispatcher = getDispatcher();
    if (!dispatcher) return;

    const { InboxConsumer } = require('../../modules/webhooks/application/InboxConsumer');
    const consumer = new InboxConsumer({ supabaseClient: supabase, dispatcher });
    const resumen = await consumer.procesarTanda();

    if (resumen.leidos > 0) {
        console.log(`[InboxConsumer] ${resumen.procesados} procesados, ${resumen.fallidos} reintentables, ${resumen.descartados} descartados de ${resumen.leidos} leídos`);
    }
}

async function runProactiveGoogleTokenRefresh() {
    console.log('[Proactive OAuth Refresh] Starting background refresh cycle for all active Google connections...');
    const { getSupabaseClient } = require('../database/supabaseClient');
    const { decrypt, encrypt } = require('../services/encryptionService');
    const { getGoogleOAuthClient } = require('../../application/auth/googleAuthUseCase');
    const axios = require('axios');

    const supabase = getSupabaseClient();
    if (!supabase) {
        console.warn('[Proactive OAuth Refresh] Supabase client not initialized. Skipping refresh cycle.');
        return;
    }

    const { data: credentials, error } = await supabase
        .from('client_provider_keys')
        .select('*')
        .in('provider_name', ['google_calendar_oauth', 'google_mail_oauth']);

    if (error) {
        console.error('[Proactive OAuth Refresh] Failed to fetch credentials from Vault:', error.message);
        return;
    }

    if (!credentials || credentials.length === 0) {
        console.log('[Proactive OAuth Refresh] No active Google connections found in database.');
        return;
    }

    for (const cred of credentials) {
        if (!cred.api_key_encrypted) continue;

        let tokenData;
        try {
            const decrypted = decrypt(cred.api_key_encrypted);
            tokenData = JSON.parse(decrypted);
        } catch (decryptErr) {
            console.error(`[Proactive OAuth Refresh] Failed to decrypt credentials for tenant ${cred.tenant_id} (provider: ${cred.provider_name}). Key mismatch?`);
            continue;
        }

        // Skip credentials already flagged as needs_reconnection
        if (tokenData.status === 'needs_reconnection') continue;

        if (!tokenData.refresh_token) {
            console.log(`[Proactive OAuth Refresh] Tenant ${cred.tenant_id} (${cred.provider_name}) lacks refresh_token. Re-auth required.`);
            continue;
        }

        console.log(`[Proactive OAuth Refresh] Processing refresh for tenant ${cred.tenant_id} (${cred.provider_name})...`);
        const oauth2Client = getGoogleOAuthClient();
        if (!oauth2Client) continue;

        oauth2Client.setCredentials({
            access_token: tokenData.token,
            refresh_token: tokenData.refresh_token
        });

        try {
            const { credentials: refreshed } = await oauth2Client.refreshAccessToken();
            
            const updatedTokenData = {
                ...tokenData,
                token: refreshed.access_token,
                expiry: new Date(refreshed.expiry_date || Date.now() + 3600000).toISOString()
            };
            if (refreshed.refresh_token) {
                updatedTokenData.refresh_token = refreshed.refresh_token;
            }

            const encryptedToken = encrypt(JSON.stringify(updatedTokenData));
            await supabase
                .from('client_provider_keys')
                .update({ api_key_encrypted: encryptedToken, updated_at: new Date().toISOString() })
                .eq('id', cred.id);

            console.log(`[Proactive OAuth Refresh] Successfully refreshed Google token for tenant ${cred.tenant_id} (${cred.provider_name}).`);
        } catch (refreshErr) {
            const isInvalidGrant = refreshErr.message && refreshErr.message.includes('invalid_grant');
            
            if (isInvalidGrant) {
                console.warn(`[Proactive OAuth Refresh] Permanent Google OAuth revocation (invalid_grant) detected for tenant ${cred.tenant_id} (${cred.provider_name}).`);
                
                // Flag the connection status inside the encrypted JSON
                tokenData.status = 'needs_reconnection';
                const encryptedFlagged = encrypt(JSON.stringify(tokenData));
                await supabase
                    .from('client_provider_keys')
                    .update({ api_key_encrypted: encryptedFlagged, updated_at: new Date().toISOString() })
                    .eq('id', cred.id);

                // Notify the coach via WhatsApp using Evolution API
                try {
                    const { getDecryptedTenantKeys } = require('../../application/credentials/credentialsUseCase');
                    const coachCreds = await getDecryptedTenantKeys(cred.tenant_id);
                    const targetNumber = coachCreds.keys && coachCreds.keys.whatsapp_number;

                    if (targetNumber) {
                        const cleanNumber = targetNumber.toString().replace(/\D/g, '');
                        const instanceName = `tenant_${cred.tenant_id.replace(/-/g, '')}`;
                        const baseUrl = process.env.EVOLUTION_API_URL;
                        const apiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

                        if (baseUrl && apiKey) {
                            const cleanName = cred.provider_name === 'google_calendar_oauth' ? 'Google Calendar' : 'Google Mail';
                            const messageText = `⚠️ *Aviso de CoachData OS*\n\nTu cuenta de *${cleanName}* se ha desconectado por motivos de seguridad o expiración del token.\n\nPor favor, vuelve a iniciar sesión para que tus agentes de IA puedan seguir entregándote tus informes:\n👉 http://localhost:4000/credentials`;

                            await axios.post(`${baseUrl}/message/sendText/${instanceName}`, {
                                number: cleanNumber,
                                options: { delay: 1000, presence: 'composing' },
                                text: messageText
                            }, {
                                headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
                                timeout: 10000
                            });
                            console.log(`[Proactive OAuth Refresh] WhatsApp alert dispatched successfully to ${cleanNumber}`);
                        }
                    }
                } catch (wsAlertErr) {
                    console.error(`[Proactive OAuth Refresh] Failed to dispatch WhatsApp connection alert:`, wsAlertErr.message);
                }
            } else {
                console.error(`[Proactive OAuth Refresh] Temporary failure refreshing token for tenant ${cred.tenant_id}:`, refreshErr.message);
            }
        }
    }
}

module.exports = { startGlobalScheduler };
