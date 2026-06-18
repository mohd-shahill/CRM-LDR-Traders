import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const authenticateToken = async (req, res, next) => {
  const token = req.cookies.rvsf_token;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_12345');
    
    // Fetch fresh user state from the database to check if active and verify actual permissions
    const result = await db.query(
      'SELECT id, name, email, phone, permissions, is_super_admin, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User session invalid. User not found.' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.clearCookie('rvsf_token');
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }
};

export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Super Admin overrides all permission checks
    if (req.user.is_super_admin || req.user.permissions.includes('super_admin')) {
      return next();
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }

    next();
  };
};
