import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET ALL QUOTE REQUESTS
 * Query params: status, limit, offset
 */
router.get('/quote-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('quote_requests')
      .select('*', { count: 'exact' })
      .eq('created_by', userId);

    if (status) query = query.eq('status', status);

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
    console.error('Error fetching quote requests:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch quote requests' 
    });
  }
});

/**
 * GET SINGLE QUOTE REQUEST
 */
router.get('/quote-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('quote_requests')
      .select('*')
      .eq('id', id)
      .eq('created_by', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Quote request not found' });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error fetching quote request:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch quote request' 
    });
  }
});

/**
 * CREATE NEW QUOTE REQUEST
 */
router.post('/quote-requests', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority = 'normal', budget, required_by_date } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!title?.trim() || !description?.trim() || !budget) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, budget'
      });
    }

    if (isNaN(budget) || parseFloat(budget) <= 0) {
      return res.status(400).json({
        error: 'Budget must be a positive number'
      });
    }

    const { data, error } = await supabase
      .from('quote_requests')
      .insert([{
        title: title.trim(),
        description: description.trim(),
        priority: ['critical', 'high', 'normal', 'low'].includes(priority) ? priority : 'normal',
        budget: parseFloat(budget),
        required_by_date: required_by_date || null,
        status: 'open',
        created_by: userId
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Quote request created successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('Error creating quote request:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to create quote request' 
    });
  }
});

/**
 * UPDATE QUOTE REQUEST
 */
router.patch('/quote-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { status, notes, title, description, priority, budget } = req.body;

    // Build update object
    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (priority) updateData.priority = priority;
    if (budget) updateData.budget = parseFloat(budget);

    const { data, error } = await supabase
      .from('quote_requests')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', userId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Quote request not found' });
    }

    res.json({
      success: true,
      message: 'Quote request updated successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('Error updating quote request:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to update quote request' 
    });
  }
});

/**
 * DELETE QUOTE REQUEST
 */
router.delete('/quote-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { error } = await supabase
      .from('quote_requests')
      .delete()
      .eq('id', id)
      .eq('created_by', userId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Quote request deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting quote request:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to delete quote request' 
    });
  }
});

export default router;
