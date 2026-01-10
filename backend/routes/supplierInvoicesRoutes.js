import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET ALL SUPPLIER INVOICES
 * Query params: status, order_id, limit, offset
 */
router.get('/supplier-invoices', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, order_id, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('supplier_invoices')
      .select('*', { count: 'exact' })
      .eq('created_by', userId);

    if (status) query = query.eq('status', status);
    if (order_id) query = query.eq('order_id', order_id);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error fetching supplier invoices:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch supplier invoices' 
    });
  }
});

/**
 * GET SINGLE SUPPLIER INVOICE
 */
router.get('/supplier-invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('supplier_invoices')
      .select('*')
      .eq('id', id)
      .eq('created_by', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Supplier invoice not found' });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error fetching supplier invoice:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch supplier invoice' 
    });
  }
});

/**
 * CREATE SUPPLIER INVOICE (LOG RECEIVED INVOICE)
 */
router.post('/supplier-invoices', authenticateToken, async (req, res) => {
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

    const userId = req.user?.id;

    // Validation
    if (!order_id || !supplier_invoice_number?.trim() || !amount || !received_date || !due_date) {
      return res.status(400).json({
        error: 'Missing required fields: order_id, supplier_invoice_number, amount, received_date, due_date'
      });
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number'
      });
    }

    // Check if invoice number already exists
    const { data: existingInvoice } = await supabase
      .from('supplier_invoices')
      .select('id')
      .eq('supplier_invoice_number', supplier_invoice_number.trim())
      .single();

    if (existingInvoice) {
      return res.status(409).json({
        error: 'Supplier invoice number already exists'
      });
    }

    const { data, error } = await supabase
      .from('supplier_invoices')
      .insert([{
        order_id,
        supplier_invoice_number: supplier_invoice_number.trim(),
        amount: parseFloat(amount),
        received_date,
        due_date,
        status: 'pending',
        notes: notes?.trim() || null,
        attachment_url: attachment_url?.trim() || null,
        created_by: userId
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Supplier invoice logged successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('Error creating supplier invoice:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to log supplier invoice' 
    });
  }
});

/**
 * UPDATE SUPPLIER INVOICE
 */
router.patch('/supplier-invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { status, notes, amount, due_date } = req.body;

    // Build update object
    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (amount) updateData.amount = parseFloat(amount);
    if (due_date) updateData.due_date = due_date;

    const { data, error } = await supabase
      .from('supplier_invoices')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', userId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Supplier invoice not found' });
    }

    res.json({
      success: true,
      message: 'Supplier invoice updated successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('Error updating supplier invoice:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to update supplier invoice' 
    });
  }
});

/**
 * SEND INVOICE TO ACCOUNTING DEPARTMENT
 */
router.post('/supplier-invoices/:id/send-to-accounting', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const sentDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('supplier_invoices')
      .update({
        status: 'sent_to_accounting',
        sent_to_accounting_at: sentDate
      })
      .eq('id', id)
      .eq('created_by', userId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Supplier invoice not found' });
    }

    console.log(`✅ Invoice ${id} sent to accounting by user ${userId} on ${sentDate}`);

    res.json({
      success: true,
      message: 'Invoice sent to Accounting department successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('Error sending invoice to accounting:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to send invoice to accounting' 
    });
  }
});

/**
 * DELETE SUPPLIER INVOICE
 */
router.delete('/supplier-invoices/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { error } = await supabase
      .from('supplier_invoices')
      .delete()
      .eq('id', id)
      .eq('created_by', userId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Supplier invoice deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting supplier invoice:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to delete supplier invoice' 
    });
  }
});

/**
 * GET SUPPLIER INVOICES STATISTICS SUMMARY
 */
router.get('/supplier-invoices/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('supplier_invoices')
      .select('id, amount, status, created_at')
      .eq('created_by', userId);

    if (error) throw error;

    const stats = {
      total_invoices: data?.length || 0,
      pending_count: data?.filter(inv => inv.status === 'pending').length || 0,
      sent_to_accounting_count: data?.filter(inv => inv.status === 'sent_to_accounting').length || 0,
      processed_count: data?.filter(inv => inv.status === 'processed').length || 0,
      rejected_count: data?.filter(inv => inv.status === 'rejected').length || 0,
      total_amount: data?.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0) || 0,
      average_amount: data?.length > 0 
        ? (data.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0) / data.length)
        : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch statistics' 
    });
  }
});

export default router;
