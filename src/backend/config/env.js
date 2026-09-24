'use strict';

require('dotenv').config();

const { getInternalSecret } = require('../shared/internalSecret');

const REQUIRED_VARS = ['INTERNAL_SECRET', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];

function validateEnv() {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(
            `[Config] Missing required environment variables: ${missing.join(', ')}`
        );
    }
}

if (process.env.NODE_ENV === 'production') {
    validateEnv();
}

const config = Object.freeze({
    PORT:            parseInt(process.env.PORT, 10) || 4000,
    NODE_ENV:        process.env.NODE_ENV || 'development',
    IS_DOCKER:       process.env.DOCKER_ENV === 'true',
    // Obligatorio en cualquier entorno, no solo en producción: ver shared/internalSecret.js.
    INTERNAL_SECRET: getInternalSecret(),
    SUPABASE_URL:    process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    CERTBOT_PATH:        '/var/www/certbot/.well-known/acme-challenge',
    FRONTEND_PUBLIC_PATH: '../frontend/public',
    OAUTH_BRIDGE_PORT:   3333,
    EMAIL_AGENT_PORT:    4004,
});

module.exports = config;
