import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import quoteRoutes from './routes/quoteRoutes.js';
import authRoutes from './routes/authRoutes.js';

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
      rfid_auth: 'enabled'
    }
  });
});

// ============================================================
// MOUNT ROUTES
// ============================================================

app.use('/api', quoteRoutes);
app.use('/api', authRoutes);

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
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🏆 API ready at http://localhost:${PORT}/api`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   GET    /api/health                          - Health check`);
  console.log(`   POST   /api/parts                           - Create new part`);
  console.log(`   GET    /api/parts?q=search                  - Search parts`);
  console.log(`   POST   /api/auth/rfid-login                 - RFID technician login`);
  console.log(`   POST   /api/auth/rfid-logout                - RFID technician logout`);
  console.log(`   GET    /api/auth/rfid-cards                 - List RFID cards (admin)`);
  console.log(`   POST   /api/quote-requests/:id/attachments  - Upload quote file`);
  console.log(`   GET    /api/quote-requests/:id/attachments  - Get quote files`);
  console.log(`   DELETE /api/quote-requests/:id/attachments/:fileId - Delete file`);
  console.log(`   GET    /api/quote-requests/:id/attachments/:fileId/download - Download file`);
  console.log(`${'='.repeat(60)}\n`);
});

export default app;
