import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// DASHBOARD ENDPOINTS
// ============================================================

// GET: User's dashboard data
router.get('/dashboards/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (rolesError) throw rolesError;

    if (!userRoles || userRoles.length === 0) {
      return res.status(403).json({ error: 'User has no assigned roles' });
    }

    const roles = userRoles.map(r => r.role_name);

    // Get dashboard data based on role
    let dashboardData = {
      roles,
      timestamp: new Date().toISOString()
    };

    // Add role-specific data
    if (roles.includes('technician')) {
      const { data: myRequests } = await supabase
        .from('item_requests')
        .select('*')
        .eq('submitter_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      dashboardData.my_requests = myRequests || [];
    }

    if (roles.includes('building_tech')) {
      const { data: pendingApprovals } = await supabase
        .from('request_approvals')
        .select('*, item_requests(*)')
        .eq('approval_role', 'building_tech')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
      dashboardData.pending_approvals = pendingApprovals || [];
    }

    if (roles.includes('maintenance_org')) {
      const { data: quotes } = await supabase
        .from('supplier_quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      dashboardData.quotes = quotes || [];

      const { data: orders } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      dashboardData.orders = orders || [];

      const { data: invoices } = await supabase
        .from('invoice_checklist')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      dashboardData.invoices = invoices || [];
    }

    if (roles.includes('accountant')) {
      const { data: payments } = await supabase
        .from('payment_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      dashboardData.payments = payments || [];
    }

    if (roles.includes('god_admin')) {
      const { data: allRequests } = await supabase
        .from('item_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      dashboardData.all_requests = allRequests || [];
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Dashboard metrics and statistics
router.get('/dashboards/:userId/metrics', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get counts
    const { count: totalRequests } = await supabase
      .from('item_requests')
      .select('*', { count: 'exact', head: true });

    const { count: pendingApprovals } = await supabase
      .from('request_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    const { count: totalQuotes } = await supabase
      .from('supplier_quotes')
      .select('*', { count: 'exact', head: true });

    const { count: totalOrders } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true });

    const { count: pendingPayments } = await supabase
      .from('payment_records')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'PENDING');

    res.json({
      total_requests: totalRequests || 0,
      pending_approvals: pendingApprovals || 0,
      total_quotes: totalQuotes || 0,
      total_orders: totalOrders || 0,
      pending_payments: pendingPayments || 0
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: User dashboard preferences
router.get('/dashboards/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('dashboard_preferences')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Save user dashboard preferences
router.post('/dashboards/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, default_view, filter_priority, sort_by, items_per_page } = req.body;

    const { data, error } = await supabase
      .from('dashboard_preferences')
      .upsert([
        {
          user_id: userId,
          role,
          default_view,
          filter_priority,
          sort_by,
          items_per_page,
          updated_at: new Date().toISOString()
        }
      ],
      { onConflict: 'user_id,role' }
      )
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;