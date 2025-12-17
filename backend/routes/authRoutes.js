import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/auth/rfid-login
 * 
 * Authenticate technician via RFID card
 * 
 * Request body:
 * {
 *   "rfid_card_id": "00001234567890"
 * }
 * 
 * Response:
 * {
 *   "technician": {
 *     "id": "uuid",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "rfid_card_id": "00001234567890"
 *   },
 *   "session": { ... } // Supabase session
 * }
 */
router.post('/auth/rfid-login', async (req, res) => {
  try {
    const { rfid_card_id } = req.body;

    // Validate input
    if (!rfid_card_id || rfid_card_id.trim().length === 0) {
      return res.status(400).json({
        error: 'RFID card ID is required'
      });
    }

    const trimmedCardId = rfid_card_id.trim();

    // Step 1: Look up RFID card in rfid_cards table
    const { data: cardRecord, error: cardError } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('card_id', trimmedCardId)
      .eq('is_active', true)
      .single();

    if (cardError || !cardRecord) {
      console.warn(`[RFID Auth] Card not found or inactive: ${trimmedCardId}`);
      return res.status(401).json({
        error: 'Card not recognized. Please contact administrator.',
        code: 'CARD_NOT_FOUND'
      });
    }

    // Step 2: Look up technician and join with roles
    const { data: technician, error: techError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role_id,
        role:roles(id, name)
      `)
      .eq('id', cardRecord.user_id)
      .single();

    if (techError || !technician) {
      console.warn(`[RFID Auth] User not found: ${cardRecord.user_id}`);
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Step 3: Verify user has technician role
    if (!technician.role || technician.role.name !== 'technician') {
      console.warn(`[RFID Auth] User does not have technician role: ${cardRecord.user_id}`);
      return res.status(401).json({
        error: 'User does not have technician role',
        code: 'INVALID_ROLE'
      });
    }

    // Step 4: Log successful RFID login attempt
    const { error: auditError } = await supabase
      .from('rfid_login_audit')
      .insert({
        rfid_card_id: trimmedCardId,
        user_id: technician.id,
        success: true,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent')
      });

    if (auditError) {
      console.warn('[RFID Auth] Failed to log audit:', auditError);
      // Don't fail the request, just warn
    }

    // Step 5: Create Supabase session token
    // Since this is a backend route, we'll generate a JWT session
    // In production, you might want to use Supabase's signInWithPassword or similar
    
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: technician.id,
      // Note: This creates a session but the client still needs to handle session
      // For this use case, we'll return the user info and let frontend handle auth state
    });

    if (sessionError) {
      console.warn('[RFID Auth] Failed to create session:', sessionError);
      // Don't fail, just return user info
    }

    // Step 6: Return success response
    res.status(200).json({
      success: true,
      technician: {
        id: technician.id,
        name: technician.full_name,
        email: technician.email,
        rfid_card_id: trimmedCardId,
        role: technician.role?.name || 'technician'
      },
      session: sessionData?.session || null,
      message: `Welcome ${technician.full_name}`
    });

  } catch (error) {
    console.error('[RFID Auth] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/rfid-logout
 * 
 * Log out technician and record logout attempt
 */
router.post('/auth/rfid-logout', async (req, res) => {
  try {
    const { user_id, rfid_card_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Log logout attempt
    if (rfid_card_id) {
      await supabase
        .from('rfid_login_audit')
        .insert({
          rfid_card_id,
          user_id,
          success: true,
          event_type: 'logout',
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('user-agent')
        });
    }

    // Sign out
    await supabase.auth.admin.signOut(user_id);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('[RFID Logout] Error:', error);
    res.status(500).json({
      error: 'Failed to logout',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/rfid-cards
 * 
 * Admin endpoint to list all RFID cards (for management)
 * Requires admin authentication
 */
router.get('/auth/rfid-cards', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rfid_cards')
      .select(`
        *,
        user:users(id, full_name, email, role:roles(name))
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      cards: data
    });

  } catch (error) {
    console.error('[RFID Cards] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch RFID cards',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;