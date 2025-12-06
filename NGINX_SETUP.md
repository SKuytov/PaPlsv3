# 🚀 Nginx Setup for PaPlsv3 with Backend API

## Current Status

✅ Your app is deployed at: `/var/www/html/`
✅ Nginx is running and serving files
✅ You have `/var/www/docs/` directory ready for uploads
❌ Backend API server (port 5000) not running yet
❌ CSP not configured in Nginx

---

## Step 1: Update Nginx Configuration

Edit the Nginx config to:
1. Add CORS headers for API
2. Proxy API requests to backend
3. Fix CSP to allow API calls

### Edit Nginx Default Site

```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the entire file with this:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name partpulse.eu www.partpulse.eu localhost;

    # Root directory for static files
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    # Maximum upload size
    client_max_body_size 500M;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Verify Nginx Config

```bash
sudo nginx -t
# Should output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Reload Nginx

```bash
sudo systemctl reload nginx
sudo systemctl status nginx
```

---

## Step 2: Create Backend Directory Structure

```bash
# Navigate to root
cd /root

# Create backend directory
mkdir -p backend
cd backend

# Create package.json
cat > package.json << 'EOF'
{
  "name": "document-upload-api",
  "version": "1.0.0",
  "description": "Document upload API for PaPlsv3",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1"
  }
}
EOF

# Install dependencies
npm install
```

---

## Step 3: Create Backend Server

```bash
# Create server.js in /root/backend/
cat > server.js << 'EOF'
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5000;

const UPLOAD_DIR = '/var/www/docs';

// Middleware
app.use(cors());
app.use(express.json());

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${sanitized}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/gif',
      'text/plain',
      'text/csv'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uploadDir: UPLOAD_DIR,
    uptime: process.uptime()
  });
});

app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const { category = 'General', description = '' } = req.body;

  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    path: `/var/www/docs/${req.file.filename}`,
    url: `/api/documents/download/${req.file.filename}`,
    category,
    description,
    uploadedAt: new Date().toISOString()
  });
});

app.get('/api/documents/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Security: prevent path traversal
  if (!filepath.startsWith(UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filepath);
});

app.delete('/api/documents/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Security: prevent path traversal
  if (!filepath.startsWith(UPLOAD_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlinkSync(filepath);
  res.json({ success: true, message: 'File deleted' });
});

app.listen(PORT, () => {
  console.log(`\n✅ Backend server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🔌 API endpoints:`);
  console.log(`   POST   /api/documents/upload`);
  console.log(`   GET    /api/documents/download/:filename`);
  console.log(`   DELETE /api/documents/delete/:filename`);
  console.log(`   GET    /api/health\n`);
});
EOF
```

---

## Step 4: Update Frontend index.html

Edit `/var/www/html/index.html` and update the CSP meta tag:

```bash
sudo nano /var/www/html/index.html
```

Find this line:
```html
<meta http-equiv="Content-Security-Policy" content="..."
```

Replace with:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https: http://localhost:5000 http://127.0.0.1:5000;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
"/>
```

---

## Step 5: Start Backend Server

### Option A: Simple Start (for testing)

```bash
cd /root/backend
node server.js

# Should output:
# ✅ Backend server running on port 5000
# 📁 Upload directory: /var/www/docs
# ...
```

### Option B: Use PM2 (Production)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend
cd /root/backend
pm2 start server.js --name "doc-api"

# Enable auto-restart on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs doc-api
```

### Option C: Use Systemd (Production)

```bash
# Create systemd service
sudo tee /etc/systemd/system/paplsv3-api.service > /dev/null << 'EOF'
[Unit]
Description=PaPlsv3 Document API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/backend
ExecStart=/usr/bin/node /root/backend/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable paplsv3-api
sudo systemctl start paplsv3-api
sudo systemctl status paplsv3-api

# View logs
sudo journalctl -u paplsv3-api -f
```

---

## Step 6: Test Everything

### Test Backend Health

```bash
curl http://localhost:5000/api/health

# Should return:
# {"status":"ok","timestamp":"...","uploadDir":"/var/www/docs","uptime":...}
```

### Test Frontend

1. Open http://partpulse.eu (or your domain)
2. Login to app
3. Go to **Documentation > File Repository**
4. Click **Upload File**
5. Select a document
6. Fill in details
7. Click **Upload**

### Verify File Upload

```bash
ls -la /var/www/docs/

# Should show your uploaded files
```

---

## Complete Quick Start

Run all commands in sequence:

```bash
# 1. Setup backend directory
cd /root
mkdir -p backend
cd backend

# 2. Create package.json
cat > package.json << 'EOF'
{"name":"document-upload-api","version":"1.0.0","type":"module","dependencies":{"express":"^4.18.2","cors":"^2.8.5","multer":"^1.4.5-lts.1","dotenv":"^16.3.1"}}
EOF

# 3. Install npm dependencies
npm install

# 4. Copy server.js (see Step 3 above)
# ... (create server.js file)

# 5. Update Nginx (see Step 1 above)
# sudo nano /etc/nginx/sites-available/default
# (update with config from Step 1)

# 6. Reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# 7. Start backend with PM2
sudo npm install -g pm2
pm2 start server.js --name "doc-api"
pm2 startup
pm2 save

# 8. Test
curl http://localhost:5000/api/health

# 9. Refresh browser
# Open http://partpulse.eu
# Clear cache (Ctrl+Shift+Delete)
# Try upload
```

---

## Troubleshooting

### Backend not starting

```bash
cd /root/backend
node server.js
# Check error message
```

### Port 5000 already in use

```bash
# Find what's using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

### Upload still failing

1. **Check Nginx is running:**
   ```bash
   sudo systemctl status nginx
   sudo systemctl restart nginx
   ```

2. **Check backend is running:**
   ```bash
   pm2 status
   # or
   curl http://localhost:5000/api/health
   ```

3. **Check directory permissions:**
   ```bash
   sudo chmod 755 /var/www/docs
   sudo chown -R www-data:www-data /var/www/docs
   ```

4. **Check browser console:**
   - Press F12
   - Click Console tab
   - Look for CSP errors
   - Look for network errors (Network tab)

---

## Files Modified

- ✅ `/etc/nginx/sites-available/default` - Added API proxy
- ✅ `/var/www/html/index.html` - Updated CSP
- ✅ `/root/backend/` - New directory
- ✅ `/root/backend/server.js` - New file
- ✅ `/root/backend/package.json` - New file

---

You're all set! 🚀
