/**
 * requireOwnerRole.js
 * Middleware enforcing Owner/Admin role permissions for sensitive management routes
 */

function requireOwnerRole(req, res, next) {
  if (!req.tenant) {
    return res.status(401).json({ error: 'Tenant context required' });
  }

  const role = req.tenant.role || req.user?.role;
  if (role !== 'owner' && role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Owner or Admin role required' });
  }

  next();
}

module.exports = { requireOwnerRole };
