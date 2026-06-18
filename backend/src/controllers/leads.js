import db from '../config/db.js';
import { logAction, addNotification } from '../services/logging.js';

export const getLeads = async (req, res) => {
  const { status, assigned_to, page = 1, limit = 10, q } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let queryStr = 'SELECT * FROM leads WHERE 1=1';
    const params = [];
    let paramCounter = 1;

    if (status && status !== 'all') {
      queryStr += ` AND status = $${paramCounter++}`;
      params.push(status);
    }

    if (assigned_to) {
      queryStr += ` AND assigned_to = $${paramCounter++}`;
      params.push(assigned_to);
    }

    if (q) {
      queryStr += ` AND (owner_name ILIKE $${paramCounter} OR vehicle_number ILIKE $${paramCounter} OR make ILIKE $${paramCounter} OR model ILIKE $${paramCounter})`;
      params.push(`%${q}%`);
      paramCounter++;
    }

    // Get total count for pagination
    const countResult = await db.query(
      queryStr.replace('SELECT * FROM leads', 'SELECT COUNT(*) FROM leads'),
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    queryStr += ` ORDER BY created_at DESC LIMIT $${paramCounter++} OFFSET $${paramCounter}`;
    params.push(parseInt(limit), offset);

    const result = await db.query(queryStr, params);

    return res.json({
      leads: result.rows,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get leads error:', error);
    return res.status(500).json({ error: 'Server error retrieving leads.' });
  }
};

export const getLeadById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get lead detail error:', error);
    return res.status(500).json({ error: 'Server error retrieving lead details.' });
  }
};

export const createLead = async (req, res) => {
  const {
    ownerName,
    phone,
    altPhone,
    email,
    address,
    vehicleNumber,
    make,
    model,
    year,
    colour,
    fuelType,
    kmsDriven,
    expectedPrice,
    wantsNewCar,
  } = req.body;

  if (!ownerName || !phone || !vehicleNumber) {
    return res.status(400).json({ error: 'Owner name, phone number, and vehicle registration are required.' });
  }

  const normalizedReg = vehicleNumber.replace(/\s+/g, '').toUpperCase();

  try {
    // Check duplicates
    const duplicateCheck = await db.query(
      "SELECT id FROM leads WHERE REPLACE(vehicle_number, ' ', '') = $1 AND status != 'scrapped'",
      [normalizedReg]
    );

    if (duplicateCheck.rows.length > 0) {
      await logAction(
        req.user?.id || 'system',
        'LEAD_AUTO_REJECTED',
        'leads',
        null,
        null,
        { vehicleNumber: normalizedReg },
        `Duplicate registration: ${normalizedReg}`
      );
      return res.status(400).json({ error: `Vehicle ${normalizedReg} is already registered.` });
    }

    const id = 'lead-' + Math.floor(100000 + Math.random() * 900000);
    const status = 'new';
    const assignedAgentId = null;

    const insertResult = await db.query(
      `INSERT INTO leads (
        id, owner_name, phone, alt_phone, email, address, vehicle_number, 
        make, model, year, colour, fuel_type, kms_driven, expected_price, 
        wants_new_car, status, assigned_to, submitted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        id,
        ownerName,
        phone,
        altPhone || '',
        email || '',
        address || '',
        normalizedReg,
        make || '',
        model || '',
        year ? parseInt(year) : null,
        colour || '',
        fuelType || '',
        kmsDriven ? parseInt(kmsDriven) : null,
        expectedPrice ? parseInt(expectedPrice) : null,
        wantsNewCar === true,
        status,
        assignedAgentId,
        req.user?.id || null,
      ]
    );

    const newLead = insertResult.rows[0];

    // Log action & notify
    await logAction(req.user?.id || 'system', 'LEAD_CREATED', 'leads', id, null, newLead);

    // Notify all L1 agents
    const agents = await db.query("SELECT id FROM users WHERE 'l1' = ANY(permissions) AND is_active = TRUE");
    for (const agent of agents.rows) {
      await addNotification(agent.id, id, `New unassigned vehicle lead ${normalizedReg} is available.`);
    }

    return res.status(201).json({ message: 'Lead created successfully.', lead: newLead });
  } catch (error) {
    console.error('Create lead error:', error);
    return res.status(500).json({ error: 'Server error creating lead.' });
  }
};

export const assignLead = async (req, res) => {
  const { id } = req.params;
  const { assignedTo } = req.body;

  try {
    const leadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const previousLead = leadResult.rows[0];

    const updatedResult = await db.query(
      `UPDATE leads 
       SET assigned_to = $1, status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END
       WHERE id = $2
       RETURNING *`,
      [assignedTo, id]
    );

    const updatedLead = updatedResult.rows[0];

    await logAction(req.user.id, 'LEAD_ASSIGNED', 'leads', id, previousLead, updatedLead);
    await addNotification(assignedTo, id, `Lead ${updatedLead.vehicle_number} has been assigned to you.`);

    return res.json({ message: 'Lead assigned successfully.', lead: updatedLead });
  } catch (error) {
    console.error('Assign lead error:', error);
    return res.status(500).json({ error: 'Server error assigning lead.' });
  }
};

export const updateL1Details = async (req, res) => {
  const { id } = req.params;
  const l1Details = req.body;

  try {
    const leadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const previousLead = leadResult.rows[0];

    // Extract root-level fields if provided in l1Details, otherwise keep existing values
    const ownerName = l1Details.ownerName || previousLead.owner_name;
    const phone = l1Details.ownerPhone || previousLead.phone;
    const email = l1Details.ownerEmail || previousLead.email;
    const address = l1Details.ownerAddress || previousLead.address;
    const vehicleNumber = l1Details.vehicleRegNumber ? l1Details.vehicleRegNumber.replace(/\s+/g, '').toUpperCase() : previousLead.vehicle_number;
    const make = l1Details.make || previousLead.make;
    const model = l1Details.model || previousLead.model;
    const year = l1Details.year ? parseInt(l1Details.year) : previousLead.year;
    const colour = l1Details.colour || previousLead.colour;
    const fuelType = l1Details.fuelType || previousLead.fuel_type;
    const kmsDriven = l1Details.kmsDriven !== undefined ? parseInt(l1Details.kmsDriven) : previousLead.kms_driven;
    const bodyCondition = l1Details.bodyCondition !== undefined ? parseInt(l1Details.bodyCondition) : previousLead.body_condition;
    const expectedPrice = l1Details.expectedPrice !== undefined ? parseInt(l1Details.expectedPrice) : previousLead.expected_price;
    const submittedBy = req.user?.id || previousLead.submitted_by;

    // Convert missingParts from checkboxes to optionsPresent array for database format compat
    const accessoriesList = [
      "Battery",
      "AC",
      "Music System",
      "Airbags",
      "Sunroof",
      "Spare Tyre",
      "Jack & Tools",
      "Central Locking",
    ];
    const missing = l1Details.missingParts || [];
    const optionsPresent = accessoriesList.filter(x => !missing.includes(x));

    const updatedResult = await db.query(
      `UPDATE leads 
       SET l1_details = $1, status = 'pending_approval',
           owner_name = $2, phone = $3, email = $4, address = $5, vehicle_number = $6,
           make = $7, model = $8, year = $9, colour = $10, fuel_type = $11, kms_driven = $12,
           body_condition = $13, expected_price = $14, options_present = $15, submitted_by = $16
       WHERE id = $17
       RETURNING *`,
      [
        JSON.stringify(l1Details),
        ownerName,
        phone,
        email,
        address,
        vehicleNumber,
        make,
        model,
        year,
        colour,
        fuelType,
        kmsDriven,
        bodyCondition,
        expectedPrice,
        optionsPresent,
        submittedBy,
        id
      ]
    );

    const updatedLead = updatedResult.rows[0];

    await logAction(req.user.id, 'L1_SUBMITTED', 'leads', id, previousLead, updatedLead);

    // Notify L2 managers
    const managers = await db.query("SELECT id FROM users WHERE 'l2' = ANY(permissions) AND is_active = TRUE");
    for (const manager of managers.rows) {
      await addNotification(manager.id, id, `Lead ${updatedLead.vehicle_number} is pending approval.`);
    }

    return res.json({ message: 'L1 details updated. Lead is pending L2 approval.', lead: updatedLead });
  } catch (error) {
    console.error('Update L1 details error:', error);
    return res.status(500).json({ error: 'Server error saving L1 details.' });
  }
};

export const updateL2Details = async (req, res) => {
  const { id } = req.params;
  const { l2Details, status } = req.body; // status can be 'approved', 'rejected', or 'info_needed'

  try {
    const leadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const previousLead = leadResult.rows[0];

    const updatedResult = await db.query(
      `UPDATE leads 
       SET l2_details = $1, status = $2
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(l2Details), status, id]
    );

    const updatedLead = updatedResult.rows[0];

    await logAction(req.user.id, `L2_${status.toUpperCase()}`, 'leads', id, previousLead, updatedLead);

    // Notify assignee
    if (updatedLead.assigned_to) {
      await addNotification(
        updatedLead.assigned_to,
        id,
        `Your valuation for ${updatedLead.vehicle_number} has been marked as ${status}.`
      );
    }

    return res.json({ message: `Lead marked as ${status}.`, lead: updatedLead });
  } catch (error) {
    console.error('Update L2 details error:', error);
    return res.status(500).json({ error: 'Server error saving L2 details.' });
  }
};

export const updateL3Details = async (req, res) => {
  const { id } = req.params;
  const { l3Details, status } = req.body; // status can be 'payment_initiated' or 'payment_confirmed'

  try {
    const leadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const previousLead = leadResult.rows[0];

    const updatedResult = await db.query(
      `UPDATE leads 
       SET l3_details = $1, status = $2
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(l3Details), status, id]
    );

    const updatedLead = updatedResult.rows[0];

    await logAction(req.user.id, `L3_${status.toUpperCase()}`, 'leads', id, previousLead, updatedLead);

    return res.json({ message: `L3 Details updated. Status is ${status}.`, lead: updatedLead });
  } catch (error) {
    console.error('Update L3 details error:', error);
    return res.status(500).json({ error: 'Server error saving L3 details.' });
  }
};

export const updateL4Details = async (req, res) => {
  const { id } = req.params;
  const { l4Details, status } = req.body; // status can be 'picked_up' or 'scrapped'

  try {
    const leadResult = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const previousLead = leadResult.rows[0];

    const updatedResult = await db.query(
      `UPDATE leads 
       SET l4_details = $1, status = $2
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(l4Details), status, id]
    );

    const updatedLead = updatedResult.rows[0];

    await logAction(req.user.id, `L4_${status.toUpperCase()}`, 'leads', id, previousLead, updatedLead);

    return res.json({ message: `L4 details updated. Lead status is ${status}.`, lead: updatedLead });
  } catch (error) {
    console.error('Update L4 details error:', error);
    return res.status(500).json({ error: 'Server error saving L4 details.' });
  }
};
