import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// INVOICE CHECKLIST ENDPOINTS
// ============================================================

// POST: Create invoice checklist
router.post('/invoices', async (req, res) => {
  try {
    const { request_id, invoice_file_url, user_id } = req.body;

    if (!request_id || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: request_id, user_id' 
      });
    }

    const { data, error } = await supabase
      .from('invoice_checklist')
      .insert([{
        request_id,
        invoice_file_url,
        items_received: false,
        quantities_verified: false,
        invoice_matches_po: false,
        prices_verified: false,
        no_damages: false,
        documentation_complete: false,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    // Update request status
    await supabase
      .from('item_requests')
      .update({ invoice_status: 'PENDING' })
      .eq('id', request_id);

    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get invoice checklist for a request
router.get('/invoices/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('invoice_checklist')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    res.json(data || null);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Update invoice checklist
router.patch('/invoices/:invoiceId/checklist', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { 
      items_received, 
      quantities_verified, 
      invoice_matches_po, 
      prices_verified, 
      no_damages, 
      documentation_complete,
      checklist_notes,
      user_id
    } = req.body;

    // Calculate if all items are checked
    const allChecked = items_received && quantities_verified && invoice_matches_po && 
                       prices_verified && no_damages && documentation_complete;

    const { data, error } = await supabase
      .from('invoice_checklist')
      .update({
        items_received,
        quantities_verified,
        invoice_matches_po,
        prices_verified,
        no_damages,
        documentation_complete,
        checklist_notes,
        verified_by: allChecked ? user_id : null,
        verified_at: allChecked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select();

    if (error) throw error;

    // If invoice verified, update request status
    if (allChecked && data.length > 0) {
      const invoice = data[0];
      await supabase
        .from('item_requests')
        .update({ invoice_status: 'VERIFIED' })
        .eq('id', invoice.request_id);
    }

    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Update invoice checklist error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get invoice progress (checklist items status)
router.get('/invoices/:invoiceId/progress', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const { data, error } = await supabase
      .from('invoice_checklist')
      .select(`
        items_received,
        quantities_verified,
        invoice_matches_po,
        prices_verified,
        no_damages,
        documentation_complete
      `)
      .eq('id', invoiceId)
      .single();

    if (error) throw error;

    // Calculate progress percentage
    const checkedItems = Object.values(data).filter(v => v === true).length;
    const totalItems = Object.keys(data).length;
    const progress = Math.round((checkedItems / totalItems) * 100);

    res.json({
      progress,
      checked_items: checkedItems,
      total_items: totalItems,
      checklist: data
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Update invoice file
router.patch('/invoices/:invoiceId/file', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { invoice_file_url } = req.body;

    const { data, error } = await supabase
      .from('invoice_checklist')
      .update({ invoice_file_url })
      .eq('id', invoiceId)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get all invoices (admin)
router.get('/invoices', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('invoice_checklist')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;