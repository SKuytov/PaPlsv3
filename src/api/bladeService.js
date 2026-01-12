// ============================================================================
// BLADE LIFECYCLE TRACKING SERVICE
// Complete API integration with Supabase for blade management
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// BLADE TYPES API
// ============================================================================

/**
 * Fetch all blade types from database
 * @returns {Promise<Array>} Array of blade types
 */
export const fetchBladeTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('blade_types')
      .select('*')
      .order('code', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching blade types:', error);
    throw error;
  }
};

/**
 * Create a new blade type
 * @param {Object} typeData - { code, machineType, description, totalQuantity }
 * @returns {Promise<Object>} Created blade type
 */
export const createBladeType = async (typeData) => {
  try {
    const { data, error } = await supabase
      .from('blade_types')
      .insert([
        {
          code: typeData.code,
          machine_type: typeData.machineType,
          description: typeData.description || '',
          total_quantity: parseInt(typeData.totalQuantity),
          next_serial_number: 1
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error creating blade type:', error);
    throw error;
  }
};

/**
 * Delete a blade type (only if no blades exist)
 * @param {number} typeId - Blade type ID
 * @returns {Promise<void>}
 */
export const deleteBladeType = async (typeId) => {
  try {
    // Check if any blades exist for this type
    const { count, error: countError } = await supabase
      .from('blades')
      .select('*', { count: 'exact', head: true })
      .eq('type_id', typeId);

    if (countError) throw countError;

    if (count > 0) {
      throw new Error('Cannot delete blade type with existing blades');
    }

    const { error } = await supabase
      .from('blade_types')
      .delete()
      .eq('id', typeId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting blade type:', error);
    throw error;
  }
};

// ============================================================================
// BLADES API
// ============================================================================

/**
 * Fetch all blades with their type information
 * @returns {Promise<Array>} Array of blades with type info
 */
export const fetchAllBlades = async () => {
  try {
    const { data, error } = await supabase
      .from('blades')
      .select(
        `
        id,
        type_id,
        serial_number,
        status,
        purchase_date,
        default_machine,
        created_at,
        updated_at,
        blade_types:type_id (id, code, machine_type, description)
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching blades:', error);
    throw error;
  }
};

/**
 * Search blades by serial number (real-time filtering)
 * @param {string} searchTerm - Serial number search term
 * @returns {Promise<Array>} Filtered blades
 */
export const searchBladesBySerial = async (searchTerm) => {
  try {
    if (!searchTerm.trim()) {
      return fetchAllBlades();
    }

    const { data, error } = await supabase
      .from('blades')
      .select(
        `
        id,
        type_id,
        serial_number,
        status,
        purchase_date,
        default_machine,
        created_at,
        blade_types:type_id (id, code, machine_type, description)
      `
      )
      .ilike('serial_number', `%${searchTerm}%`)
      .order('serial_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching blades:', error);
    throw error;
  }
};

/**
 * Fetch a single blade with all its events
 * @param {number} bladeId - Blade ID
 * @returns {Promise<Object>} Blade with events
 */
export const fetchBladeDetail = async (bladeId) => {
  try {
    const { data, error } = await supabase
      .from('blades')
      .select(
        `
        id,
        type_id,
        serial_number,
        status,
        purchase_date,
        default_machine,
        created_at,
        updated_at,
        blade_types:type_id (id, code, machine_type, description),
        blade_events (id, event_type, event_date, machine, notes, created_by)
      `
      )
      .eq('id', bladeId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching blade detail:', error);
    throw error;
  }
};

/**
 * Create multiple blades (bulk purchase)
 * @param {number} typeId - Blade type ID
* @param {number} quantity - Number of blades to create
 * @returns {Promise<Array>} Created blades
 */
export const createBladesBulk = async (typeId, quantity) => {
  try {
    // Get the blade type to access next_serial_number
    const { data: typeData, error: typeError } = await supabase
      .from('blade_types')
      .select('*')
      .eq('id', typeId)
      .single();

    if (typeError) throw typeError;

    // Generate new blades
    const newBlades = [];
    const codeNum = typeData.code.split('-')[1];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < quantity; i++) {
      const serialNum = String(typeData.next_serial_number + i).padStart(5, '0');
      const serialNumber = `B${codeNum}${serialNum}`;

      newBlades.push({
        type_id: typeId,
        serial_number: serialNumber,
        status: 'new',
        purchase_date: today,
        default_machine: typeData.machine_type
      });
    }

    // Insert all blades
    const { data: insertedBlades, error: insertError } = await supabase
      .from('blades')
      .insert(newBlades)
      .select();

    if (insertError) throw insertError;

    // Update blade type's next_serial_number
    const { error: updateError } = await supabase
      .from('blade_types')
      .update({
        next_serial_number: typeData.next_serial_number + quantity,
        total_quantity: typeData.total_quantity + quantity
      })
      .eq('id', typeId);

    if (updateError) throw updateError;

    return insertedBlades || [];
  } catch (error) {
    console.error('Error creating blades:', error);
    throw error;
  }
};

/**
 * Delete a blade
 * @param {number} bladeId - Blade ID
 * @returns {Promise<void>}
 */
export const deleteBlade = async (bladeId) => {
  try {
    const { error } = await supabase
      .from('blades')
      .delete()
      .eq('id', bladeId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting blade:', error);
    throw error;
  }
};

// ============================================================================
// BLADE EVENTS API
// ============================================================================

/**
 * Log a blade event
 * @param {number} bladeId - Blade ID
 * @param {Object} eventData - { eventType, machine, notes }
 * @returns {Promise<Object>} Created event
 */
export const logBladeEvent = async (bladeId, eventData) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get current user email for audit trail
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.warn('Could not get current user:', userError);
    }

    // Insert event
    const { data: eventResult, error: eventError } = await supabase
      .from('blade_events')
      .insert([
        {
          blade_id: bladeId,
          event_type: eventData.eventType,
          event_date: today,
          machine: eventData.machine || null,
          notes: eventData.notes || null,
          created_by: user?.email || 'System'
        }
      ])
      .select();

    if (eventError) throw eventError;

    // Update blade status based on event type
    const statusMap = {
      mounted: 'active',
      removed: 'inactive',
      sharpened: 'active',
      inspected: 'active',
      maintenance: 'inactive'
    };

    const newStatus = statusMap[eventData.eventType];

    if (newStatus) {
      const { error: bladeUpdateError } = await supabase
        .from('blades')
        .update({
          status: newStatus,
          default_machine: eventData.machine || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', bladeId);

      if (bladeUpdateError) throw bladeUpdateError;
    }

    return eventResult[0];
  } catch (error) {
    console.error('Error logging blade event:', error);
    throw error;
  }
};

/**
 * Fetch all events for a blade
 * @param {number} bladeId - Blade ID
 * @returns {Promise<Array>} Array of events
 */
export const fetchBladeEvents = async (bladeId) => {
  try {
    const { data, error } = await supabase
      .from('blade_events')
      .select('*')
      .eq('blade_id', bladeId)
      .order('event_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching blade events:', error);
    throw error;
  }
};

/**
 * Update blade's default machine
 * @param {number} bladeId - Blade ID
 * @param {string} machine - Machine name
 * @returns {Promise<Object>} Updated blade
 */
export const updateBladeDefaultMachine = async (bladeId, machine) => {
  try {
    const { data, error } = await supabase
      .from('blades')
      .update({
        default_machine: machine,
        updated_at: new Date().toISOString()
      })
      .eq('id', bladeId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error updating blade default machine:', error);
    throw error;
  }
};

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get blade statistics by type
 * @returns {Promise<Object>} Statistics object
 */
export const getBladeStatistics = async () => {
  try {
    // Get all blades with status
    const { data: blades, error: bladesError } = await supabase
      .from('blades')
      .select('status, type_id, blade_types:type_id(code)');

    if (bladesError) throw bladesError;

    // Calculate statistics
    const stats = {
      total: blades.length,
      byStatus: {
        active: blades.filter(b => b.status === 'active').length,
        inactive: blades.filter(b => b.status === 'inactive').length,
        sharpening: blades.filter(b => b.status === 'sharpening').length,
        new: blades.filter(b => b.status === 'new').length,
        retired: blades.filter(b => b.status === 'retired').length
      },
      byType: {}
    };

    // Group by type
    blades.forEach(blade => {
      const typeCode = blade.blade_types?.code || 'Unknown';
      if (!stats.byType[typeCode]) {
        stats.byType[typeCode] = { total: 0, active: 0, sharpening: 0 };
      }
      stats.byType[typeCode].total++;
      if (blade.status === 'active') stats.byType[typeCode].active++;
      if (blade.status === 'sharpening') stats.byType[typeCode].sharpening++;
    });

    return stats;
  } catch (error) {
    console.error('Error getting blade statistics:', error);
    throw error;
  }
};

export default {
  // Blade Types
  fetchBladeTypes,
  createBladeType,
  deleteBladeType,

  // Blades
  fetchAllBlades,
  searchBladesBySerial,
  fetchBladeDetail,
  createBladesBulk,
  deleteBlade,

  // Events
  logBladeEvent,
  fetchBladeEvents,
  updateBladeDefaultMachine,

  // Analytics
  getBladeStatistics
};
