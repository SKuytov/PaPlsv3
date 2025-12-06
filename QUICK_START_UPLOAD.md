# Quick Start: Document Upload Configuration

## What Changed?

❌ **OLD**: Files uploaded to Supabase Storage (causing errors)
✅ **NEW**: Files uploaded directly to your Ubuntu server at `/var/www/docs`

## 5-Minute Setup

### On Your Ubuntu Server

```bash
# 1. Create the upload directory
sudo mkdir -p /var/www/docs
sudo chmod 755 /var/www/docs

# 2. Install Node.js dependencies (if not already installed)
cd /path/to/your/project
npm install express cors multer dotenv

# 3. Create .env file
echo 'PORT=5000' > .env
echo 'FRONTEND_URL=https://your-domain.com' >> .env
echo 'NODE_ENV=production' >> .env

# 4. Start backend server
node backend/server.js
```

You should see:
```
✅ Backend server running on port 5000
📁 Upload directory: /var/www/docs
```

### On Your Frontend (React/Vite)

```bash
# 1. Update environment file
echo 'VITE_API_URL=http://localhost:5000' > .env.development
echo 'VITE_API_URL=https://your-domain.com' > .env.production

# 2. Start your app
npm run dev

# 3. Test upload in Documentation > File Repository
```

## Test It

```bash
# Check backend is running
curl http://localhost:5000/api/health

# Should return:
# {"status":"ok","upload_dir":"/var/www/docs"}
```

## For Production (Ubuntu Server)

### Option 1: PM2 (Recommended)

```bash
# Install PM2
sudo npm install -g pm2

# Start server
pm2 start backend/server.js --name "doc-api"

# Enable auto-restart
pm2 startup
pm2 save

# View status
pm2 status
```

### Option 2: Systemd Service

Create `/etc/systemd/system/doc-api.service`:

```ini
[Unit]
Description=Document Upload API
After=network.target

[Service]
User=www-data
WorkingDirectory=/home/user/your-project
ExecStart=/usr/bin/node /home/user/your-project/backend/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable doc-api
sudo systemctl start doc-api
sudo systemctl status doc-api
```

## Nginx Configuration (Optional)

If using Nginx reverse proxy, add to your config:

```nginx
server {
    # ... existing config ...
    
    client_max_body_size 500M;  # Max upload size
    
    location /api/documents {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
}
```

Then reload:
```bash
sudo systemctl reload nginx
```

## Files Structure

After uploading files, you'll see them at:
```
/var/www/docs/
├── 1733542880123_a3f2k.pdf
├── 1733542920456_b7z9m.docx
└── 1733542950789_c1k4p.xlsx
```

Database entries are still in Supabase with `file_path` pointing to these filenames.

## Verify It Works

1. **Open your app** → Documentation → File Repository
2. **Click "Upload File"** → Select a PDF or document
3. **Fill in details** → Name, Category, Description
4. **Click "Upload"** → Should complete successfully
5. **Check server**:
   ```bash
   ls -la /var/www/docs/
   ```
6. **Download test** → Click file to download, should work

## Common Issues

| Problem | Solution |
|---------|----------|
| 404 on upload | Backend not running. Run `node backend/server.js` |
| Permission denied | Run `sudo chmod 755 /var/www/docs` |
| "Cannot find module" | Run `npm install` in project root |
| CORS errors | Check `FRONTEND_URL` in `.env` on server |
| Files don't appear | Check backend logs: `pm2 logs doc-api` |

## Files Modified

- ✅ **backend/server.js** - NEW: Backend API for uploads
- ✅ **src/lib/supabase.js** - UPDATED: Use server instead of Supabase
- ✅ **.env** - NEW: Configure API URL and port

## Monitoring

```bash
# Watch uploaded files
watch -n 1 'ls -la /var/www/docs/ | tail -10'

# Monitor disk usage
df -h /var/www/docs

# View backend logs
pm2 logs doc-api
```

## Backup Strategy

```bash
# Daily backup (add to crontab)
0 2 * * * tar -czf /backup/docs-$(date +\%Y\%m\%d).tar.gz /var/www/docs

# To restore:
tar -xzf /backup/docs-20251206.tar.gz -C /
```

## Next Steps

1. ✅ Set up server with `/var/www/docs`
2. ✅ Start backend server
3. ✅ Configure frontend `.env`
4. ✅ Test file upload
5. ✅ Set up PM2 or Systemd for auto-restart
6. ✅ Configure Nginx reverse proxy (optional)
7. ✅ Set up backup schedule

## Need Help?

Check the detailed guide: `DOCUMENT_UPLOAD_SETUP.md`

---

✅ **You're all set!** Files will now upload to `/var/www/docs` on your Ubuntu server.
