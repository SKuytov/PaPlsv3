#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         PaPlsv3 Backend API Setup Script                       ║"
echo "║         For Ubuntu Server at /var/www/html                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}Step 1: Setting up backend directory...${NC}"
cd /root
mkdir -p backend
cd backend

echo -e "${GREEN}✓ Backend directory created at /root/backend${NC}"

echo ""
echo -e "${YELLOW}Step 2: Creating package.json...${NC}"
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
echo -e "${GREEN}✓ package.json created${NC}"

echo ""
echo -e "${YELLOW}Step 3: Installing npm dependencies...${NC}"
npm install > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Step 4: Creating server.js...${NC}"
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
  limits: { fileSize: 500 * 1024 * 1024 },
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
  console.log(`🔗 API endpoints:`);
  console.log(`   POST   http://localhost:5000/api/documents/upload`);
  console.log(`   GET    http://localhost:5000/api/documents/download/:filename`);
  console.log(`   DELETE http://localhost:5000/api/documents/delete/:filename`);
  console.log(`   GET    http://localhost:5000/api/health\n`);
});
EOF
echo -e "${GREEN}✓ server.js created${NC}"

echo ""
echo -e "${YELLOW}Step 5: Updating Nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name partpulse.eu www.partpulse.eu localhost;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    client_max_body_size 500M;

    location / {
        try_files $uri $uri/ /index.html;
    }

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

        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF
echo -e "${GREEN}✓ Nginx configuration updated${NC}"

echo ""
echo -e "${YELLOW}Step 6: Testing Nginx configuration...${NC}"
if sudo nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${YELLOW}✗ Nginx configuration has issues - check manually${NC}"
fi

echo ""
echo -e "${YELLOW}Step 7: Updating frontend CSP...${NC}"
if [ -f /var/www/html/index.html ]; then
    # Create backup
    sudo cp /var/www/html/index.html /var/www/html/index.html.backup
    echo -e "${GREEN}✓ Backup created${NC}"
    
    # Update CSP in index.html
    sudo sed -i 's|connect-src.*\'self\' https:|connect-src \'self\' https: http://localhost:5000 http://127.0.0.1:5000 https://partpulse.eu:|g' /var/www/html/index.html
    echo -e "${GREEN}✓ CSP updated in index.html${NC}"
fi

echo ""
echo -e "${YELLOW}Step 8: Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2 > /dev/null 2>&1
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    echo -e "${GREEN}✓ PM2 already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 9: Starting backend with PM2...${NC}"
cd /root/backend
pm2 start server.js --name "doc-api" > /dev/null 2>&1
pm2 startup > /dev/null 2>&1
pm2 save > /dev/null 2>&1
echo -e "${GREEN}✓ Backend started with PM2${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Verify backend is running:"
echo "   ${YELLOW}curl http://localhost:5000/api/health${NC}"
echo ""
echo "2. Clear browser cache:"
echo "   - Press Ctrl+Shift+Delete"
echo "   - Select 'Cached images and files'"
echo "   - Click Clear"
echo ""
echo "3. Open your app:"
echo "   ${YELLOW}https://partpulse.eu${NC}"
echo ""
echo "4. Go to Documentation > File Repository"
echo ""
echo "5. Click 'Upload File' and test upload"
echo ""
echo "6. Verify file was saved:"
echo "   ${YELLOW}ls -la /var/www/docs/${NC}"
echo ""
echo "📝 View logs:"
echo "   ${YELLOW}pm2 logs doc-api${NC}"
echo ""
echo "🔧 Restart backend:"
echo "   ${YELLOW}pm2 restart doc-api${NC}"
echo ""
echo "⚙️  View backend status:"
echo "   ${YELLOW}pm2 status${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
