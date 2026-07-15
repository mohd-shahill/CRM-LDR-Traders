import db from '../config/db.js';

export const getNotifications = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, user_id AS "userId", lead_id AS "leadId", message, is_read AS "isRead", created_at AS "createdAt" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Server error retrieving notifications.' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [req.user.id]
    );
    return res.json({ message: 'Notifications marked as read.' });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return res.status(500).json({ error: 'Server error updating notifications.' });
  }
};

export const createNotification = async (req, res) => {
  const { userId, leadId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ error: 'User ID and message are required.' });
  }
  try {
    const result = await db.query(
      'INSERT INTO notifications (user_id, lead_id, message, is_read) VALUES ($1, $2, $3, FALSE) RETURNING *',
      [userId, leadId, message]
    );
    const inserted = result.rows[0];
    return res.json({
      message: 'Notification created successfully.',
      notification: {
        id: inserted.id.toString(),
        userId: inserted.user_id,
        leadId: inserted.lead_id,
        message: inserted.message,
        isRead: inserted.is_read,
        createdAt: inserted.created_at
      }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    return res.status(500).json({ error: 'Server error creating notification.' });
  }
};
