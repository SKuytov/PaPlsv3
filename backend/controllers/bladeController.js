import { pool } from '../config/database.js';

// ============================================================
// BLADE TYPES CONTROLLERS
// ============================================================

export const getBladTypes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM blade_types ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching blade types:', error);
    res.status(500).json({ error: 'Failed to fetch blade types' });
  }
};

export const getBladeType = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM blade_types WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blade type not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching blade type:', error);
    res.status(500).json({ error: 'Failed to fetch blade type' });
  }
};

export const createBladeType = async (req, res) => {
  try {
    const { machine_type, blade_type_code, description } = req.body;

    // Validation
    if (!machine_type || !blade_type_code) {
      return res.status(400).json({ error: 'Missing required fields: machine_type, blade_type_code' });
    }

    const result = await pool.query(
      'INSERT INTO blade_types (machine_type, blade_type_code, description) VALUES ($1, $2, $3) RETURNING *',
      [machine_type, blade_type_code, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Blade type code already exists' });
    }
    console.error('Error creating blade type:', error);
    res.status(500).json({ error: 'Failed to create blade type' });
  }
};

export const updateBladeType = async (req, res) => {
  try {
    const { id } = req.params;
    const { machine_type, blade_type_code, description } = req.body;

    const result = await pool.query(
      'UPDATE blade_types SET machine_type = $1, blade_type_code = $2, description = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [machine_type, blade_type_code, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blade type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Blade type code already exists' });
    }
    console.error('Error updating blade type:', error);
    res.status(500).json({ error: 'Failed to update blade type' });
  }
};

export const deleteBladeType = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM blade_types WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blade type not found' });
    }

    res.json({ message: 'Blade type deleted successfully' });
  } catch (error) {
    console.error('Error deleting blade type:', error);
    res.status(500).json({ error: 'Failed to delete blade type' });
  }
};

// ============================================================
// BLADE CONTROLLERS
// ============================================================

export const getBlades = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT b.*, bt.machine_type, bt.blade_type_code FROM blades b JOIN blade_types bt ON b.blade_type_id = bt.id ORDER BY b.created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching blades:', error);
    res.status(500).json({ error: 'Failed to fetch blades' });
  }
};

export const getBlade = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT b.*, bt.machine_type, bt.blade_type_code FROM blades b JOIN blade_types bt ON b.blade_type_id = bt.id WHERE b.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blade not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching blade:', error);
    res.status(500).json({ error: 'Failed to fetch blade' });
  }
};

export const createBlade = async (req, res) => {
  try {
    const { blade_type_id, serial_number, purchase_date } = req.body;

    // Validation
    if (!blade_type_id || !serial_number) {
      return res.status(400).json({ error: 'Missing required fields: blade_type_id, serial_number' });
    }

    // Verify blade type exists
    const typeCheck = await pool.query('SELECT id FROM blade_types WHERE id = $1', [blade_type_id]);
    if (typeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Blade type not found' });
    }

    const result = await pool.query(
      'INSERT INTO blades (blade_type_id, serial_number, purchase_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [blade_type_id, serial_number, purchase_date, 'new']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Serial number already exists' });
    }
    console.error('Error creating blade:', error);
    res.status(500).json({ error: 'Failed to create blade' });
  }
};

export const updateBlade = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, usage_hours, notes } = req.body;

    // Validate status
    const validStatuses = ['new', 'active', 'sharpening', 'retired'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const result = await pool.query(
      'UPDATE blades SET status = COALESCE($1, status), usage_hours = COALESCE($2, usage_hours), notes = COALESCE($3, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [status, usage_hours, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blade not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating blade:', error);
    res.status(500).json({ error: 'Failed to update blade' });
  }
};

export const deleteBlade = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM blades WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blade not found' });
    }

    res.json({ message: 'Blade deleted successfully' });
  } catch (error) {
    console.error('Error deleting blade:', error);
    res.status(500).json({ error: 'Failed to delete blade' });
  }
};

export const searchBladeBySerial = async (req, res) => {
  try {
    const { serial } = req.params;
    const result = await pool.query(
      'SELECT b.*, bt.machine_type, bt.blade_type_code FROM blades b JOIN blade_types bt ON b.blade_type_id = bt.id WHERE b.serial_number ILIKE $1 ORDER BY b.created_at DESC',
      [`%${serial}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching blade:', error);
    res.status(500).json({ error: 'Failed to search blade' });
  }
};

// ============================================================
// USAGE LOG CONTROLLERS
// ============================================================

export const logUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { operation, hours_used, notes } = req.body;

    // Validation
    if (!operation || hours_used === undefined) {
      return res.status(400).json({ error: 'Missing required fields: operation, hours_used' });
    }

    // Verify blade exists
    const bladeCheck = await pool.query('SELECT id FROM blades WHERE id = $1', [id]);
    if (bladeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Blade not found' });
    }

    // Log usage
    const result = await pool.query(
      'INSERT INTO blade_usage_logs (blade_id, operation, hours_used, notes, logged_by_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, operation, hours_used, notes, req.user?.id]
    );

    // Update blade usage hours
    await pool.query(
      'UPDATE blades SET usage_hours = usage_hours + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hours_used, id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error logging usage:', error);
    res.status(500).json({ error: 'Failed to log usage' });
  }
};

export const getUsageLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM blade_usage_logs WHERE blade_id = $1 ORDER BY logged_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching usage logs:', error);
    res.status(500).json({ error: 'Failed to fetch usage logs' });
  }
};

// ============================================================
// SHARPENING CONTROLLERS
// ============================================================

export const recordSharpening = async (req, res) => {
  try {
    const { id } = req.params;
    const { sharpening_date, sharpening_method, cost, provider, notes } = req.body;

    // Validation
    if (!sharpening_date) {
      return res.status(400).json({ error: 'Missing required field: sharpening_date' });
    }

    // Verify blade exists
    const bladeCheck = await pool.query('SELECT id FROM blades WHERE id = $1', [id]);
    if (bladeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Blade not found' });
    }

    // Record sharpening
    const result = await pool.query(
      'INSERT INTO blade_sharpening (blade_id, sharpening_date, sharpening_method, cost, provider, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, sharpening_date, sharpening_method, cost, provider, notes]
    );

    // Update blade sharpening count and date
    await pool.query(
      'UPDATE blades SET sharpening_count = sharpening_count + 1, last_sharpened_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [sharpening_date, id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error recording sharpening:', error);
    res.status(500).json({ error: 'Failed to record sharpening' });
  }
};

export const getSharpeningHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM blade_sharpening WHERE blade_id = $1 ORDER BY sharpening_date DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sharpening history:', error);
    res.status(500).json({ error: 'Failed to fetch sharpening history' });
  }
};

// ============================================================
// ALERT CONTROLLERS
// ============================================================

export const getBladeAlerts = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM blade_alerts WHERE blade_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const resolveAlert = async (req, res) => {
  try {
    const { id, alertId } = req.params;

    const result = await pool.query(
      'UPDATE blade_alerts SET is_resolved = TRUE, resolved_at = CURRENT_TIMESTAMP WHERE id = $1 AND blade_id = $2 RETURNING *',
      [alertId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
};

// ============================================================
// STATISTICS CONTROLLERS
// ============================================================

export const getBladesStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_blades,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_blades,
        COUNT(CASE WHEN status = 'sharpening' THEN 1 END) as sharpening_blades,
        COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_blades,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_blades,
        ROUND(AVG(CAST(usage_hours AS FLOAT))::numeric, 2) as avg_usage_hours,
        ROUND(AVG(CAST(sharpening_count AS FLOAT))::numeric, 2) as avg_sharpening_count,
        MAX(usage_hours) as max_usage_hours,
        MAX(sharpening_count) as max_sharpening_count
      FROM blades
    `);
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error fetching blade stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
