import db from '../config/db.js';
import { logAction } from '../services/logging.js';

export const getInspectorSchedules = async (req, res) => {
  try {
    // Return leads that require onsite inspection or logs
    const result = await db.query(
      `SELECT l.id, l.owner_name, l.phone, l.vehicle_number, l.make, l.model, l.year, l.status,
              oi.status as inspection_status, oi.inspected_at, oi.notes
       FROM leads l
       LEFT JOIN onsite_inspections oi ON l.id = oi.lead_id
       ORDER BY l.created_at DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Get onsite schedules error:', error);
    return res.status(500).json({ error: 'Server error retrieving onsite schedules.' });
  }
};

export const logInspection = async (req, res) => {
  const { leadId, status, notes } = req.body; // status: 'inspected' or 'skipped'

  if (!leadId || !status) {
    return res.status(400).json({ error: 'Please provide leadId and status.' });
  }

  try {
    // Check if inspection record already exists
    const checkInspection = await db.query('SELECT id FROM onsite_inspections WHERE lead_id = $1', [leadId]);

    let result;
    if (checkInspection.rows.length > 0) {
      result = await db.query(
        `UPDATE onsite_inspections
         SET inspector_id = $1, status = $2, notes = $3, inspected_at = CURRENT_TIMESTAMP
         WHERE lead_id = $4
         RETURNING *`,
        [req.user.id, status, notes || '', leadId]
      );
    } else {
      result = await db.query(
        `INSERT INTO onsite_inspections (lead_id, inspector_id, status, notes, inspected_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING *`,
        [leadId, req.user.id, status, notes || '']
      );
    }

    await logAction(
      req.user.id,
      `ONSITE_${status.toUpperCase()}`,
      'onsite_inspections',
      result.rows[0].id.toString(),
      null,
      result.rows[0],
      `Lead ${leadId} inspected/skipped by inspector ${req.user.name}`
    );

    return res.json({ message: 'Inspection log updated successfully.', inspection: result.rows[0] });
  } catch (error) {
    console.error('Log inspection error:', error);
    return res.status(500).json({ error: 'Server error saving inspection log.' });
  }
};
