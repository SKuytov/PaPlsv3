import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// PAYMENT RECORDS ENDPOINTS
// ============================================================

// POST: Create payment record
router.post('/payments', async (req, res) => {
  try {
    const { request_id, amount, payment_method, payment_reference, payment_date, notes, user_id } = req.body;

    if (!request_id || !amount || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: request_id, amount, user_id' 
      });
    }

    const { data, error } = await supabase
      .from('payment_records')
      .insert([{
        request_id,
        amount,
        payment_status: 'PENDING',
        payment_method,
        payment_reference: payment_reference || `PAY-${Date.now()}`,
        payment_date,
        processed_by: user_id,
        notes,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    // Update request status
    await supabase
      .from('item_requests')
      .update({ payment_status: 'PENDING' })
      .eq('id', request_id);

    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get payments for a request
router.get('/payments/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('payment_records')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Process payment (mark as processed)
router.patch('/payments/:paymentId/process', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { payment_date, notes } = req.body;

    const { data, error } = await supabase
      .from('payment_records')
      .update({
        payment_status: 'PROCESSED',
        payment_date: payment_date || new Date().toISOString(),
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select();

    if (error) throw error;

    // Update request status
    if (data.length > 0) {
      const payment = data[0];
      await supabase
        .from('item_requests')
        .update({ payment_status: 'PROCESSED' })
        .eq('id', payment.request_id);
    }

    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Update payment
router.patch('/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { payment_method, payment_reference, notes, payment_status } = req.body;

    const { data, error } = await supabase
      .from('payment_records')
      .update({
        payment_method,
        payment_reference,
        notes,
        payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Cancel payment
router.delete('/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const { data } = await supabase
      .from('payment_records')
      .select('request_id')
      .eq('id', paymentId)
      .single();

    // Delete payment
    const { error } = await supabase
      .from('payment_records')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;

    // Reset request payment status
    if (data) {
      await supabase
        .from('item_requests')
        .update({ payment_status: 'PENDING' })
        .eq('id', data.request_id);
    }

    res.json({ success: true, message: 'Payment cancelled successfully' });
  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Get all payments (accountant/admin)
router.get('/payments', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    let query = supabase.from('payment_records').select('*');
    
    if (status) {
      query = query.eq('payment_status', status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Payment summary/statistics
router.get('/payments/stats/summary', async (req, res) => {
  try {
    // Get payment totals by status
    const { data: payments, error } = await supabase
      .from('payment_records')
      .select('payment_status, amount');

    if (error) throw error;

    const summary = {
      total_payments: payments.length,
      total_amount: 0,
      pending: { count: 0, amount: 0 },
      processed: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 }
    };

    payments.forEach(payment => {
      summary.total_amount += payment.amount;
      if (payment.payment_status === 'PENDING') {
        summary.pending.count++;
        summary.pending.amount += payment.amount;
      } else if (payment.payment_status === 'PROCESSED') {
        summary.processed.count++;
        summary.processed.amount += payment.amount;
      } else if (payment.payment_status === 'CANCELLED') {
        summary.cancelled.count++;
        summary.cancelled.amount += payment.amount;
      }
    });

    res.json(summary);
  } catch (error) {
    console.error('Payment summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;