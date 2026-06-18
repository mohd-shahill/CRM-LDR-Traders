import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email/phone and password.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1 OR phone = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email/phone or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account is deactivated.' });
    }

    // Role-based portal verification
    const { portal } = req.body;
    if (portal === 'admin') {
      const isAdmin = user.is_super_admin || user.permissions.includes('super_admin') || user.permissions.includes('l2') || user.permissions.includes('l3');
      if (!isAdmin) {
        return res.status(403).json({ error: 'Access Denied: Logins here are restricted to L2 / L3 administrative staff.' });
      }
    } else if (portal === 'employee') {
      const isEmployee = user.is_super_admin || user.permissions.includes('super_admin') || user.permissions.includes('l1') || user.permissions.includes('l4_picker') || user.permissions.includes('l4_scrapper');
      if (!isEmployee) {
        return res.status(403).json({ error: 'Access Denied: Logins here are restricted to L1 / L4 field employees.' });
      }
    } else if (portal === 'onsite') {
      const isOnsite = user.is_super_admin || user.permissions.includes('super_admin') || user.permissions.includes('onsite_inspect');
      if (!isOnsite) {
        return res.status(403).json({ error: 'Access Denied: Logins here are restricted to onsite yard inspectors.' });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'super_secret_key_12345',
      { expiresIn: '24h' }
    );

    // Set cookie options
    const activePortal = portal || 'employee';
    res.cookie(`rvsf_${activePortal}_token`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    const { password_hash, ...safeUser } = user;
    return res.json({ message: 'Login successful', user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
};

export const logout = (req, res) => {
  const portal = req.headers['x-portal'] || 'employee';
  res.clearCookie(`rvsf_${portal}_token`);
  return res.json({ message: 'Logged out successfully' });
};

export const getMe = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  return res.json({ user: req.user });
};
