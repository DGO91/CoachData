'use strict';

const { NODE_ENV } = require('./env');

const IS_PRODUCTION = NODE_ENV === 'production';

const ALLOWED_ORIGINS_SET = new Set(
    (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
);

const corsRejectionError = new Error('CORS: origin not allowed');
corsRejectionError.status = 403;

function originPolicy(origin, callback) {
    if (!IS_PRODUCTION) return callback(null, true);
    if (!origin || ALLOWED_ORIGINS_SET.has(origin)) return callback(null, true);
    callback(corsRejectionError);
}

const corsOptions = Object.freeze({
    origin: originPolicy,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-internal-token',
        'x-tenant-id',
    ],
    credentials: true,
});

module.exports = corsOptions;
