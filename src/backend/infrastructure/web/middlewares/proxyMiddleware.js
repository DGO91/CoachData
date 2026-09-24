const { createProxyMiddleware } = require('http-proxy-middleware');
const { getSupabaseClient } = require('../../database/supabaseClient');
const supabase = getSupabaseClient();
const IS_DOCKER = process.env.DOCKER_ENV === 'true';

const injectKeysMiddleware = async (req, res, next) => {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (req.query && req.query.token) {
        token = req.query.token; // Para llamadas desde iframes que envían el token en la URL
    }

    req.userKeys = {};
    req.tenantId = null;
    if (supabase && token) {
        try {
            const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
            if (!userErr && user) {
                const { data: creds } = await supabase
                    .from('user_credentials')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                if (creds) {
                    req.userKeys = creds;
                }

                // Obtener el ID de tenant asociado
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('id')
                    .eq('auth_user_id', user.id)
                    .single();
                if (tenant) {
                    req.tenantId = tenant.id;
                }
            }
        } catch (err) {
            console.error('[Proxy Middleware] Error recuperando llaves o tenant del usuario:', err.message);
        }
    }
    next();
};

function setupProxyRoutes(app, SUBSYSTEMS) {
    SUBSYSTEMS.forEach((s) => {
        if (s.headless) return;

        let dockerHost = `agent_${s.key.replace(/-/g, '_')}`;
        if (s.key === 'knowledge-agent') {
            dockerHost = 'agent_knowledge';
        }
        const targetHost = IS_DOCKER ? dockerHost : '127.0.0.1';
        const targetUrl = `http://${targetHost}:${s.port}`;

        app.use(
            `/svc/${s.key}`,
            injectKeysMiddleware,
            createProxyMiddleware({
                target: targetUrl,
                changeOrigin: true,
                ws: true,
                pathRewrite: { [`^/svc/${s.key}`]: '' },
                logLevel: 'warn',
                on: {
                    proxyReq: (proxyReq, req, res) => {
                        /* Las claves de modelo salen de la bóveda cifrada
                           (client_provider_keys), no de user_credentials, que
                           no tiene columna para ellas: las tres líneas que
                           leían req.userKeys.*_api_key nunca enviaron nada.
                           Se conserva ese origen como respaldo por si alguna
                           instalación antigua sí lo tuviera. */
                        const claveOpenAI = req.modelKeys?.openai_key || req.userKeys.openai_api_key;
                        const claveAnthropic = req.modelKeys?.anthropic_key || req.userKeys.anthropic_api_key;
                        const claveGoogle = req.modelKeys?.google_key || req.userKeys.google_api_key;

                        if (claveOpenAI) proxyReq.setHeader('X-OpenAI-Key', claveOpenAI);
                        if (claveAnthropic) proxyReq.setHeader('X-Anthropic-Key', claveAnthropic);
                        if (claveGoogle) proxyReq.setHeader('X-Google-Key', claveGoogle);
                        
                        if (req.userKeys.google_oauth_token) proxyReq.setHeader('X-Google-OAuth-Token', req.userKeys.google_oauth_token);
                        if (req.userKeys.google_calendar_oauth) proxyReq.setHeader('X-Google-Calendar-OAuth', req.userKeys.google_calendar_oauth);
                        if (req.userKeys.google_mail_oauth) proxyReq.setHeader('X-Google-Mail-OAuth', req.userKeys.google_mail_oauth);

                        if (req.tenantId) {
                            proxyReq.setHeader('x-tenant-id', req.tenantId);
                        }

                        if (req.body && Object.keys(req.body).length) {
                            const bodyData = JSON.stringify(req.body);
                            proxyReq.setHeader('Content-Type', 'application/json');
                            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                            proxyReq.write(bodyData);
                        }
                    }
                }
            })
        );
    });
}

module.exports = { injectKeysMiddleware, setupProxyRoutes };
