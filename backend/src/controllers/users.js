import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import { logAction } from '../services/logging.js';

export const getUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, phone, permissions, is_super_admin, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ error: 'Server error retrieving users.' });
  }
};

export const createUser = async (req, res) => {
  const { name, email, phone, password, permissions } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'Please fill out all credentials.' });
  }

  try {
    // Check if user already exists
    const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const id = 'usr-' + Math.floor(1000 + Math.random() * 9000);
    const passwordHash = await bcrypt.hash(password, 10);
    const userPermissions = permissions || [];

    const result = await db.query(
      `INSERT INTO users (id, name, email, phone, password_hash, permissions, is_super_admin, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE)
       RETURNING id, name, email, phone, permissions, is_super_admin, is_active`,
      [id, name, email, phone, passwordHash, userPermissions]
    );

    const newUser = result.rows[0];
    await logAction(req.user?.id || 'system', 'USER_ENROLLED', 'users', id, null, newUser);

    return res.status(201).json({ message: 'User enrolled successfully.', user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Server error enrolling user.' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, permissions, is_active, password } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Please fill out name, email, and phone.' });
  }

  try {
    // Fetch previous user state for audit diff logging
    const checkUser = await db.query(
      'SELECT id, name, email, phone, permissions, is_super_admin, is_active FROM users WHERE id = $1',
      [id]
    );
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const previousUser = checkUser.rows[0];

    let query = `
      UPDATE users 
      SET name = $1, email = $2, phone = $3, permissions = $4, is_active = $5
      WHERE id = $6
      RETURNING id, name, email, phone, permissions, is_super_admin, is_active
    `;
    let params = [name, email, phone, permissions || [], is_active !== false, id];

    // Optional password update
    if (password && password.trim() !== '') {
      const passwordHash = await bcrypt.hash(password, 10);
      query = `
        UPDATE users 
        SET name = $1, email = $2, phone = $3, permissions = $4, is_active = $5, password_hash = $6
        WHERE id = $7
        RETURNING id, name, email, phone, permissions, is_super_admin, is_active
      `;
      params = [name, email, phone, permissions || [], is_active !== false, passwordHash, id];
    }

    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updatedUser = result.rows[0];
    await logAction(req.user?.id || 'system', 'USER_UPDATED', 'users', id, previousUser, updatedUser);

    return res.json({ message: 'User updated successfully.', user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Server error updating user.' });
  }
};
