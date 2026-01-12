// Blade Purchase Order & Serial Number Management Service
// File: src/api/bladePurchaseService.js
// Purpose: Manage blade purchase orders and sequential serial number allocation

import { supabase } from '../lib/supabase';

/**
 * Blade Purchase Service
 * Manages purchase orders, serial number allocation, and blade inventory
 */

const bladePurchaseService = {
  /**
   * Get all purchase orders with optional filters
   * @param {Object} filters - Filter options
   * @param {uuid} filters.bladeTypeId - Filter by blade type
   * @param {string} filters.status - Filter by status (pending, received, partial, cancelled)
   * @param {number} filters.limit - Limit results
   * @returns {Promise<Array>} Array of purchase orders
   */
  async getAllPurchaseOrders(filters = {}) {
    try {
      let query = supabase
        .from('blade_purchase_order')
        .select(`
          *,
          blade_types!inner(id, code, machine_type, name),
          auth.users!created_by(email, full_name)
        `);

      if (filters.bladeTypeId) {
        query = query.eq('blade_type_id', filters.bladeTypeId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  /**
   * Get single purchase order with full details
   * @param {uuid} orderId - Purchase order ID
   * @returns {Promise<Object>} Purchase order details
   */
  async getPurchaseOrderById(orderId) {
    try {
      const { data, error } = await supabase
        .from('blade_purchase_order')
        .select(`
          *,
          blade_types!inner(id, code, machine_type, name, lifecycle_hours),
          auth.users!created_by(email, full_name),
          supplier:suppliers(id, name, contact_person, email, phone)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      throw error;
    }
  },

  /**
   * Create purchase order and auto-generate blade serial numbers
   * This function handles everything: order creation + blade generation
   * @param {Object} orderData - Purchase order details
   * @param {uuid} orderData.bladeTypeId - Blade type ID
   * @param {number} orderData.quantityOrdered - Quantity to order
   * @param {string} orderData.supplierName - Supplier name
   * @param {string} orderData.poNumber - PO reference number
   * @param {number} orderData.unitCost - Cost per blade
   * @param {Date} orderData.expectedDeliveryDate - Expected arrival
   * @returns {Promise<Object>} Order result with serial number range
   */
  async createPurchaseOrder(orderData) {
    try {
      const {
        bladeTypeId,
        quantityOrdered,
        supplierName,
        poNumber = null,
        unitCost = null,
        expectedDeliveryDate = null,
        supplierId = null,
        invoiceNumber = null,
        notes = null,
      } = orderData;

      // Validate inputs
      if (!bladeTypeId || !quantityOrdered || !supplierName) {
        throw new Error('Missing required fields: bladeTypeId, quantityOrdered, supplierName');
      }

      if (quantityOrdered < 1 || quantityOrdered > 1000) {
        throw new Error('Quantity must be between 1 and 1000');
      }

      // Call the database function to create order and generate blades
      const { data, error } = await supabase.rpc('create_purchase_order_with_blades', {
        blade_type_id_param: bladeTypeId,
        quantity_param: quantityOrdered,
        supplier_name_param: supplierName,
        po_number_param: poNumber,
        unit_cost_param: unitCost,
      });

      if (error) throw error;

      // Update purchase order with additional details
      const orderResult = data[0];
      await supabase
        .from('blade_purchase_order')
        .update({
          supplier_id: supplierId,
          invoice_number: invoiceNumber,
          expected_delivery_date: expectedDeliveryDate,
          notes: notes,
        })
        .eq('id', orderResult.order_id);

      return {
        success: true,
        orderId: orderResult.order_id,
        serialNumberStart: orderResult.serial_start,
        serialNumberEnd: orderResult.serial_end,
        bladeCount: orderResult.blades_created,
        message: `Created ${orderResult.blades_created} blades with serial numbers from ${orderResult.serial_start} to ${orderResult.serial_end}`,
      };
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  },

  /**
   * Update purchase order status
   * @param {uuid} orderId - Purchase order ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated purchase order
   */
  async updatePurchaseOrder(orderId, updates) {
    try {
      const { data, error } = await supabase
        .from('blade_purchase_order')
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  },

  /**
   * Mark purchase order as received
   * @param {uuid} orderId - Purchase order ID
   * @returns {Promise<Object>} Updated purchase order
   */
  async markPurchaseOrderReceived(orderId) {
    try {
      return await this.updatePurchaseOrder(orderId, {
        status: 'received',
        actual_delivery_date: new Date(),
      });
    } catch (error) {
      console.error('Error marking purchase order as received:', error);
      throw error;
    }
  },

  /**
   * Get serial counter for a blade type
   * Shows current allocation state and next serial number
   * @param {uuid} bladeTypeId - Blade type ID
   * @returns {Promise<Object>} Serial counter details
   */
  async getSerialCounter(bladeTypeId) {
    try {
      const { data, error } = await supabase
        .from('blade_serial_counter')
        .select('*')
        .eq('blade_type_id', bladeTypeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching serial counter:', error);
      throw error;
    }
  },

  /**
   * Get next available serial number for a blade type
   * @param {uuid} bladeTypeId - Blade type ID
   * @returns {Promise<Object>} Next serial number info
   */
  async getNextSerialNumber(bladeTypeId) {
    try {
      const counter = await this.getSerialCounter(bladeTypeId);

      if (!counter) {
        throw new Error('Serial counter not initialized for this blade type');
      }

      const nextNumber = counter.current_counter + 1;
      const nextSerialNumber =
        counter.serial_prefix + String(nextNumber).padStart(5, '0');

      return {
        prefix: counter.serial_prefix,
        currentCounter: counter.current_counter,
        nextNumber: nextNumber,
        nextSerialNumber: nextSerialNumber,
        totalAllocated: counter.total_allocated,
        totalActive: counter.total_active,
        totalRetired: counter.total_retired,
      };
    } catch (error) {
      console.error('Error getting next serial number:', error);
      throw error;
    }
  },

  /**
   * Get inventory summary for all blade types
   * @returns {Promise<Array>} Inventory summary for each blade type
   */
  async getInventorySummary() {
    try {
      const { data, error } = await supabase
        .from('blade_inventory_summary')
        .select(`
          *,
          blade_types!inner(id, code, machine_type, name)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      throw error;
    }
  },

  /**
   * Get inventory summary for specific blade type
   * @param {uuid} bladeTypeId - Blade type ID
   * @returns {Promise<Object>} Inventory summary
   */
  async getInventorySummaryByType(bladeTypeId) {
    try {
      const { data, error } = await supabase
        .from('blade_inventory_summary')
        .select(`
          *,
          blade_types!inner(id, code, machine_type, name, lifecycle_hours)
        `)
        .eq('blade_type_id', bladeTypeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      throw error;
    }
  },

  /**
   * Retire a blade and record the retirement
   * @param {uuid} bladeId - Blade ID to retire
   * @param {string} reason - Reason for retirement
   * @param {string} notes - Additional notes
   * @returns {Promise<boolean>} Success status
   */
  async retireBlade(bladeId, reason, notes = null) {
    try {
      const { data, error } = await supabase.rpc('retire_blade', {
        blade_id_param: bladeId,
        reason: reason,
        notes_param: notes,
      });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error retiring blade:', error);
      throw error;
    }
  },

  /**
   * Get retirement records for a blade type
   * @param {uuid} bladeTypeId - Blade type ID
   * @returns {Promise<Array>} Retirement records
   */
  async getRetirementRecords(bladeTypeId) {
    try {
      const { data, error } = await supabase
        .from('blade_retirement_record')
        .select(`
          *,
          blade_types!inner(id, code, name),
          auth.users!retired_by(email, full_name)
        `)
        .eq('blade_type_id', bladeTypeId)
        .order('retirement_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching retirement records:', error);
      throw error;
    }
  },

  /**
   * Get retirement record for specific blade
   * @param {uuid} bladeId - Blade ID
   * @returns {Promise<Object>} Retirement record
   */
  async getRetirementRecordByBladeId(bladeId) {
    try {
      const { data, error } = await supabase
        .from('blade_retirement_record')
        .select(`
          *,
          blade_types!inner(id, code, name),
          auth.users!retired_by(email, full_name)
        `)
        .eq('blade_id', bladeId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No record found, blade not retired
        return null;
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching retirement record:', error);
      throw error;
    }
  },

  /**
   * Get blades by serial number range
   * Useful for viewing all blades from a specific purchase order
   * @param {uuid} bladeTypeId - Blade type ID
   * @param {number} startNumber - Starting serial number
   * @param {number} endNumber - Ending serial number
   * @returns {Promise<Array>} Blades in range
   */
  async getBladesBySerialRange(bladeTypeId, startNumber, endNumber) {
    try {
      // Get serial prefix for blade type
      const { data: counterData, error: counterError } = await supabase
        .from('blade_serial_counter')
        .select('serial_prefix')
        .eq('blade_type_id', bladeTypeId)
        .single();

      if (counterError) throw counterError;

      const prefix = counterData.serial_prefix;
      const startSerial = prefix + String(startNumber).padStart(5, '0');
      const endSerial = prefix + String(endNumber).padStart(5, '0');

      const { data, error } = await supabase
        .from('blades')
        .select(`
          *,
          blade_types!inner(id, code, name),
          current_location:machines(id, name, machine_type)
        `)
        .eq('blade_type_id', bladeTypeId)
        .gte('serial_number', startSerial)
        .lte('serial_number', endSerial)
        .order('serial_number', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching blades by serial range:', error);
      throw error;
    }
  },

  /**
   * Get statistics for purchase orders
   * @param {uuid} bladeTypeId - Blade type ID (optional)
   * @returns {Promise<Object>} Purchase order statistics
   */
  async getPurchaseOrderStats(bladeTypeId = null) {
    try {
      let query = supabase.from('blade_purchase_order').select('*', { count: 'exact' });

      if (bladeTypeId) {
        query = query.eq('blade_type_id', bladeTypeId);
      }

      const { data, count } = await query;

      const stats = {
        totalOrders: count,
        pending: data.filter((o) => o.status === 'pending').length,
        received: data.filter((o) => o.status === 'received').length,
        partial: data.filter((o) => o.status === 'partial').length,
        cancelled: data.filter((o) => o.status === 'cancelled').length,
        totalQuantity: data.reduce((sum, o) => sum + o.quantity_ordered, 0),
        totalCost: data.reduce((sum, o) => sum + (o.total_cost || 0), 0),
      };

      return stats;
    } catch (error) {
      console.error('Error fetching purchase order stats:', error);
      throw error;
    }
  },

  /**
   * Initialize serial counter for a blade type
   * Called when creating new blade types
   * @param {uuid} bladeTypeId - Blade type ID
   * @param {string} serialPrefix - Serial number prefix (e.g., 'B4', 'W1')
   * @returns {Promise<uuid>} Counter ID
   */
  async initializeSerialCounter(bladeTypeId, serialPrefix) {
    try {
      const { data, error } = await supabase.rpc('initialize_blade_serial_counter', {
        blade_type_id_param: bladeTypeId,
        serial_prefix_param: serialPrefix,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error initializing serial counter:', error);
      throw error;
    }
  },
};

export default bladePurchaseService;
