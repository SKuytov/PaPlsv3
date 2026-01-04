import express from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

/**
 * POST /api/inventory/restock
 * Restock an inventory item with permission validation and audit logging
 */
router.post('/restock', async (req, res) => {
  try {
    const { user_id, spare_part_id, quantity_added, reason, building, technician_name } = req.body;

    console.log('[Inventory Restock] Request:', {
      user_id,
      spare_part_id,
      quantity_added,
      building,
      technician_name
    });

    // Validate input
    if (!user_id || !spare_part_id || !quantity_added) {
      return res.status(400).json({ error: 'Missing required fields: user_id, spare_part_id, quantity_added' });
    }

    const qty = parseInt(quantity_added);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    // Step 1: Get user with role
    console.log('[Inventory Restock] Fetching user:', user_id);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        role_id,
        role:roles (
          id,
          name,
          permissions
        )
      `)
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      console.error('[Inventory Restock] User not found:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Step 2: Check permissions
    console.log('[Inventory Restock] User role:', user.role?.name);
    const userPermissions = user.role?.permissions || {};
    
    // Check if user can restock
    const canRestock = 
      userPermissions['restock_inventory'] === true || 
      userPermissions['system_admin'] === true;

    if (!canRestock) {
      console.warn('[Inventory Restock] Permission denied for user:', user_id, 'Role:', user.role?.name);
      return res.status(403).json({ 
        error: 'Permission denied: Your role cannot restock inventory' 
      });
    }

    // Step 3: Get current spare part inventory
    console.log('[Inventory Restock] Fetching spare part:', spare_part_id);
    const { data: sparePart, error: spareError } = await supabase
      .from('spare_parts')
      .select('id, name, quantity_on_hand')
      .eq('id', spare_part_id)
      .single();

    if (spareError || !sparePart) {
      console.error('[Inventory Restock] Spare part not found:', spareError);
      return res.status(404).json({ error: 'Spare part not found' });
    }

    const previousQty = sparePart.quantity_on_hand || 0;
    const newQty = previousQty + qty;

    console.log('[Inventory Restock] Quantity update:', previousQty, '=>', newQty);

    // Step 4: Update inventory
    const { error: updateError } = await supabase
      .from('spare_parts')
      .update({ 
        quantity_on_hand: newQty,
        updated_at: new Date().toISOString()
      })
      .eq('id', spare_part_id);

    if (updateError) {
      console.error('[Inventory Restock] Update error:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update inventory',
        details: updateError.message
      });
    }

    // Step 5: Create audit log
    console.log('[Inventory Restock] Creating audit log...');
    const { data: log, error: logError } = await supabase
      .from('inventory_restock_log')
      .insert({
        user_id: user_id,
        spare_part_id: parseInt(spare_part_id),
        quantity_added: qty,
        reason: reason || 'Manual restock',
        previous_quantity: previousQty,
        new_quantity: newQty,
        building: building || 'Unknown',
        notes: `Restocked by: ${technician_name || user.full_name}`
      })
      .select()
      .single();

    if (logError) {
      console.error('[Inventory Restock] Audit log error:', logError);
      // Don't fail if audit log fails, but log the error
      console.warn('[Inventory Restock] Warning: Audit log creation failed, but inventory was updated');
    }

    console.log('[Inventory Restock] Success:', log);

    // Return success response
    res.json({
      success: true,
      message: `Successfully restocked ${sparePart.name}`,
      spare_part: {
        id: sparePart.id,
        name: sparePart.name,
        previous_quantity: previousQty,
        quantity_added: qty,
        new_quantity: newQty
      },
      log: log,
      user: {
        id: user.id,
        name: user.full_name
      }
    });

  } catch (error) {
    console.error('[Inventory Restock] Unexpected error:', error);
    res.status(500).json({ 
      error: 'Internal server error during restock',
      details: error.message
    });
  }
});

/**
 * GET /api/inventory/restock-history
 * Get restock history with optional filters
 */
router.get('/restock-history', async (req, res) => {
  try {
    const { limit = 50, offset = 0, user_id, building } = req.query;

    let query = supabase
      .from('inventory_restock_log')
      .select(`
        *,
        user:users (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (building) {
      query = query.eq('building', building);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('[Restock History] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch restock history' });
    }

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('[Restock History] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
