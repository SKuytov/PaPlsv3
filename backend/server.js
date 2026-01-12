import express from 'express';
import https from 'https';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import quoteRoutes from './routes/quoteRoutes.js';
import authRoutes from './routes/authRoutes.js';
import inventoryRoutes from './routes/inventory.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import quotesRoutes from './routes/quotesRoutes.js';
import quoteRequestsRoutes from './routes/quoteRequestsRoutes.js';
import ordersRoutes from './routes/ordersRoutes.js';
import invoicesRoutes from './routes/invoicesRoutes.js';
import supplierInvoicesRoutes from './routes/supplierInvoicesRoutes.js';
import paymentsRoutes from './routes/paymentsRoutes.js';
import bladeRoutes from './routes/bladeRoutes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Define upload directory on Ubuntu server
const UPLOAD_DIR = '/var/www/docs';

// Ensure upload directory exists with proper permissions
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o755 });
    console.log(`✅ Upload directory created: ${UPLOAD_DIR}`);
  } catch (err) {
    console.error(`❌ Failed to create upload directory: ${err.message}`);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const fileExt = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2)}${fileExt}`;
    cb(null, uniqueName);
  }
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    upload_dir: UPLOAD_DIR,
    services: {
      express: 'running',
      multer: 'configured',
      quote_api: 'active',
      auth_api: 'active',
      rfid_auth: 'enabled',
      inventory_api: 'active',
      supplier_invoices: 'active',
      quote_requests: 'active',
      blade_lifecycle: 'active'
    }
  });
});

// ============================================================
// MOUNT ROUTES
// ============================================================

app.use('/api', quoteRoutes);
app.use('/api', authRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', quotesRoutes);
app.use('/api', quoteRequestsRoutes);
app.use('/api', ordersRoutes);
app.use('/api', invoicesRoutes);
app.use('/api', supplierInvoicesRoutes);
app.use('/api', paymentsRoutes);
app.use('/api', bladeRoutes);

// ============================================================
// LEGACY DOCUMENT ENDPOINTS (KEPT FOR COMPATIBILITY)
// ============================================================

// POST: Upload document to server
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, description, category_id, uploaded_by } = req.body;

    // Validate required fields
    if (!name || !category_id || !uploaded_by) {
      // Clean up uploaded file if validation fails
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn('Warning: Could not delete file on validation failure');
      });
      return res.status(400).json({ error: 'Missing required fields: name, category_id, uploaded_by' });
    }

    // Extract file extension
    const fileExt = path.extname(req.file.filename).substring(1);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully to server',
      data: {
        file_path: req.file.filename,
        file_name: name,
        file_size: req.file.size,
        file_type: fileExt,
        server_path: `/var/www/docs/${req.file.filename}`,
        uploaded_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn('Warning: Could not delete file on error');
      });
    }
    res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// GET: Download document
app.get('/api/documents/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Sanitize filename to prevent path traversal attacks
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(UPLOAD_DIR, filename);

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send file
    res.download(filePath, (err) => {
      if (err && err.code !== 'ERR_HTTP_HEADERS_SENT') {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || 'Download failed' });
  }
});

// DELETE: Delete document from server
app.delete('/api/documents/delete/:filename', (req, res) => {
  try {
    const filename = req.params.filename;

    // Sanitize filename
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message || 'Delete failed' });
  }
});

// ============================================================
// ERROR HANDLING
// ============================================================

// Error handling middleware for multer
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(413).json({ error: 'File too large (max 500MB)' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ============================================================
// START SERVER (WITH HTTPS SUPPORT)
// ============================================================

const PORT = process.env.PORT || 5000;
const protocol = process.env.USE_HTTPS === 'true' ? 'https' : 'http';

// Try to load SSL certificates
let httpsOptions = null;
const certPath = '/etc/letsencrypt/live/partpulse.eu/fullchain.pem';
const keyPath = '/etc/letsencrypt/live/partpulse.eu/privkey.pem';

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  try {
    httpsOptions = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
    console.log(`✅ SSL certificates loaded from Let's Encrypt`);
  } catch (err) {
    console.warn(`⚠️  Could not load SSL certificates: ${err.message}`);
    console.warn(`⚠️  Backend will run on HTTP`);
  }
}

// Start server
if (httpsOptions && protocol === 'https') {
  https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Backend server running on HTTPS port ${PORT}`);
    console.log(`🔒 SSL Certificate: Let's Encrypt`);
    console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
    console.log(`🏆 API ready at https://partpulse.eu:${PORT}/api`);
    console.log(`\n📋 Available Endpoints:`);
    console.log(`   🏥 HEALTH & SYSTEM`);
    console.log(`   GET    /api/health                          - Health check`);
    console.log(`\n   🔪 BLADE LIFECYCLE TRACKING`);
    console.log(`   GET    /api/blade-types                     - List blade types`);
    console.log(`   POST   /api/blade-types                     - Create blade type`);
    console.log(`   GET    /api/blade-types/:id                 - Get blade type`);
    console.log(`   PUT    /api/blade-types/:id                 - Update blade type`);
    console.log(`   DELETE /api/blade-types/:id                 - Delete blade type`);
    console.log(`   GET    /api/blades                           - List blades`);
    console.log(`   POST   /api/blades                           - Create blade`);
    console.log(`   GET    /api/blades/:id                       - Get blade details`);
    console.log(`   PUT    /api/blades/:id                       - Update blade`);
    console.log(`   DELETE /api/blades/:id                       - Delete blade`);
    console.log(`   GET    /api/blades/search/:serial            - Search by serial`);
    console.log(`   POST   /api/blades/:id/usage-logs            - Log usage`);
    console.log(`   GET    /api/blades/:id/usage-logs            - Get usage history`);
    console.log(`   POST   /api/blades/:id/sharpen              - Record sharpening`);
    console.log(`   GET    /api/blades/:id/sharpening-history   - Get sharpening history`);
    console.log(`   GET    /api/blades/:id/alerts               - Get alerts`);
    console.log(`   POST   /api/blades/:id/alerts/:alertId/resolve - Resolve alert`);
    console.log(`   GET    /api/blades/stats/overview           - Get statistics`);
    console.log(`\n   📋 QUOTE REQUESTS`);
    console.log(`   POST   /api/quote-requests                  - Create quote request`);
    console.log(`   GET    /api/quote-requests                  - List quote requests`);
    console.log(`   GET    /api/quote-requests/:id              - Get quote request`);
    console.log(`   PATCH  /api/quote-requests/:id              - Update quote request`);
    console.log(`   DELETE /api/quote-requests/:id              - Delete quote request`);
    console.log(`\n   💰 SUPPLIER INVOICES`);
    console.log(`   POST   /api/supplier-invoices               - Log supplier invoice`);
    console.log(`   GET    /api/supplier-invoices               - List supplier invoices`);
    console.log(`   GET    /api/supplier-invoices/:id           - Get invoice details`);
    console.log(`   PATCH  /api/supplier-invoices/:id           - Update invoice`);
    console.log(`   POST   /api/supplier-invoices/:id/send-to-accounting - Send to accounting`);
    console.log(`   DELETE /api/supplier-invoices/:id           - Delete invoice`);
    console.log(`   GET    /api/supplier-invoices/stats/summary - Invoice statistics`);
    console.log(`\n   📊 EXISTING MODULES`);
    console.log(`   POST   /api/parts                           - Create new part`);
    console.log(`   GET    /api/parts?q=search                  - Search parts`);
    console.log(`   POST   /api/auth/rfid-login                 - RFID technician login`);
    console.log(`   POST   /api/auth/rfid-logout                - RFID technician logout`);
    console.log(`   POST   /api/inventory/restock               - Restock inventory item`);
    console.log(`   GET    /api/inventory/restock-history       - Get restock audit log`);
    console.log(`   POST   /api/quotes                          - Create supplier quote`);
    console.log(`   GET    /api/quotes/:requestId               - Get quotes for request`);
    console.log(`   PATCH  /api/quotes/:quoteId/select          - Select a quote`);
    console.log(`   POST   /api/orders                          - Create purchase order`);
    console.log(`   GET    /api/orders/:requestId               - Get orders for request`);
    console.log(`   POST   /api/invoices                        - Create invoice checklist`);
    console.log(`   GET    /api/invoices/:requestId             - Get invoice checklist`);
    console.log(`   POST   /api/payments                        - Create payment record`);
    console.log(`   GET    /api/payments/:requestId             - Get payments for request`);
    console.log(`${'='.repeat(70)}\n`);
  });
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Backend server running on HTTP port ${PORT}`);
    console.log(`⚠️  WARNING: Running without SSL! Use HTTPS in production!`);
    console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
    console.log(`🏆 API ready at http://partpulse.eu:${PORT}/api`);
    console.log(`\n📋 Available Endpoints:`);
    console.log(`   🏥 HEALTH & SYSTEM`);
    console.log(`   GET    /api/health                          - Health check`);
    console.log(`\n   🔪 BLADE LIFECYCLE TRACKING`);
    console.log(`   GET    /api/blade-types                     - List blade types`);
    console.log(`   POST   /api/blade-types                     - Create blade type`);
    console.log(`   GET    /api/blade-types/:id                 - Get blade type`);
    console.log(`   PUT    /api/blade-types/:id                 - Update blade type`);
    console.log(`   DELETE /api/blade-types/:id                 - Delete blade type`);
    console.log(`   GET    /api/blades                           - List blades`);
    console.log(`   POST   /api/blades                           - Create blade`);
    console.log(`   GET    /api/blades/:id                       - Get blade details`);
    console.log(`   PUT    /api/blades/:id                       - Update blade`);
    console.log(`   DELETE /api/blades/:id                       - Delete blade`);
    console.log(`   GET    /api/blades/search/:serial            - Search by serial`);
    console.log(`   POST   /api/blades/:id/usage-logs            - Log usage`);
    console.log(`   GET    /api/blades/:id/usage-logs            - Get usage history`);
    console.log(`   POST   /api/blades/:id/sharpen              - Record sharpening`);
    console.log(`   GET    /api/blades/:id/sharpening-history   - Get sharpening history`);
    console.log(`   GET    /api/blades/:id/alerts               - Get alerts`);
    console.log(`   POST   /api/blades/:id/alerts/:alertId/resolve - Resolve alert`);
    console.log(`   GET    /api/blades/stats/overview           - Get statistics`);
    console.log(`\n   📋 QUOTE REQUESTS`);
    console.log(`   POST   /api/quote-requests                  - Create quote request`);
    console.log(`   GET    /api/quote-requests                  - List quote requests`);
    console.log(`   GET    /api/quote-requests/:id              - Get quote request`);
    console.log(`   PATCH  /api/quote-requests/:id              - Update quote request`);
    console.log(`   DELETE /api/quote-requests/:id              - Delete quote request`);
    console.log(`\n   💰 SUPPLIER INVOICES`);
    console.log(`   POST   /api/supplier-invoices               - Log supplier invoice`);
    console.log(`   GET    /api/supplier-invoices               - List supplier invoices`);
    console.log(`   GET    /api/supplier-invoices/:id           - Get invoice details`);
    console.log(`   PATCH  /api/supplier-invoices/:id           - Update invoice`);
    console.log(`   POST   /api/supplier-invoices/:id/send-to-accounting - Send to accounting`);
    console.log(`   DELETE /api/supplier-invoices/:id           - Delete invoice`);
    console.log(`   GET    /api/supplier-invoices/stats/summary - Invoice statistics`);
    console.log(`\n   📊 EXISTING MODULES`);
    console.log(`   POST   /api/parts                           - Create new part`);
    console.log(`   GET    /api/parts?q=search                  - Search parts`);
    console.log(`   POST   /api/auth/rfid-login                 - RFID technician login`);
    console.log(`   POST   /api/auth/rfid-logout                - RFID technician logout`);
    console.log(`   POST   /api/inventory/restock               - Restock inventory item`);
    console.log(`   GET    /api/inventory/restock-history       - Get restock audit log`);
    console.log(`   POST   /api/quotes                          - Create supplier quote`);
    console.log(`   GET    /api/quotes/:requestId               - Get quotes for request`);
    console.log(`   PATCH  /api/quotes/:quoteId/select          - Select a quote`);
    console.log(`   POST   /api/orders                          - Create purchase order`);
    console.log(`   GET    /api/orders/:requestId               - Get orders for request`);
    console.log(`   POST   /api/invoices                        - Create invoice checklist`);
    console.log(`   GET    /api/invoices/:requestId             - Get invoice checklist`);
    console.log(`   POST   /api/payments                        - Create payment record`);
    console.log(`   GET    /api/payments/:requestId             - Get payments for request`);
    console.log(`${'='.repeat(70)}\n`);
  });
}

export default app;