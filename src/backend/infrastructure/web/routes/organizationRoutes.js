'use strict';

const express = require('express');
const {
    getOrganizationProfile,
    updateOrganizationProfile,
    getPipelineStages,
    updatePipelineStages,
    exportOrganizationWorkspace,
} = require('../../../application/organization/organizationProfileUseCase');
const { listOrganizationMembers } = require('../../../application/organization/organizationMembersUseCase');
const { getSurfaces, updateSurfaces } = require('../../../application/organization/organizationSurfacesUseCase');
const {
    listPendingInvitations,
    createInvitation,
    revokeInvitation,
    redeemInvitation,
} = require('../../../application/organization/organizationInvitationsUseCase');

const router = express.Router();

router.get('/me', async (req, res) => {
    try {
        const profile = await getOrganizationProfile(req.tenant.id);
        res.json(profile);
    } catch (err) {
        console.error('[Organization] GET /me error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/me', async (req, res) => {
    if (!['owner', 'admin'].includes(req.tenant.role)) {
        return res.status(403).json({ error: 'Only owners or admins can edit the organization profile' });
    }
    try {
        const { name, industry, timezone, currency, language } = req.body || {};
        const profile = await updateOrganizationProfile(req.tenant.id, { name, industry, timezone, currency, language });
        res.json(profile);
    } catch (err) {
        console.error('[Organization] PUT /me error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/members', async (req, res) => {
    try {
        const members = await listOrganizationMembers(req.tenant.id);
        res.json(members);
    } catch (err) {
        console.error('[Organization] GET /members error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/pipeline-stages', async (req, res) => {
    try {
        const stages = await getPipelineStages(req.tenant.id);
        res.json({ stages });
    } catch (err) {
        console.error('[Organization] GET /pipeline-stages error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/pipeline-stages', async (req, res) => {
    if (!['owner', 'admin'].includes(req.tenant.role)) {
        return res.status(403).json({ error: 'Only owners or admins can edit pipeline stages' });
    }
    try {
        const stages = await updatePipelineStages(req.tenant.id, req.body?.stages);
        res.json({ stages });
    } catch (err) {
        console.error('[Organization] PUT /pipeline-stages error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// Superficies activas: qué zonas del producto ve esta organización.
router.get('/surfaces', async (req, res) => {
    try {
        const surfaces = await getSurfaces(req.tenant.id);
        res.json({ surfaces });
    } catch (err) {
        console.error('[Organization] GET /surfaces error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/surfaces', async (req, res) => {
    if (!['owner', 'admin'].includes(req.tenant.role)) {
        return res.status(403).json({ error: 'Solo propietarios o administradores pueden cambiar las superficies activas' });
    }
    try {
        const surfaces = await updateSurfaces(req.tenant.id, req.body?.surfaces);
        res.json({ surfaces });
    } catch (err) {
        console.error('[Organization] PUT /surfaces error:', err.message);
        res.status(err.statusCode || 400).json({ error: err.message });
    }
});

router.get('/export', async (req, res) => {
    try {
        const workspace = await exportOrganizationWorkspace(req.tenant.id);
        res.setHeader('Content-Disposition', `attachment; filename="coachdata-export-${req.tenant.id}.json"`);
        res.json(workspace);
    } catch (err) {
        console.error('[Organization] GET /export error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/invitations', async (req, res) => {
    if (!['owner', 'admin'].includes(req.tenant.role)) {
        return res.status(403).json({ error: 'Only owners or admins can view invitations' });
    }
    try {
        const invitations = await listPendingInvitations(req.tenant.id);
        res.json(invitations);
    } catch (err) {
        console.error('[Organization] GET /invitations error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/invitations', async (req, res) => {
    if (!['owner', 'admin'].includes(req.tenant.role)) {
        return res.status(403).json({ error: 'Only owners or admins can create invitations' });
    }
    try {
        const invitation = await createInvitation(req.tenant.id, req.user.id, req.body?.role || 'member');
        res.json(invitation);
    } catch (err) {
        console.error('[Organization] POST /invitations error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/invitations/:id', async (req, res) => {
    if (!['owner', 'admin'].includes(req.tenant.role)) {
        return res.status(403).json({ error: 'Only owners or admins can revoke invitations' });
    }
    try {
        await revokeInvitation(req.tenant.id, req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('[Organization] DELETE /invitations error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
