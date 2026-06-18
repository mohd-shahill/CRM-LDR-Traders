import db from '../config/db.js';
import { logAction } from '../services/logging.js';

export const getAuditLogs = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, user_id, action, entity_type, entity_id, previous_state, new_state, notes, created_at FROM audit_logs ORDER BY created_at DESC'
    );
    
    // Map backend keys to match frontend's expected properties (userId, entityType, entityId, oldVal, newVal, timestamp)
    const logs = result.rows.map(row => ({
      id: row.id.toString(),
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      oldVal: row.previous_state ? (typeof row.previous_state === 'object' ? JSON.stringify(row.previous_state) : row.previous_state) : null,
      newVal: row.new_state ? (typeof row.new_state === 'object' ? JSON.stringify(row.new_state) : row.new_state) : (row.notes || null),
      timestamp: row.created_at.toISOString()
    }));

    return res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ error: 'Server error retrieving audit logs.' });
  }
};

export const createAuditLog = async (req, res) => {
  try {
    const { userId, action, entityType, entityId, oldVal, newVal, notes } = req.body;
    
    let parsedOld = null;
    let parsedNew = null;

    if (oldVal) {
      try {
        parsedOld = typeof oldVal === 'string' ? JSON.parse(oldVal) : oldVal;
      } catch (e) {
        parsedOld = { value: oldVal };
      }
    }

    if (newVal) {
      try {
        parsedNew = typeof newVal === 'string' ? JSON.parse(newVal) : newVal;
      } catch (e) {
        parsedNew = { value: newVal };
      }
    }

    await logAction(
      userId || req.user?.id || 'system',
      action,
      entityType,
      entityId,
      parsedOld,
      parsedNew,
      notes || ''
    );

    return res.status(201).json({ message: 'Audit log logged successfully' });
  } catch (error) {
    console.error('Create audit log error:', error);
    return res.status(500).json({ error: 'Server error saving audit log.' });
  }
};
