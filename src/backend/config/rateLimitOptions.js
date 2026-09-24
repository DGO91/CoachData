'use strict';

const rateLimit = require('express-rate-limit');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS        = 60 * 60 * 1000;

function skipHealthChecks(req) {
    const p = req.path;
    return p === '/health' || p === '/ready' || p === '/ping';
}

const globalLimitMessage = Object.freeze({ error: 'Too many requests from this IP, please try again after 15 minutes' });
const authLimitMessage   = Object.freeze({ error: 'Too many login attempts from this IP, please try again after an hour' });

const globalLimiter = rateLimit({
    windowMs:        FIFTEEN_MINUTES_MS,
    max:             1000,
    message:         globalLimitMessage,
    standardHeaders: true,
    legacyHeaders:   false,
    skip:            skipHealthChecks,
});

const authLimiter = rateLimit({
    windowMs:        ONE_HOUR_MS,
    max:             20,
    message:         authLimitMessage,
    standardHeaders: true,
    legacyHeaders:   false,
});

module.exports = Object.freeze({ globalLimiter, authLimiter });
