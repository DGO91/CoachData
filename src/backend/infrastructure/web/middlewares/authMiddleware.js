const jwt = require('jsonwebtoken');
// Single source of truth for the internal-agent signing secret — agentOrchestrator.js
// and agentRoutes.js (which sign these tokens) import the same value, so a fallback
// mismatch between signer and verifier can't happen again.
const { INTERNAL_SECRET } = require('../../../config/env');

function verifyInternalToken(req, res, next) {
    const token = req.headers['x-internal-token'];
    if (!token) return res.status(401).json({ error: 'Missing internal token' });
    try {
        const decoded = jwt.verify(token, INTERNAL_SECRET);
        if (decoded.role !== 'internal-agent') throw new Error('Invalid role');
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid internal token' });
    }
}

function asyncAuthMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Se requiere token JWT de autenticación' });
    }

    const { getSupabaseClient } = require('../../database/supabaseClient');
    const supabase = getSupabaseClient();
    if (!supabase) {
        return res.status(500).json({ error: 'Internal Server Error', message: 'Supabase no inicializado' });
    }

    supabase.auth.getUser(token).then(({ data, error }) => {
        if (error || !data.user) {
            return res.status(403).json({ error: 'Forbidden', message: 'Token JWT inválido o expirado' });
        }
        req.user = data.user;
        next();
    }).catch(err => {
        return res.status(403).json({ error: 'Forbidden', message: 'Error validando token JWT' });
    });
}
const authMiddleware = asyncAuthMiddleware;

module.exports = {
    authMiddleware,
    verifyInternalToken
};
