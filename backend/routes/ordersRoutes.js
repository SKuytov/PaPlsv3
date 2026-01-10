import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// PURCHASE ORDERS ENDPOINTS
// ============================================================

// POST: Create purchase order
router.post('/orders', async (req, res) => {
  try {
    const { request_id, supplier_quote_id, po_number, order_status, tracking_number, expected_delivery_date, notes, user_id } = req.body;

    if (!request_id || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: request_id, user_id' 
      });
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([{
        request_id,
        supplier_quote_id,
        po_number: po_number || `PO-${Date.now()}`,
        order_status: order_status || 'NOT_PLACED',
        tracking_number,
        expected_delivery_date,
        notes,
        created_by: user_id,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    // Update request status
    await supabase
      .from('item_requests')
      .update({ order_status: 'ORDER_PLACED' })
      .eq('id', request_id);

    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get orders for a request
router.get('/orders/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Update order tracking
router.patch('/orders/:orderId/tracking', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status, tracking_number, expected_delivery_date, actual_delivery_date, notes } = req.body;

    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        order_status,
        tracking_number,
        expected_delivery_date,
        actual_delivery_date,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select();

    if (error) throw error;

    // If order delivered, update request status
    if (order_status === 'DELIVERED') {
      const order = data[0];
      await supabase
        .from('item_requests')
        .update({ order_status: 'DELIVERED' })
        .eq('id', order.request_id);
    }

    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Update tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get tracking info for an order
router.get('/orders/:orderId/tracking', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data, error } = await supabase
      .from('purchase_orders')
      .select('po_number, order_status, tracking_number, expected_delivery_date, actual_delivery_date, notes')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    res.json(data || {});
  } catch (error) {
    console.error('Get tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Update order
router.patch('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const updateData = req.body;

    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Delete order
router.delete('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get all orders (admin)
router.get('/orders', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    let query = supabase.from('purchase_orders').select('*');
    
    if (status) {
      query = query.eq('order_status', status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;