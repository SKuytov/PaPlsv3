import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// BLADE TYPE ENDPOINTS
// ============================================================

// GET all blade types
router.get('/blade-types', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blade_types')
      .select('*')
      .order('machine_type', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching blade types:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET blade type by ID
router.get('/blade-types/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blade_types')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching blade type:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE new blade type
router.post('/blade-types', async (req, res) => {
  try {
    const { machine_type, blade_type_code, description, lifecycle_hours, sharpening_interval, max_sharpenings } = req.body;

    const { data, error } = await supabase
      .from('blade_types')
      .insert([
        {
          machine_type,
          blade_type_code,
          description,
          lifecycle_hours: lifecycle_hours || 500,
          sharpening_interval: sharpening_interval || 50,
          max_sharpenings: max_sharpenings || 10,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating blade type:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// BLADE ENDPOINTS
// ============================================================

// GET all blades
router.get('/blades', async (req, res) => {
  try {
    const { status, machine_id, search } = req.query;

    let query = supabase.from('blades').select(`
      *,
      blade_types:blade_type_id (*),
      machines:current_machine_id (*)
    `);

    if (status) {
      query = query.eq('status', status);
    }
    if (machine_id) {
      query = query.eq('current_machine_id', machine_id);
    }
    if (search) {
      query = query.ilike('serial_number', `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching blades:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET blade by serial number
router.get('/blades/search/:serial', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blades')
      .select(`
        *,
        blade_types:blade_type_id (*),
        machines:current_machine_id (*)
      `)
      .eq('serial_number', req.params.serial)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching blade:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET blade by ID
router.get('/blades/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blades')
      .select(`
        *,
        blade_types:blade_type_id (*),
        machines:current_machine_id (*)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching blade:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE new blade
router.post('/blades', async (req, res) => {
  try {
    const {
      blade_type_id,
      serial_number,
      current_machine_id,
      status = 'new',
      total_usage_hours = 0,
      total_sharpenings = 0,
    } = req.body;

    // Auto-generate serial if not provided
    let finalSerial = serial_number;
    if (!finalSerial) {
      const timestamp = Date.now();
      finalSerial = `BLADE-${timestamp}`;
    }

    const { data, error } = await supabase
      .from('blades')
      .insert([
        {
          blade_type_id,
          serial_number: finalSerial,
          current_machine_id,
          status,
          total_usage_hours,
          total_sharpenings,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating blade:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE blade
router.patch('/blades/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blades')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating blade:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// BLADE USAGE ENDPOINTS
// ============================================================

// GET usage logs for a blade
router.get('/blades/:id/usage-logs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blade_usage_logs')
      .select('*')
      .eq('blade_id', req.params.id)
      .order('start_time', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching usage logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// LOG blade usage
router.post('/blades/:id/log-usage', async (req, res) => {
  try {
    const { machine_id, operator_id, start_time } = req.body;

    const { data, error } = await supabase
      .from('blade_usage_logs')
      .insert([
        {
          blade_id: req.params.id,
          machine_id,
          operator_id,
          start_time,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error logging usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// END usage session
router.patch('/blade-usage/:logId/end', async (req, res) => {
  try {
    const { end_time } = req.body;

    // Get the log to calculate duration
    const { data: logData, error: fetchError } = await supabase
      .from('blade_usage_logs')
      .select('*')
      .eq('id', req.params.logId)
      .single();

    if (fetchError) throw fetchError;

    const startTime = new Date(logData.start_time).getTime();
    const endTime = new Date(end_time).getTime();
    const duration_hours = (endTime - startTime) / (1000 * 60 * 60);

    // Update usage log
    const { data, error } = await supabase
      .from('blade_usage_logs')
      .update({
        end_time,
        duration_hours: parseFloat(duration_hours.toFixed(2)),
        status: 'completed',
      })
      .eq('id', req.params.logId)
      .select()
      .single();

    if (error) throw error;

    // Update blade total usage hours
    const { data: bladeData } = await supabase
      .from('blades')
      .select('total_usage_hours')
      .eq('id', logData.blade_id)
      .single();

    const newTotalHours = (bladeData.total_usage_hours || 0) + duration_hours;

    await supabase
      .from('blades')
      .update({ total_usage_hours: parseFloat(newTotalHours.toFixed(2)) })
      .eq('id', logData.blade_id);

    res.json(data);
  } catch (error) {
    console.error('Error ending usage session:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// BLADE SHARPENING ENDPOINTS
// ============================================================

// GET sharpening history
router.get('/blades/:id/sharpening-history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blade_sharpening_history')
      .select('*')
      .eq('blade_id', req.params.id)
      .order('sharpening_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching sharpening history:', error);
    res.status(500).json({ error: error.message });
  }
});

// RECORD sharpening
router.post('/blades/:id/record-sharpening', async (req, res) => {
  try {
    const { technician_id, notes } = req.body;
    const sharpening_date = new Date().toISOString();

    // Record sharpening event
    const { data, error } = await supabase
      .from('blade_sharpening_history')
      .insert([
        {
          blade_id: req.params.id,
          sharpening_date,
          technician_id,
          notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Update blade sharpening count and status
    const { data: bladeData } = await supabase
      .from('blades')
      .select('total_sharpenings')
      .eq('id', req.params.id)
      .single();

    const newSharpeningCount = (bladeData.total_sharpenings || 0) + 1;

    await supabase
      .from('blades')
      .update({
        total_sharpenings: newSharpeningCount,
        last_sharpening_date: sharpening_date,
        status: 'active',
      })
      .eq('id', req.params.id);

    res.status(201).json(data);
  } catch (error) {
    console.error('Error recording sharpening:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// BLADE ALERTS ENDPOINTS
// ============================================================

// GET active alerts
router.get('/blade-alerts/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blade_alerts')
      .select('*, blades:blade_id (*)')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all alerts for a blade
router.get('/blades/:id/alerts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blade_alerts')
      .select('*')
      .eq('blade_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching blade alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// RESOLVE alert
router.patch('/blade-alerts/:alertId/resolve', async (req, res) => {
  try {
    const { resolved_by, resolution_notes } = req.body;

    const { data, error } = await supabase
      .from('blade_alerts')
      .update({
        is_resolved: true,
        resolved_by,
        resolution_notes,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', req.params.alertId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE alert (for system use)
router.post('/blade-alerts', async (req, res) => {
  try {
    const { blade_id, alert_type, severity, message } = req.body;

    const { data, error } = await supabase
      .from('blade_alerts')
      .insert([
        {
          blade_id,
          alert_type,
          severity,
          message,
          is_resolved: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// BLADE MAINTENANCE ENDPOINTS
// ============================================================

// GET maintenance logs
router.get('/blades/:id/maintenance', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blade_maintenance_logs')
      .select('*')
      .eq('blade_id', req.params.id)
      .order('maintenance_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE maintenance log
router.post('/blades/:id/maintenance', async (req, res) => {
  try {
    const { maintenance_type, technician_id, notes } = req.body;

    const { data, error } = await supabase
      .from('blade_maintenance_logs')
      .insert([
        {
          blade_id: req.params.id,
          maintenance_date: new Date().toISOString(),
          maintenance_type,
          technician_id,
          notes,
          status: 'completed',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating maintenance log:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
