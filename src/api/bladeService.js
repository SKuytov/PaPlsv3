import { supabase } from '../lib/supabase';

/**
 * Blade Service
 * Handles all blade-related API operations including:
 * - Blade registration and management
 * - Usage tracking and logs
 * - Sharpening history
 * - Maintenance scheduling
 * - Alert management
 */

// ============================================
// Blade Type Operations
// ============================================

export const bladeTypeService = {
  /**
   * Get all blade types
   */
  async getAll(machineType = null) {
    let query = supabase
      .from('blade_types')
      .select('*')
      .eq('is_active', true);

    if (machineType) {
      query = query.eq('machine_type', machineType);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;
    return data;
  },

  /**
   * Get blade type by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('blade_types')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Create new blade type
   */
  async create(bladeTypeData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('blade_types')
      .insert([{
        ...bladeTypeData,
        created_by: user.id,
        updated_by: user.id
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  /**
   * Update blade type
   */
  async update(id, updates) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('blade_types')
      .update({
        ...updates,
        updated_by: user.id,
        updated_at: new Date()
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }
};

// ============================================
// Blade (Individual Unit) Operations
// ============================================

export const bladeService = {
  /**
   * Get all blades
   */
  async getAll(filters = {}) {
    let query = supabase
      .from('blades')
      .select(`
        *,
        blade_types(*),
        machines(id, name, code)
      `);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.blade_type_id) {
      query = query.eq('blade_type_id', filters.blade_type_id);
    }
    if (filters.current_machine_id) {
      query = query.eq('current_machine_id', filters.current_machine_id);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('serial_number');
    if (error) throw error;
    return data;
  },

  /**
   * Get blade by serial number
   */
  async getBySerialNumber(serialNumber) {
    const { data, error } = await supabase
      .from('blades')
      .select(`
        *,
        blade_types(*),
        machines(id, name, code)
      `)
      .eq('serial_number', serialNumber)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Get blade by ID with full details
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('blades')
      .select(`
        *,
        blade_types(*),
        machines(id, name, code)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Create new blade
   * Automatically generates a unique serial number if not provided
   */
  async create(bladeData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Generate serial number if not provided
    let serialNumber = bladeData.serial_number;
    if (!serialNumber) {
      const bladeType = await bladeTypeService.getById(bladeData.blade_type_id);
      const timestamp = Date.now();
      serialNumber = `${bladeType.code}-${timestamp}`;
    }

    const { data, error } = await supabase
      .from('blades')
      .insert([{
        ...bladeData,
        serial_number: serialNumber,
        created_by: user.id,
        updated_by: user.id
      }])
      .select(`
        *,
        blade_types(*),
        machines(id, name, code)
      `);
    
    if (error) throw error;
    return data[0];
  },

  /**
   * Update blade information
   */
  async update(id, updates) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('blades')
      .update({
        ...updates,
        updated_by: user.id,
        updated_at: new Date()
      })
      .eq('id', id)
      .select(`
        *,
        blade_types(*),
        machines(id, name, code)
      `);
    
    if (error) throw error;
    return data[0];
  },

  /**
   * Check blade status and update if needed
   */
  async checkAndUpdateStatus(id) {
    const blade = await this.getById(id);
    const bladeType = blade.blade_types;
    
    let newStatus = blade.status;
    const alerts = [];

    // Check if lifecycle exceeded
    if (blade.total_usage_hours >= bladeType.expected_lifecycle_hours) {
      newStatus = 'retired';
      alerts.push({
        alert_type: 'lifecycle_exceeded',
        severity: 'high',
        message: `Blade ${blade.serial_number} has exceeded expected lifecycle hours`
      });
    }
    // Check if sharpening is due
    else if (
      bladeType.sharpening_interval_hours &&
      blade.total_usage_hours - (blade.last_sharpening_date ? 
        await this.getUsageSinceDate(id, blade.last_sharpening_date) : 
        blade.total_usage_hours) >= bladeType.sharpening_interval_hours
    ) {
      newStatus = 'dull';
      alerts.push({
        alert_type: 'sharpening_due',
        severity: 'medium',
        message: `Blade ${blade.serial_number} is due for sharpening`
      });
    }

    // Update blade status
    if (newStatus !== blade.status) {
      await this.update(id, { status: newStatus });
    }

    // Create alerts
    for (const alert of alerts) {
      await bladeAlertService.create(id, alert);
    }

    return { blade: blade, alerts };
  },

  /**
   * Get usage hours since a specific date
   */
  async getUsageSinceDate(bladeId, sinceDate) {
    const { data, error } = await supabase
      .from('blade_usage_logs')
      .select('duration_hours')
      .eq('blade_id', bladeId)
      .gte('start_time', sinceDate.toISOString());
    
    if (error) throw error;
    return data.reduce((sum, log) => sum + (log.duration_hours || 0), 0);
  }
};

// ============================================
// Blade Usage Log Operations
// ============================================

export const bladeUsageService = {
  /**
   * Get all usage logs for a blade
   */
  async getBladeUsageLogs(bladeId, limit = 100) {
    const { data, error } = await supabase
      .from('blade_usage_logs')
      .select(`
        *,
        machines(id, name, code),
        user_profiles!operator_id(id, first_name, last_name)
      `)
      .eq('blade_id', bladeId)
      .order('start_time', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  /**
   * Create usage log
   */
  async logUsage(bladeId, machineId, usageData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Calculate duration in hours
    const startTime = new Date(usageData.start_time);
    const endTime = usageData.end_time ? new Date(usageData.end_time) : new Date();
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

    const { data, error } = await supabase
      .from('blade_usage_logs')
      .insert([{
        blade_id: bladeId,
        machine_id: machineId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_hours: durationHours,
        operator_id: user.id,
        ...usageData
      }])
      .select();
    
    if (error) throw error;

    // Update blade's total usage hours
    const blade = await bladeService.getById(bladeId);
    await bladeService.update(bladeId, {
      total_usage_hours: (blade.total_usage_hours || 0) + durationHours,
      last_usage_date: endTime
    });

    // Check and update blade status
    await bladeService.checkAndUpdateStatus(bladeId);

    return data[0];
  },

  /**
   * End active usage session
   */
  async endUsageSession(logId) {
    const { data: { user } } = await supabase.auth.getUser();
    const endTime = new Date();

    const { data: logData } = await supabase
      .from('blade_usage_logs')
      .select('*')
      .eq('id', logId)
      .single();

    const startTime = new Date(logData.start_time);
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

    const { data, error } = await supabase
      .from('blade_usage_logs')
      .update({
        end_time: endTime.toISOString(),
        duration_hours: durationHours,
        updated_at: new Date()
      })
      .eq('id', logId)
      .select();
    
    if (error) throw error;
    return data[0];
  }
};

// ============================================
// Blade Sharpening Operations
// ============================================

export const bladeSharpeningService = {
  /**
   * Get sharpening history for a blade
   */
  async getHistory(bladeId) {
    const { data, error } = await supabase
      .from('blade_sharpening_history')
      .select(`
        *,
        user_profiles!sharpened_by(id, first_name, last_name)
      `)
      .eq('blade_id', bladeId)
      .order('sharpening_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Record blade sharpening
   */
  async recordSharpening(bladeId, sharpeningData) {
    const { data: { user } } = await supabase.auth.getUser();
    const blade = await bladeService.getById(bladeId);

    const { data, error } = await supabase
      .from('blade_sharpening_history')
      .insert([{
        blade_id: bladeId,
        sharpening_number: (blade.total_sharpenings || 0) + 1,
        sharpened_by: user.id,
        sharpening_date: new Date(),
        ...sharpeningData
      }])
      .select();
    
    if (error) throw error;

    // Update blade sharpening count
    await bladeService.update(bladeId, {
      total_sharpenings: (blade.total_sharpenings || 0) + 1,
      last_sharpening_date: new Date(),
      status: 'active'
    });

    return data[0];
  }
};

// ============================================
// Blade Maintenance Operations
// ============================================

export const bladeMaintenanceService = {
  /**
   * Get maintenance logs for a blade
   */
  async getMaintenanceLogs(bladeId) {
    const { data, error } = await supabase
      .from('blade_maintenance_logs')
      .select(`
        *,
        user_profiles!technician_id(id, first_name, last_name)
      `)
      .eq('blade_id', bladeId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Create maintenance log
   */
  async createMaintenanceLog(bladeId, maintenanceData) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('blade_maintenance_logs')
      .insert([{
        blade_id: bladeId,
        technician_id: user.id,
        start_date: new Date(),
        ...maintenanceData
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  /**
   * Update maintenance log status
   */
  async updateMaintenanceStatus(maintenanceLogId, status, endData = {}) {
    const updates = {
      status,
      updated_at: new Date()
    };

    if (status === 'completed' || status === 'failed') {
      updates.end_date = new Date();
    }

    const { data, error } = await supabase
      .from('blade_maintenance_logs')
      .update({ ...updates, ...endData })
      .eq('id', maintenanceLogId)
      .select();
    
    if (error) throw error;
    return data[0];
  }
};

// ============================================
// Blade Alert Operations
// ============================================

export const bladeAlertService = {
  /**
   * Get active alerts for a blade
   */
  async getActiveAlerts(bladeId = null) {
    let query = supabase
      .from('blade_alerts')
      .select(`
        *,
        blades(id, serial_number, blade_types(name))
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (bladeId) {
      query = query.eq('blade_id', bladeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Get all alerts (resolved and active)
   */
  async getAllAlerts(bladeId = null, limit = 50) {
    let query = supabase
      .from('blade_alerts')
      .select(`
        *,
        blades(id, serial_number, blade_types(name))
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (bladeId) {
      query = query.eq('blade_id', bladeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Create new alert
   */
  async create(bladeId, alertData) {
    const { data, error } = await supabase
      .from('blade_alerts')
      .insert([{
        blade_id: bladeId,
        ...alertData,
        created_at: new Date()
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  /**
   * Resolve an alert
   */
  async resolve(alertId, resolutionNotes = '') {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('blade_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date(),
        resolved_by: user.id,
        updated_at: new Date()
      })
      .eq('id', alertId)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  /**
   * Get alert summary statistics
   */
  async getAlertSummary() {
    const { data, error } = await supabase
      .from('blade_alerts')
      .select('alert_type, severity, is_resolved')
      .eq('is_resolved', false);
    
    if (error) throw error;

    const summary = {
      total_active: data.length,
      by_severity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      by_type: {}
    };

    data.forEach(alert => {
      summary.by_severity[alert.severity]++;
      summary.by_type[alert.alert_type] = (summary.by_type[alert.alert_type] || 0) + 1;
    });

    return summary;
  }
};

export default {
  bladeTypeService,
  bladeService,
  bladeUsageService,
  bladeSharpeningService,
  bladeMaintenanceService,
  bladeAlertService
};
