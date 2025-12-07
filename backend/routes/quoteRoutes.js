import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload directory for quote attachments
const QUOTE_UPLOAD_DIR = '/var/www/docs/quotes';

// Ensure upload directory exists
if (!fs.existsSync(QUOTE_UPLOAD_DIR)) {
  try {
    fs.mkdirSync(QUOTE_UPLOAD_DIR, { recursive: true, mode: 0o755 });
    console.log(`✅ Quote upload directory created: ${QUOTE_UPLOAD_DIR}`);
  } catch (err) {
    console.error(`❌ Failed to create quote upload directory: ${err.message}`);
  }
}

// Configure multer for quote attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, QUOTE_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2)}${fileExt}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit for quote attachments
  }
});

// ============================================================
// PARTS ENDPOINTS
// ============================================================

/**
 * POST /api/parts
 * Create a new spare part
 */
router.post('/parts', async (req, res) => {
  try {
    const { name, sku, category, description } = req.body;

    // Validate required fields
    if (!name || !sku) {
      return res.status(400).json({
        error: 'Missing required fields: name, sku'
      });
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('spare_parts')
      .insert([
        {
          name,
          sku,
          category: category || 'Custom',
          description: description || `Created via quote request on ${new Date().toISOString()}`,
          current_quantity: 0,
          reorder_point: 0,
          unit_cost: 0,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      message: 'Part created successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating part:', error);
    res.status(500).json({ error: error.message || 'Failed to create part' });
  }
});

/**
 * GET /api/parts
 * Search and list spare parts
 * Query parameters: q (search query), limit, offset
 */
router.get('/parts', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0, supplier_id } = req.query;

    let query = supabase
      .from('spare_parts')
      .select('*');

    // Search filter
    if (q) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%`);
    }

    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      data,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch parts' });
  }
});

// ============================================================
// QUOTE ATTACHMENTS ENDPOINTS
// ============================================================

/**
 * POST /api/quote-requests/:id/attachments
 * Upload file attachment to a quote request
 */
router.post('/quote-requests/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { attachment_type = 'clarification' } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get current quote to update attachments array
    const { data: quote, error: fetchError } = await supabase
      .from('quote_requests')
      .select('attachments')
      .eq('id', id)
      .single();

    if (fetchError) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn('Could not delete file on fetch error');
      });
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Prepare attachment data
    const newAttachment = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2)}`,
      filename: req.file.filename,
      original_name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      attachment_type,
      uploaded_at: new Date().toISOString()
    };

    // Update quote with new attachment
    const attachments = quote.attachments || [];
    attachments.push(newAttachment);

    const { data: updated, error: updateError } = await supabase
      .from('quote_requests')
      .update({ attachments })
      .eq('id', id)
      .select();

    if (updateError) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn('Could not delete file on update error');
      });
      return res.status(400).json({ error: updateError.message });
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        attachment_id: newAttachment.id,
        filename: newAttachment.filename,
        size: newAttachment.size,
        type: newAttachment.type,
        uploaded_at: newAttachment.uploaded_at
      }
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn('Could not delete file on error');
      });
    }
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

/**
 * GET /api/quote-requests/:id/attachments
 * Get all attachments for a quote request
 */
router.get('/quote-requests/:id/attachments', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: quote, error } = await supabase
      .from('quote_requests')
      .select('attachments')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const attachments = quote.attachments || [];

    res.json({
      success: true,
      data: attachments,
      count: attachments.length
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch attachments' });
  }
});

/**
 * DELETE /api/quote-requests/:id/attachments/:fileId
 * Delete a specific attachment from a quote request
 */
router.delete('/quote-requests/:id/attachments/:fileId', async (req, res) => {
  try {
    const { id, fileId } = req.params;

    // Get current quote
    const { data: quote, error: fetchError } = await supabase
      .from('quote_requests')
      .select('attachments')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Find and remove attachment
    const attachments = quote.attachments || [];
    const attachmentIndex = attachments.findIndex(a => a.id === fileId);

    if (attachmentIndex === -1) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = attachments[attachmentIndex];
    const filePath = path.join(QUOTE_UPLOAD_DIR, attachment.filename);

    // Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    attachments.splice(attachmentIndex, 1);

    // Update quote
    const { error: updateError } = await supabase
      .from('quote_requests')
      .update({ attachments })
      .eq('id', id);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: error.message || 'Delete failed' });
  }
});

/**
 * GET /api/quote-requests/:id/attachments/:fileId/download
 * Download a specific attachment
 */
router.get('/quote-requests/:id/attachments/:fileId/download', async (req, res) => {
  try {
    const { id, fileId } = req.params;

    // Get quote to verify attachment exists
    const { data: quote, error: fetchError } = await supabase
      .from('quote_requests')
      .select('attachments')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const attachment = (quote.attachments || []).find(a => a.id === fileId);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = path.join(QUOTE_UPLOAD_DIR, attachment.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(filePath, attachment.original_name, (err) => {
      if (err && err.code !== 'ERR_HTTP_HEADERS_SENT') {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: error.message || 'Download failed' });
  }
});

export default router;
