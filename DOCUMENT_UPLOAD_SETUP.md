# Document Upload Setup - Server-Based Solution

## Overview

This guide explains how to set up the new server-based file upload system for the Documentation module. Files are now uploaded directly to your Ubuntu server at `/var/www/docs` instead of Supabase Storage.

## Prerequisites

- Ubuntu server with SSH access
- Node.js >= 16 installed on server
- npm or yarn package manager
- `/var/www/docs` directory or ability to create it
- Port 5000 available (or configure different port)

## Backend Setup (Ubuntu Server)

### Step 1: Create Upload Directory

```bash
# SSH into your Ubuntu server
ssh user@your-server.com

# Create the upload directory with proper permissions
sudo mkdir -p /var/www/docs
sudo chmod 755 /var/www/docs

# Verify directory exists
ls -la /var/www/
```

### Step 2: Set Up Backend Server

```bash
# Clone or navigate to your project repository
cd /home/user/your-project

# Install dependencies
npm install express cors multer dotenv

# Copy the server.js file to your backend directory
cp backend/server.js .
```

### Step 3: Create Environment File

Create `.env` file in your project root:

```bash
# .env
PORT=5000
FRONTEND_URL=http://your-frontend.com
NODE_ENV=production
```

### Step 4: Start Backend Server

#### Option A: Manual Start (for testing)

```bash
node backend/server.js
```

You should see:
```
✅ Backend server running on port 5000
📁 Upload directory: /var/www/docs
🏆 API ready at http://localhost:5000/api
```

#### Option B: Using PM2 (recommended for production)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start server with PM2
pm2 start backend/server.js --name "document-api"

# Enable auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs document-api
```

#### Option C: Using Systemd (alternative)

Create `/etc/systemd/system/document-api.service`:

```ini
[Unit]
Description=Document Upload API
After=network.target

[Service]
User=www-data
WorkingDirectory=/home/user/your-project
ExecStart=/usr/bin/node /home/user/your-project/backend/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable document-api
sudo systemctl start document-api
sudo systemctl status document-api
```

### Step 5: Configure Nginx (if using reverse proxy)

Add to your Nginx configuration:

```nginx
upstream document_api {
    server localhost:5000;
}

server {
    listen 80;
    server_name your-domain.com;

    # For document uploads (increase if needed)
    client_max_body_size 500M;

    location /api/documents {
        proxy_pass http://document_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_request_buffering off;
        
        # Timeouts for large file uploads
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

Then reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Frontend Setup (React/Vite)

### Step 1: Update Environment Variables

Create `.env.production` file in your project root:

```bash
# .env.production
VITE_API_URL=https://your-domain.com/api
# OR if running on separate port:
VITE_API_URL=https://your-domain.com:5000
```

For development:

```bash
# .env.development
VITE_API_URL=http://localhost:5000
```

### Step 2: Update Vite Config

In `vite.config.js`, ensure environment variables are properly loaded:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
  }
});
```

### Step 3: Test the Upload

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Navigate to Documentation > File Repository

4. Click "Upload File" and test with a small file

## Testing

### Health Check

```bash
# Test backend is running
curl http://localhost:5000/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-12-06T19:58:00Z",
  "uptime": 123.45,
  "upload_dir": "/var/www/docs"
}
```

### Test File Upload

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@test.pdf" \
  -F "name=Test Document" \
  -F "description=Test Description" \
  -F "category_id=1" \
  -F "uploaded_by=user-id"
```

### Verify Files Are Saved

```bash
# Check files on server
ls -la /var/www/docs/

# Check file permissions
stat /var/www/docs/filename
```

## Troubleshooting

### Upload Fails with "Permission Denied"

```bash
# Fix directory permissions
sudo chmod 755 /var/www/docs
sudo chown www-data:www-data /var/www/docs  # if using www-data user
```

### "Cannot find module" errors

```bash
# Make sure all dependencies are installed
cd backend
npm install
```

### CORS Issues

If frontend can't reach backend:

1. Check `FRONTEND_URL` in `.env` on server
2. Verify CORS headers in `backend/server.js`
3. Check firewall/security groups allow port 5000

### 413 Payload Too Large

Nginx has default 1MB limit. Update nginx config:

```nginx
http {
    client_max_body_size 500M;
}
```

### Files Upload But Don't Appear in App

1. Check database record was created:
   ```sql
   SELECT * FROM document_files ORDER BY created_at DESC LIMIT 1;
   ```

2. Verify file exists on server:
   ```bash
   ls -la /var/www/docs/
   ```

3. Check backend logs:
   ```bash
   pm2 logs document-api
   ```

## Performance Optimization

### Enable Compression

In Nginx:

```nginx
gzip on;
gzip_types text/plain application/json;
gzip_min_length 1000;
```

### Set Cache Headers for Downloads

In backend `server.js`:

```javascript
app.get('/api/documents/download/:filename', (req, res) => {
  // ... existing code ...
  res.set('Cache-Control', 'public, max-age=31536000');
});
```

### Monitor Disk Space

```bash
# Check available space
df -h /var/www/docs

# Monitor in real-time
watch -n 1 'df -h /var/www/docs'
```

## Security Recommendations

1. **File Validation**
   - ✅ Already implemented: Only specific MIME types allowed
   - File size limited to 500MB
   - Filename sanitized to prevent path traversal

2. **Access Control**
   - Add authentication to upload endpoint
   - Implement role-based access (already done at app level)
   - Log all file operations

3. **Backup Strategy**
   ```bash
   # Daily backup script
   sudo crontab -e
   # Add: 0 2 * * * tar -czf /backup/docs-$(date +\%Y\%m\%d).tar.gz /var/www/docs
   ```

4. **SSL/TLS**
   - Use HTTPS for all uploads
   - Certificate: Let's Encrypt (free via certbot)

## Maintenance

### Regular Tasks

- **Weekly**: Check server logs for errors
  ```bash
  pm2 logs document-api --lines 100 | grep ERROR
  ```

- **Monthly**: Verify backups are working
  ```bash
  ls -la /backup/ | tail -5
  ```

- **Quarterly**: Test disaster recovery
  - Delete test file from `/var/www/docs`
  - Verify restoration from backup

### Cleanup Old Files

```bash
# Find and delete files older than 30 days (be careful!)
find /var/www/docs -type f -mtime +30 -delete
```

## Database Schema

The `document_files` table now includes:

```sql
- id (UUID)
- name (TEXT) - Document name
- description (TEXT) - Optional description
- category_id (UUID) - Reference to category
- file_path (TEXT) - Filename stored on server
- file_type (TEXT) - File extension
- file_size (BIGINT) - Size in bytes
- uploaded_by (UUID) - User who uploaded
- server_path (TEXT) - Full server path for reference
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Migration from Supabase Storage

If you have existing files in Supabase Storage:

```bash
# Download from Supabase
aws s3 sync s3://your-bucket/documents /var/www/docs

# Update database records
-- Change file_path values in database to match new filenames
UPDATE document_files SET server_path = '/var/www/docs/' || file_path;
```

## Support

For issues:

1. Check `/var/www/docs` has proper permissions
2. Verify backend is running: `pm2 status`
3. Check firewall rules: `sudo ufw status`
4. Review logs: `pm2 logs document-api`
5. Test endpoint: `curl http://localhost:5000/api/health`

## API Endpoints

### Upload Document
```
POST /api/documents/upload
Content-Type: multipart/form-data

Fields:
- file: Binary file data
- name: Document name
- description: Optional description
- category_id: Category UUID
- uploaded_by: User UUID
```

### Download Document
```
GET /api/documents/download/{filename}
```

### Delete Document
```
DELETE /api/documents/delete/{filename}
```

### Health Check
```
GET /api/health
```

---

✅ Setup complete! Your document uploads are now saved to `/var/www/docs` on your Ubuntu server.
