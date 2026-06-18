import db from '../config/db.js';

export const logAction = async (userId, action, entityType, entityId, previousState = null, newState = null, notes = '') => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, previous_state, new_state, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || 'system',
        action,
        entityType,
        entityId,
        previousState ? JSON.stringify(previousState) : null,
        newState ? JSON.stringify(newState) : null,
        notes
      ]
    );
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

export const addNotification = async (userId, leadId, message) => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, lead_id, message, is_read)
       VALUES ($1, $2, $3, FALSE)`,
      [userId, leadId, message]
    );
  } catch (error) {
    console.error('Notification insertion error:', error);
  }
};
