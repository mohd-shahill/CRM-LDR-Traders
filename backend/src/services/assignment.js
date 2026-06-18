import db from '../config/db.js';

export const getNextL1Agent = async () => {
  try {
    // 1. Fetch active L1 coordinators ordered by ID
    const agentsResult = await db.query(
      "SELECT id FROM users WHERE 'l1' = ANY(permissions) AND is_active = TRUE ORDER BY id ASC"
    );
    const agents = agentsResult.rows;

    if (agents.length === 0) {
      return null;
    }

    // 2. Find the last assigned lead assignee
    const lastLeadResult = await db.query(
      "SELECT assigned_to FROM leads WHERE assigned_to IS NOT NULL ORDER BY created_at DESC LIMIT 1"
    );

    if (lastLeadResult.rows.length === 0) {
      return agents[0].id;
    }

    const lastAssignedId = lastLeadResult.rows[0].assigned_to;
    const lastIndex = agents.findIndex((a) => a.id === lastAssignedId);

    // If last assignee is no longer active or not found, start from 0
    if (lastIndex === -1) {
      return agents[0].id;
    }

    // Pick next agent in circular order
    const nextIndex = (lastIndex + 1) % agents.length;
    return agents[nextIndex].id;
  } catch (error) {
    console.error('Error calculating next L1 agent:', error);
    return null;
  }
};
