'use strict';

// Mounted with authMiddleware only (no tenantContextMiddleware) — redeeming an
// invite is how a user JOINS an organization, so they can't be required to
// already have tenant context for it.

const express = require('express');
const { redeemInvitation } = require('../../../application/organization/organizationInvitationsUseCase');

const router = express.Router();

router.post('/redeem', async (req, res) => {
    const code = (req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'code is required' });
    try {
        const result = await redeemInvitation(code, req.user.id);
        res.json(result);
    } catch (err) {
        console.error('[InvitationRedeem] error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
