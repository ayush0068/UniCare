const jwt = require('jsonwebtoken');
const Admin = require('../modal/Admin');

/**
 * Verifies the admin JWT and attaches req.admin
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return res.unauthorized('Missing admin token');
        }
        const token = header.slice(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'admin') {
            return res.unauthorized('Invalid token type');
        }

        const admin = await Admin.findById(decoded.id).select('-pass');
        if (!admin) return res.unauthorized('Admin not found');
        if (!admin.isActive) return res.forbidden('Admin account is deactivated');

        req.admin = admin;
        next();
    } catch (err) {
        return res.unauthorized('Invalid or expired admin token');
    }
};

/**
 * Requires super_admin role
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.admin || req.admin.role !== 'super_admin') {
        return res.forbidden('Super admin access required');
    }
    next();
};

/**
 * Requires a specific permission key
 * Usage: requirePermission('doctorManagement')
 */
const requirePermission = (permission) => (req, res, next) => {
    if (!req.admin) return res.unauthorized('Not authenticated');
    if (req.admin.role === 'super_admin') return next(); // super_admin bypasses all
    if (!req.admin.permissions || !req.admin.permissions[permission]) {
        return res.forbidden(`Permission denied: ${permission}`);
    }
    next();
};

module.exports = { authenticateAdmin, requireSuperAdmin, requirePermission };