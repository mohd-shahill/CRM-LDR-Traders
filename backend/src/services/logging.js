import db from '../config/db.js';
import {
  sendNotificationToUser,
  broadcastLeadUpdate,
  broadcastUserUpdate,
  broadcastAuditLogged
} from './socket.js';

export const logAction = async (userId, action, entityType, entityId, previousState = null, newState = null, notes = '') => {
  try {
    const result = await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, previous_state, new_state, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
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

    if (result.rows.length > 0) {
      const insertedLog = result.rows[0];
      const mappedLog = {
        id: insertedLog.id.toString(),
        userId: insertedLog.user_id,
        action: insertedLog.action,
        entityType: insertedLog.entity_type,
        entityId: insertedLog.entity_id,
        oldVal: insertedLog.previous_state ? (typeof insertedLog.previous_state === 'object' ? JSON.stringify(insertedLog.previous_state) : insertedLog.previous_state) : null,
        newVal: insertedLog.new_state ? (typeof insertedLog.new_state === 'object' ? JSON.stringify(insertedLog.new_state) : insertedLog.new_state) : (insertedLog.notes || null),
        timestamp: insertedLog.created_at.toISOString()
      };

      // Broadcast audit log
      broadcastAuditLogged(mappedLog);

      // Perform real-time entity updates
      if (entityType === 'leads') {
        broadcastLeadUpdate(entityId, newState);
      } else if (entityType === 'users') {
        broadcastUserUpdate(entityId, newState);
      }
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

export const addNotification = async (userId, leadId, message) => {
  try {
    const result = await db.query(
      `INSERT INTO notifications (user_id, lead_id, message, is_read)
       VALUES ($1, $2, $3, FALSE)
       RETURNING *`,
      [userId, leadId, message]
    );

    if (result.rows.length > 0) {
      sendNotificationToUser(userId, result.rows[0]);
    }
  } catch (error) {
    console.error('Notification insertion error:', error);
  }
};
