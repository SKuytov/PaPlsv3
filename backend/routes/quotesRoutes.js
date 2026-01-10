import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// SUPPLIER QUOTES ENDPOINTS
// ============================================================

// POST: Create supplier quote
router.post('/quotes', async (req, res) => {
  try {
    const { request_id, supplier_name, total_amount, quote_pdf_url, notes, user_id } = req.body;

    // Validate required fields
    if (!request_id || !supplier_name || !total_amount || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: request_id, supplier_name, total_amount, user_id' 
      });
    }

    const { data, error } = await supabase
      .from('supplier_quotes')
      .insert([{
        request_id,
        supplier_name,
        total_amount,
        quote_pdf_url,
        notes,
        created_by: user_id,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    // Update request status
    await supabase
      .from('item_requests')
      .update({ quote_status: 'PENDING' })
      .eq('id', request_id);

    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get quotes for a request
router.get('/quotes/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('supplier_quotes')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Select a quote
router.patch('/quotes/:quoteId/select', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { request_id } = req.body;

    // Deselect all other quotes for this request
    await supabase
      .from('supplier_quotes')
      .update({ is_selected: false })
      .eq('request_id', request_id);

    // Select this quote
    const { data, error } = await supabase
      .from('supplier_quotes')
      .update({ is_selected: true })
      .eq('id', quoteId)
      .select();

    if (error) throw error;

    // Update request status
    await supabase
      .from('item_requests')
      .update({ quote_status: 'SELECTED' })
      .eq('id', request_id);

    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Select quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Update quote
router.patch('/quotes/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { supplier_name, total_amount, quote_pdf_url, notes } = req.body;

    const { data, error } = await supabase
      .from('supplier_quotes')
      .update({
        supplier_name,
        total_amount,
        quote_pdf_url,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Delete quote
router.delete('/quotes/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;

    const { error } = await supabase
      .from('supplier_quotes')
      .delete()
      .eq('id', quoteId);

    if (error) throw error;
    res.json({ success: true, message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get all quotes (admin)
router.get('/quotes', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('supplier_quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get all quotes error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;