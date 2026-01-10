// ============================================================================
// REQUEST API ENDPOINTS
// Complete backend API for item request workflow
// ============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// MIDDLEWARE: Authentication
// ============================================================================
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fetch user role from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      return res.status(500).json({ error: 'Failed to fetch user role' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: userData?.role || 'User'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// ============================================================================
// HELPER: Get approval level from role
// ============================================================================
const getRoleApprovalLevel = (role) => {
  const roleMap = {
    'Building 1 Technician': 1,
    'Building 2 Technician': 1,
    'Building 3 Technician': 1,
    'Building 4 Technician': 1,
    'Building 5 Technician': 1,
    'Maintenance Organizer': 2,
    'Technical Director': 3,
    'God Admin': 4
  };
  return roleMap[role] || null;
};

// ============================================================================
// HELPER: Log activity
// ============================================================================
const logActivity = async (requestId, action, actorId, actorEmail, details = {}) => {
  try {
    await supabase.from('request_activity').insert({
      request_id: requestId,
      action,
      actor_id: actorId,
      actor_email: actorEmail,
      action_details: details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// ============================================================================
// ENDPOINT 1: POST /api/requests
// Create a new draft request
// ============================================================================
router.post('/requests', verifyAuth, async (req, res) => {
  try {
    const { building_id, priority = 'NORMAL', description = '', notes = '' } = req.body;

    if (!building_id) {
      return res.status(400).json({ error: 'building_id is required' });
    }

    const { data, error } = await supabase
      .from('item_requests')
      .insert({
        submitter_id: req.user.id,
        submitter_email: req.user.email,
        building_id,
        priority,
        description,
        notes,
        status: 'DRAFT'
      })
      .select();

    if (error) throw error;

    await logActivity(data[0].id, 'REQUEST_CREATED', req.user.id, req.user.email, {
      priority,
      building_id,
      description
    });

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 2: POST /api/requests/:id/items
// Add item to request
// ============================================================================
router.post('/requests/:id/items', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, quantity, unit, estimated_unit_price, specs } = req.body;

    if (!item_name || !quantity || !unit || estimated_unit_price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Add item
    const { data: itemData, error: itemError } = await supabase
      .from('request_items')
      .insert({
        request_id: id,
        item_name,
        quantity: parseFloat(quantity),
        unit,
        estimated_unit_price: parseFloat(estimated_unit_price),
        specs: specs || null
      })
      .select();

    if (itemError) throw itemError;

    // Update request estimated budget
    const { data: items } = await supabase
      .from('request_items')
      .select('quantity, estimated_unit_price')
      .eq('request_id', id);

    const totalBudget = items.reduce((sum, item) => {
      return sum + (item.quantity * item.estimated_unit_price);
    }, 0);

    await supabase
      .from('item_requests')
      .update({ estimated_budget: totalBudget })
      .eq('id', id);

    await logActivity(id, 'ITEM_ADDED', req.user.id, req.user.email, {
      item_name,
      quantity,
      unit,
      estimated_unit_price
    });

    res.status(201).json(itemData[0]);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 3: POST /api/requests/:id/submit
// Submit request for approval
// ============================================================================
router.post('/requests/:id/submit', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify request has items
    const { data: items, error: itemsError } = await supabase
      .from('request_items')
      .select('id')
      .eq('request_id', id);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Request must have at least one item' });
    }

    // Update request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('item_requests')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (updateError) throw updateError;

    // Create first approval record (Level 1: Building Technician)
    await supabase
      .from('request_approvals')
      .insert({
        request_id: id,
        approval_level: 1,
        approval_role: 'Building Technician',
        status: 'PENDING'
      });

    await logActivity(id, 'REQUEST_SUBMITTED', req.user.id, req.user.email, {
      submitted_at: new Date().toISOString()
    });

    res.json(updatedRequest[0]);
  } catch (error) {
    console.error('Error submitting request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 4: GET /api/requests/:id
// Get request details with items and approvals
// ============================================================================
router.get('/requests/:id', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: request, error: requestError } = await supabase
      .from('item_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError) throw requestError;

    const { data: items } = await supabase
      .from('request_items')
      .select('*')
      .eq('request_id', id);

    const { data: approvals } = await supabase
      .from('request_approvals')
      .select('*')
      .eq('request_id', id)
      .order('approval_level', { ascending: true });

    res.json({
      ...request,
      items: items || [],
      approvals: approvals || []
    });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 5: GET /api/requests
// Get all requests for current user
// ============================================================================
router.get('/requests', verifyAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('item_requests')
      .select('*')
      .eq('submitter_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 6: GET /api/requests/pending-approvals
// Get pending approvals for current user (based on role)
// ============================================================================
router.get('/requests/pending-approvals', verifyAuth, async (req, res) => {
  try {
    const approvalLevel = getRoleApprovalLevel(req.user.role);

    if (!approvalLevel) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('request_approvals')
      .select(
        `
        *,
        item_requests!inner(
          id, request_number, status, priority, description, 
          submitter_email, building_id, estimated_budget, created_at
        )
      `
      )
      .eq('approval_level', approvalLevel)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 7: POST /api/requests/:id/approve
// Approve request and move to next level
// ============================================================================
router.post('/requests/:id/approve', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { comments = '', move_to_next_level = true, edited_fields = {} } = req.body;

    const approvalLevel = getRoleApprovalLevel(req.user.role);
    if (!approvalLevel) {
      return res.status(403).json({ error: 'Your role cannot approve requests' });
    }

    // Update current approval
    const { error: updateError } = await supabase
      .from('request_approvals')
      .update({
        status: 'APPROVED',
        approver_id: req.user.id,
        approver_email: req.user.email,
        comments,
        edited_fields: Object.keys(edited_fields).length > 0 ? edited_fields : null,
        approval_date: new Date().toISOString()
      })
      .eq('request_id', id)
      .eq('approval_level', approvalLevel);

    if (updateError) throw updateError;

    // Update request status based on level
    const statusMap = {
      1: 'BUILDING_APPROVED',
      2: 'MAINTENANCE_APPROVED',
      3: 'DIRECTOR_APPROVED',
      4: 'EXECUTED'
    };

    const newStatus = statusMap[approvalLevel];
    const { data: updatedRequest, error: statusError } = await supabase
      .from('item_requests')
      .update({ status: newStatus })
      .eq('id', id)
      .select();

    if (statusError) throw statusError;

    // Create next level approval if not final level
    if (move_to_next_level && approvalLevel < 4) {
      const nextLevel = approvalLevel + 1;
      const roleMap = {
        2: 'Maintenance Organizer',
        3: 'Technical Director',
        4: 'God Admin'
      };

      await supabase
        .from('request_approvals')
        .insert({
          request_id: id,
          approval_level: nextLevel,
          approval_role: roleMap[nextLevel],
          status: 'PENDING'
        });
    }

    await logActivity(id, 'REQUEST_APPROVED', req.user.id, req.user.email, {
      approval_level: approvalLevel,
      comments,
      moved_to_next: move_to_next_level && approvalLevel < 4
    });

    res.json(updatedRequest[0]);
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 8: POST /api/requests/:id/reject
// Reject request with reason
// ============================================================================
router.post('/requests/:id/reject', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;

    const approvalLevel = getRoleApprovalLevel(req.user.role);
    if (!approvalLevel) {
      return res.status(403).json({ error: 'Your role cannot reject requests' });
    }

    // Update approval
    await supabase
      .from('request_approvals')
      .update({
        status: 'REJECTED',
        approver_id: req.user.id,
        approver_email: req.user.email,
        comments: reason,
        approval_date: new Date().toISOString()
      })
      .eq('request_id', id)
      .eq('approval_level', approvalLevel);

    // Update request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('item_requests')
      .update({ status: 'REJECTED' })
      .eq('id', id)
      .select();

    if (updateError) throw updateError;

    await logActivity(id, 'REQUEST_REJECTED', req.user.id, req.user.email, {
      approval_level: approvalLevel,
      reason
    });

    res.json(updatedRequest[0]);
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 9: PATCH /api/requests/:id/edit
// Edit request by approver
// ============================================================================
router.patch('/requests/:id/edit', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [], description, priority, notes } = req.body;

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('item_requests')
        .update(updateData)
        .eq('id', id);
    }

    // Update items if provided
    if (items.length > 0) {
      for (const item of items) {
        if (item.id) {
          await supabase
            .from('request_items')
            .update({
              quantity: item.quantity,
              estimated_unit_price: item.estimated_unit_price,
              specs: item.specs
            })
            .eq('id', item.id);
        }
      }

      // Recalculate budget
      const { data: allItems } = await supabase
        .from('request_items')
        .select('quantity, estimated_unit_price')
        .eq('request_id', id);

      const totalBudget = allItems.reduce((sum, item) => {
        return sum + (item.quantity * item.estimated_unit_price);
      }, 0);

      await supabase
        .from('item_requests')
        .update({ estimated_budget: totalBudget })
        .eq('id', id);
    }

    const { data, error } = await supabase
      .from('item_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    await logActivity(id, 'REQUEST_EDITED', req.user.id, req.user.email, {
      fields_edited: updateData
    });

    res.json(data);
  } catch (error) {
    console.error('Error editing request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 10: GET /api/requests/:id/activity
// Get full activity/audit trail for request
// ============================================================================
router.get('/requests/:id/activity', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('request_activity')
      .select('*')
      .eq('request_id', id)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENDPOINT 11: POST /api/requests/:id/execute
// Execute request (Admin only)
// ============================================================================
router.post('/requests/:id/execute', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id = null, quote_id = null, assigned_to_email = null } = req.body;

    if (req.user.role !== 'God Admin') {
      return res.status(403).json({ error: 'Only God Admin can execute requests' });
    }

    const { data, error } = await supabase
      .from('item_requests')
      .update({
        status: 'EXECUTED',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    await logActivity(id, 'REQUEST_EXECUTED', req.user.id, req.user.email, {
      supplier_id,
      quote_id,
      assigned_to_email,
      executed_at: new Date().toISOString()
    });

    res.json(data[0]);
  } catch (error) {
    console.error('Error executing request:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
