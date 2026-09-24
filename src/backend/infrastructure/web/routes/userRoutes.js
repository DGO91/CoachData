const express = require('express');
const { 
    registerUser, 
    getAllUsers, 
    deleteUser, 
    getCredentialsAudit, 
    getLocalUserProfile 
} = require('../../../application/auth/userUseCase');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { name, email } = req.body || {};
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    try {
        const user = await registerUser(name, email);
        res.status(201).json({ success: true, user });
    } catch (err) {
        console.error('[Suite] Registration error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (err) {
        console.error('[Suite] Error fetching users:', err);
        res.status(500).json({ error: err.message });
    }
});

// Legacy backward compatibility alias for /api/users/users
router.get('/users', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (err) {
        console.error('[Suite] Error fetching users:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/auditor/credentials-audit', async (req, res) => {
    try {
        const users = await getCredentialsAudit();
        if (!users || users.length === 0) {
            return res.json({ users: [], message: 'No audit data available.' });
        }
        res.json({ users });
    } catch (err) {
        console.error('[Suite] Credentials audit error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await deleteUser(req.params.id);
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        console.error('[Suite] Delete user error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Legacy backward compatibility alias for /api/users/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        await deleteUser(req.params.id);
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        console.error('[Suite] Delete user error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/user-profile', (req, res) => {
    res.json(getLocalUserProfile());
});

// Las rutas /admin/users viven ahora en routes/adminRoutes.js (montado en /api/admin).

module.exports = router;
