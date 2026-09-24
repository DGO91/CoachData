const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');


const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tenantVaultRoutes = require('./routes/tenantVaultRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const invitationRedeemRoutes = require('./routes/invitationRedeemRoutes');
const authRoutes = require('./routes/authRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const { router: agentRoutes } = require('./routes/agentRoutes');
const googleAgentRoutes = require('./routes/googleAgentRoutes');
const nangoRoutes = require('./routes/nangoRoutes');
const evolutionRoutes = require('./routes/evolutionRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const connectionStatusRoutes = require('./routes/connectionStatusRoutes');

const { setupProxyRoutes } = require('./middlewares/proxyMiddleware');

function createApp(SUBSYSTEMS) {
    const app = express();

    // 1. Helmet Security Headers (Sprint 7.1)
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // Sin CDN de Tailwind y sin scripts inline en el HTML: el bundle
                // lo sirve la propia aplicación, así que scriptSrc queda en
                // 'self' a secas. Era 'unsafe-inline' + cdn.tailwindcss.com, que
                // desactivaba buena parte de la protección de esta cabecera.
                scriptSrc: ["'self'"],
                // styleSrc ya no necesita 'unsafe-inline'. La creencia de que hacía
                // falta por los style={{...}} de React era falsa: React los aplica
                // por CSSOM (element.style.x = …), que CSP no gobierna; sólo el
                // atributo style= del HTML lo está, y aquí no hay ninguno. Lo que
                // sí lo exigía era un único <style dangerouslySetInnerHTML> en
                // PublicProposalPage, ahora extraído a PublicProposalPage.css y
                // servido desde 'self' por el bundle.
                styleSrc: ["'self'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https:", "wss:"],
            },
        },
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        frameguard: { action: 'deny' },
        // Dos años, como tenía nginx antes de quitarle las cabeceras. Sin
        // `preload`: solo tiene efecto si se inscribe el dominio raíz en
        // hstspreload.org, y coachdata.example lo sirve Showit, no esta app.
        hsts: { maxAge: 63072000, includeSubDomains: true },
    }));

    // 2. Rate Limiters (Sprint 7.1)
    const clientLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 mins
        max: 100, // 100 req / 15 min
        message: { error: 'Too many client API requests, please try again in 15 minutes.' },
        standardHeaders: true,
        legacyHeaders: false,
    });

    const intelligenceLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30, // 30 req / 15 min
        message: { error: 'Too many intelligence API requests, please try again in 15 minutes.' },
        standardHeaders: true,
        legacyHeaders: false,
    });

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20, // 20 req / 15 min
        message: { error: 'Too many authentication attempts, please try again in 15 minutes.' }
    });

    app.use('/api/client', clientLimiter);
    app.use('/api/intelligence', intelligenceLimiter);
    app.use('/api/auth', authLimiter);
    app.use('/api/register', authLimiter);
    app.use('/api/login', authLimiter);

    // CORS con lista blanca. Antes era `cors()` a secas, que responde
    // Access-Control-Allow-Origin: * a cualquier web. La sesión viaja en la
    // cabecera Authorization y no en cookies, así que no había robo de sesión
    // automático, pero sí quedaba abierta la API a que cualquier página ajena la
    // consultara con un token obtenido por otra vía.
    //
    // Los dominios de producción salen de nginx/. ALLOWED_ORIGINS permite añadir
    // más por entorno, separados por comas, sin tocar código.
    const ORIGENES_PERMITIDOS = [
        'https://app.coachdata.example',
        'https://coachdata.example',
        'https://www.coachdata.example',
        'http://localhost:5175',   // vite dev server
        'http://localhost:4000',   // backend sirviendo el build
        ...(process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
    ];

    app.use(cors({
        origin(origin, callback) {
            // Sin cabecera Origin: peticiones que no son de navegador —webhooks de
            // Stripe, curl, health checks—. CORS no las gobierna y bloquearlas
            // aquí rompería las integraciones sin aportar seguridad.
            if (!origin) return callback(null, true);
            if (ORIGENES_PERMITIDOS.includes(origin)) return callback(null, true);
            console.warn(`[CORS] Origen rechazado: ${origin}`);
            return callback(null, false);
        },
        credentials: true,
    }));

    // El webhook de Stripe va ANTES del parser JSON y a propósito: necesita los
    // bytes exactos que Stripe firmó. Si express.json() los consume primero, su
    // express.raw() llega tarde y constructEvent recibe un objeto ya parseado,
    // con lo que la verificación falla aunque el secreto sea correcto. Tampoco
    // lleva authMiddleware: Stripe no manda JWT, se autentica por firma.
    const stripeWebhookRoutes = require('./routes/stripeWebhookRoutes');
    app.use('/api/billing/webhooks', stripeWebhookRoutes);

    // `verify` stashes the raw request body so webhook signature checks (e.g. Stripe)
    // can validate against the exact bytes sent, not the re-serialized parsed object.
    app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
    
    // Static files path adjusted for app.js location (infrastructure/web)
    app.use(express.static(path.join(__dirname, '../../../frontend/public')));
    app.use('/.well-known/acme-challenge', express.static('/var/www/certbot/.well-known/acme-challenge'));

    const { authMiddleware } = require('./middlewares/authMiddleware');
    const tenantContextMiddleware = require('./middlewares/tenantContextMiddleware');

    const systemRoutes = require('./routes/systemRoutes');
    const backupRoutes = require('../../application/backup/routes/backupRoutes');

    const { requireOwnerRole } = require('./middlewares/requireOwnerRole');

    // Deja en req.db un cliente que consulta con el JWT del usuario, para que
    // Postgres aplique las políticas de RLS. Va sólo en las rutas de sesión: los
    // webhooks, los trabajos del planificador y el panel de la agencia no tienen
    // usuario y siguen con service_role a propósito.
    const { userScopedClientMiddleware } = require('../database/userScopedClient');

    // Panel de la agencia: mira POR ENCIMA de la organización, así que no lleva
    // tenantContextMiddleware. Lo protege requirePlatformAdmin, que valida contra
    // una lista de ids en el entorno y deniega si no está configurada.
    const platformRoutes = require('./routes/platformRoutes');
    const { requirePlatformAdmin } = require('./middlewares/requirePlatformAdmin');
    app.use('/api/platform', authMiddleware, requirePlatformAdmin, platformRoutes);

    app.use('/api/system', systemRoutes);
    app.use('/api/auth', authRoutes);

    // Webhooks entrantes (Stripe, Tally, Calendly, Kajabi, WhatsApp Cloud).
    // Tráfico anónimo autenticado por FIRMA criptográfica, no por JWT: ningún
    // proveedor externo manda Authorization ni x-organization-slug, así que este
    // router NO puede ir detrás de authMiddleware/tenantContextMiddleware — el
    // tenant viaja en la propia URL (:tenant_id) y lo resuelve el dispatcher.
    // Depende del express.json({ verify }) de arriba, que deja los bytes crudos
    // en req.rawBody para que cada handler valide la firma de su proveedor.
    app.use('/api/webhooks', webhookRoutes);

    app.use('/api/users', authMiddleware, tenantContextMiddleware, requireOwnerRole, userRoutes);
    app.use('/api/admin', authMiddleware, tenantContextMiddleware, requireOwnerRole, userScopedClientMiddleware, adminRoutes);
    app.use('/api/tenant-vault', authMiddleware, tenantVaultRoutes);
    app.use('/api/organization', authMiddleware, tenantContextMiddleware, organizationRoutes);

    // Puesta en marcha: qué le falta conectar a este cliente y cómo dejarlo
    // configurado para su sector sin tocar código.
    const onboardingRoutes = require('./routes/onboardingRoutes');
    app.use('/api/onboarding', authMiddleware, tenantContextMiddleware, onboardingRoutes);
    app.use('/api/org-invitations', authMiddleware, invitationRedeemRoutes);
    const agentReportsRoutes = require('./routes/agentReportsRoutes');
    const agentMemoryRoutes = require('./routes/agentMemoryRoutes');
    // Va antes de los routers de /api/agents: Express resuelve por orden de
    // registro, y los genéricos se quedarían con este path.
    const agentTelemetryRoutes = require('./routes/agentTelemetryRoutes');
    app.use('/api/agents/telemetry', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, agentTelemetryRoutes);
    app.use('/api/agents/reports', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, agentReportsRoutes);
    app.use('/api/agents/memory', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, agentMemoryRoutes);
    app.use('/api/agents', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, googleAgentRoutes);
    app.use('/api/agents', authMiddleware, tenantContextMiddleware, agentRoutes);
    app.use('/api/google-agents', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, googleAgentRoutes);

    // Legacy un-prefixed alias routes for backward compatibility
    app.use('/api/status', authMiddleware, tenantContextMiddleware, agentRoutes);
    app.use('/api/run-evening-summary', authMiddleware, tenantContextMiddleware, agentRoutes);
    app.use('/api/stop-evening-summary', authMiddleware, tenantContextMiddleware, agentRoutes);
    app.use('/api/precall-schedule-status', authMiddleware, tenantContextMiddleware, agentRoutes);
    const internalAgentRoutes = require('./routes/internalAgentRoutes');

    // Internal background processes endpoints (authenticated via x-internal-token header)
    app.use('/api/internal', internalAgentRoutes);

    app.use('/api/nango', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, nangoRoutes);
    app.use('/api/evolution', authMiddleware, tenantContextMiddleware, evolutionRoutes);
    const billingRoutes = require('./routes/billingRoutes');
    const publicProposalRoutes = require('./routes/publicProposalRoutes');
    const publicInvitationRoutes = require('./routes/publicInvitationRoutes');

    const { router: publicWaitlistRoutes } = require('./routes/publicWaitlistRoutes');

    app.use('/api/public/invitations', publicInvitationRoutes);
    app.use('/api/public/waitlist', publicWaitlistRoutes);
    // El orden importa y es deliberado: quien canjea una invitación todavía no
    // tiene cuenta, así que /validate/:code y /use/:code las sirve el router
    // público. El autenticado va después y sólo aporta /generate — sus copias de
    // esas dos rutas se eliminaron por inalcanzables.
    app.use('/api/invitations', publicInvitationRoutes);
    app.use('/api/invitations', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, invitationRoutes);

    // Exportar y restaurar todos los datos de una organización sólo puede hacerlo
    // su propietario: requireOwnerRole no es opcional aquí.
    app.use('/api/backup', authMiddleware, tenantContextMiddleware, requireOwnerRole, backupRoutes);

    app.use('/api/revenue', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, revenueRoutes);
    app.use('/api/integrations', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, connectionStatusRoutes);
    app.use('/api/billing', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, billingRoutes);
    app.use('/api/public/proposals', publicProposalRoutes);

    // Multi-tenant operational domain routes protected by auth & tenant context
    app.use('/api/operations', authMiddleware, tenantContextMiddleware, (req, res) => {
        res.json({ message: 'Operations Hub active', tenant: req.tenant });
    });
    app.use('/api/growth', authMiddleware, tenantContextMiddleware, (req, res) => {
        res.json({ message: 'Growth Hub active', tenant: req.tenant });
    });
    app.use('/api/communication', authMiddleware, tenantContextMiddleware, (req, res) => {
        res.json({ message: 'Communication Hub active', tenant: req.tenant });
    });
    const intelligenceRoutes = require('./routes/intelligenceRoutes');
    app.use('/api/intelligence', authMiddleware, tenantContextMiddleware, userScopedClientMiddleware, intelligenceRoutes);

    setupProxyRoutes(app, SUBSYSTEMS);

    const helperApp = express();
    helperApp.get('/oauth2callback', (req, res) => {
        const code = req.query.code;
        console.log(`[Suite 3333 Helper] Intercepted Google OAuth callback. Redirecting to Email Organizer (port 4004)...`);
        res.redirect(`http://localhost:4004/oauth2callback?code=${code}`);
    });
    // helperApp.listen(3333, () => {
    //     console.log(`[Suite] Google OAuth Callback Bridge active on http://localhost:3333`);
    // });

    app.all('/svc/*', (req, res) => {
        res.status(503).send(`
            <div style="font-family: system-ui, sans-serif; padding: 2rem; color: #e2e8f0; background: #0f172a; height: 100vh; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5; margin-bottom: 1rem;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="9" x2="15" y1="9" y2="15"></line><line x1="15" x2="9" y1="9" y2="15"></line></svg>
                <h2 style="margin-bottom: 0.5rem; font-weight: 500;">Headless Agent / Microservice Offline</h2>
                <p style="opacity: 0.7; max-width: 400px; font-size: 0.9rem;">This agent operates in the background and does not expose a visual web interface, or its UI service is currently offline.</p>
            </div>
        `);
    });

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../../frontend/public', 'index.html'));
    });

    return app;
}

module.exports = { createApp };
