import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// QUOTE REQUESTS ENDPOINTS - PRODUCTION READY
// ============================================================

/**
 * GET /api/quote-requests
 * Fetch all quote requests for the authenticated user
 * Query params: status (optional) - Filter by status (pending, approved, rejected)
 */
router.get('/quote-requests', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { status } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let query = supabase
      .from('quote_requests')
      .select('*, created_by_user:profiles(id, full_name, email)')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      data: data || []
    });
  } catch (err) {
    console.error('❌ Error fetching quote requests:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to fetch quote requests' 
    });
  }
});

/**
 * GET /api/quote-requests/:id
 * Fetch a single quote request by ID
 */
router.get('/quote-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('quote_requests')
      .select('*, created_by_user:profiles(id, full_name, email)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false,
          error: 'Quote request not found' 
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('❌ Error fetching quote request:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to fetch quote request' 
    });
  }
});

/**
 * POST /api/quote-requests
 * Create a new quote request
 * Body: { title, description, priority, budget, notes? }
 */
router.post('/quote-requests', async (req, res) => {
  try {
    const { title, description, priority, budget, notes } = req.body;
    const userId = req.user?.id || req.body.userId;

    // Validation
    if (!title || !description || !priority || !budget) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, priority, budget'
      });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    const budgetValue = parseFloat(budget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'Budget must be a valid positive number'
      });
    }

    const { data, error } = await supabase
      .from('quote_requests')
      .insert([{
        title: title.trim(),
        description: description.trim(),
        priority: priority.toLowerCase(),
        budget: budgetValue,
        notes: notes?.trim() || null,
        status: 'pending',
        created_by: userId,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    console.log(`✅ Quote request created: ${data[0]?.id}`);

    res.status(201).json({
      success: true,
      message: 'Quote request created successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('❌ Error creating quote request:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to create quote request' 
    });
  }
});

/**
 * PATCH /api/quote-requests/:id
 * Update a quote request
 * Body: { status?, notes?, priority? }
 */
router.patch('/quote-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, priority } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (priority) updateData.priority = priority;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('quote_requests')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quote request not found'
      });
    }

    console.log(`✅ Quote request ${id} updated`);

    res.json({
      success: true,
      message: 'Quote request updated successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('❌ Error updating quote request:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to update quote request' 
    });
  }
});

/**
 * DELETE /api/quote-requests/:id
 * Delete a quote request
 */
router.delete('/quote-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('quote_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`✅ Quote request ${id} deleted`);

    res.json({
      success: true,
      message: 'Quote request deleted successfully'
    });
  } catch (err) {
    console.error('❌ Error deleting quote request:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to delete quote request' 
    });
  }
});

export default router;
