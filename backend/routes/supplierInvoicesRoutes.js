import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// SUPPLIER INVOICE TRACKING ENDPOINTS - PRODUCTION READY
// ============================================================

/**
 * GET /api/supplier-invoices
 * Fetch all supplier invoices with optional filters
 * Query params: status, order_id
 */
router.get('/supplier-invoices', async (req, res) => {
  try {
    const { status, order_id, limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id || req.query.userId;

    let query = supabase
      .from('supplier_invoices')
      .select(`
        *,
        order:orders(id, title, supplier, amount),
        created_by_user:profiles(id, full_name, email)
      `)
      .order('received_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (order_id) {
      query = query.eq('order_id', order_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });
  } catch (err) {
    console.error('❌ Error fetching supplier invoices:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to fetch supplier invoices' 
    });
  }
});

/**
 * GET /api/supplier-invoices/:id
 * Fetch a single supplier invoice
 */
router.get('/supplier-invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('supplier_invoices')
      .select(`
        *,
        order:orders(id, title, supplier, amount),
        created_by_user:profiles(id, full_name, email),
        sent_to_accounting_user:profiles!sent_to_accounting_by(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false,
          error: 'Supplier invoice not found' 
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('❌ Error fetching supplier invoice:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to fetch supplier invoice' 
    });
  }
});

/**
 * POST /api/supplier-invoices
 * Create a new supplier invoice record
 * Body: { order_id, supplier_invoice_number, amount, received_date, due_date, notes?, attachment_url? }
 */
router.post('/supplier-invoices', async (req, res) => {
  try {
    const {
      order_id,
      supplier_invoice_number,
      amount,
      received_date,
      due_date,
      notes,
      attachment_url
    } = req.body;

    const userId = req.user?.id || req.body.userId;

    // Validation
    if (!order_id || !supplier_invoice_number || !amount || !received_date || !due_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: order_id, supplier_invoice_number, amount, received_date, due_date'
      });
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a valid positive number'
      });
    }

    // Validate dates
    const receivedDate = new Date(received_date);
    const dueDate = new Date(due_date);

    if (isNaN(receivedDate.getTime()) || isNaN(dueDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const { data, error } = await supabase
      .from('supplier_invoices')
      .insert([{
        order_id,
        supplier_invoice_number: supplier_invoice_number.trim(),
        amount: amountValue,
        received_date: received_date,
        due_date: due_date,
        status: 'pending',
        notes: notes?.trim() || null,
        attachment_url: attachment_url || null,
        created_by: userId,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        order:orders(id, title, supplier, amount)
      `);

    if (error) throw error;

    console.log(`✅ Supplier invoice created: ${data[0]?.supplier_invoice_number}`);

    res.status(201).json({
      success: true,
      message: 'Supplier invoice logged successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('❌ Error creating supplier invoice:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to create supplier invoice' 
    });
  }
});

/**
 * PATCH /api/supplier-invoices/:id
 * Update a supplier invoice
 * Body: { status?, notes?, attachment_url? }
 */
router.patch('/supplier-invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, attachment_url } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (attachment_url) updateData.attachment_url = attachment_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('supplier_invoices')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        order:orders(id, title, supplier, amount)
      `);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Supplier invoice not found'
      });
    }

    console.log(`✅ Supplier invoice ${id} updated`);

    res.json({
      success: true,
      message: 'Supplier invoice updated successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('❌ Error updating supplier invoice:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to update supplier invoice' 
    });
  }
});

/**
 * POST /api/supplier-invoices/:id/send-to-accounting
 * Mark invoice as sent to accounting department
 */
router.post('/supplier-invoices/:id/send-to-accounting', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.userId;

    const { data, error } = await supabase
      .from('supplier_invoices')
      .update({
        status: 'sent_to_accounting',
        sent_to_accounting_date: new Date().toISOString().split('T')[0],
        sent_to_accounting_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        order:orders(id, title, supplier, amount)
      `);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Supplier invoice not found'
      });
    }

    console.log(`✅ Invoice ${id} sent to accounting by user ${userId}`);

    res.json({
      success: true,
      message: 'Invoice sent to Accounting department',
      data: data[0]
    });
  } catch (err) {
    console.error('❌ Error sending invoice to accounting:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to send invoice to accounting' 
    });
  }
});

/**
 * DELETE /api/supplier-invoices/:id
 * Delete a supplier invoice
 */
router.delete('/supplier-invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('supplier_invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`✅ Supplier invoice ${id} deleted`);

    res.json({
      success: true,
      message: 'Supplier invoice deleted successfully'
    });
  } catch (err) {
    console.error('❌ Error deleting supplier invoice:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to delete supplier invoice' 
    });
  }
});

/**
 * GET /api/supplier-invoices/stats/summary
 * Get supplier invoice statistics
 */
router.get('/supplier-invoices/stats/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('supplier_invoices')
      .select('status, amount');

    if (error) throw error;

    const stats = {
      total_invoices: data?.length || 0,
      total_amount: data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
      pending: data?.filter(inv => inv.status === 'pending').length || 0,
      sent_to_accounting: data?.filter(inv => inv.status === 'sent_to_accounting').length || 0,
      paid: data?.filter(inv => inv.status === 'paid').length || 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('❌ Error fetching invoice statistics:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to fetch statistics' 
    });
  }
});

export default router;
