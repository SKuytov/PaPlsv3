# Complete Setup Instructions for PaPlsv3 with Document Upload

## Issue: You're in the Wrong Directory

You're currently in `/root/` but your project is elsewhere.

### Step 1: Find Your Project Directory

```bash
# Check where your app is deployed
ls -la /home/
ls -la /opt/
ls -la /var/www/

# Or search for package.json
find / -name "package.json" -type f 2>/dev/null | grep -v node_modules
```

Let's assume your project is at `/home/user/paplsv3` or `/var/www/paplsv3`

### Step 2: Navigate to Project Root

```bash
# Replace with your actual path
cd /home/user/paplsv3
# or
cd /var/www/paplsv3

# Verify you're in the right place
ls -la
# Should show: package.json, src/, backend/, etc.
```

---

## Issue 2: Content Security Policy (CSP) Blocking

Your HTML header blocks localhost connections. Fix this:

### Update your `index.html`

Find this line in your `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="..." />
```

Update it to allow localhost for development:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https: http://localhost:* http://127.0.0.1:*;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
" />
```

Or for production (with your actual domain):

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https: https://partpulse.eu:*;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
" />
```

---

## Issue 3: Database Relationship Error

**Error**: "Could not find a relationship between 'document_files' and 'users'"

This means the foreign key is missing. Fix in Supabase:

### Go to Supabase Dashboard

1. Open [supabase.com](https://supabase.com)
2. Go to your project
3. Click **SQL Editor**
4. Run this query:

```sql
-- Check if relationship exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name='document_files' AND constraint_type='FOREIGN KEY';

-- If nothing returned, create the relationship:
ALTER TABLE document_files 
ADD CONSTRAINT fk_document_files_users 
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Verify it worked
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name='document_files' AND constraint_type='FOREIGN KEY';
```

### Also check document_categories relationship:

```sql
ALTER TABLE document_files 
ADD CONSTRAINT fk_document_files_categories 
FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE CASCADE;
```

---

## Issue 4: Missing getNotifications Function

The error `Xe.getNotifications is not a function` means this function is being called but doesn't exist.

### Add to `src/lib/supabase.js`

Find this line in the file and add the function:

```javascript
// Add this to dbService object
async getNotifications(userId) {
  try {
    // If you don't have a notifications table, create a simple stub
    return { data: [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}
```

Or if you DO have a notifications table:

```javascript
async getNotifications(userId) {
  return handleRequest(supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)
  );
}
```

---

## Complete Setup Steps

### Step 1: Navigate to Project

```bash
cd /path/to/your/paplsv3
ls -la  # Verify package.json exists
```

### Step 2: Install Dependencies

```bash
npm install

# If that fails, try:
rm -rf node_modules package-lock.json
npm install
```

### Step 3: Create Environment Files

```bash
# Development
echo 'VITE_API_URL=http://localhost:5000' > .env.development

# Production
echo 'VITE_API_URL=https://partpulse.eu' > .env.production

# Or manually edit:
nano .env.development
# Add: VITE_API_URL=http://localhost:5000
```

### Step 4: Update index.html with CSP

```bash
# Open and edit index.html
nano index.html

# Update the Content-Security-Policy meta tag
# See "Issue 2" section above
```

### Step 5: Fix Database Relationships

Go to Supabase dashboard and run the SQL queries from "Issue 3" section above.

### Step 6: Add Missing getNotifications Function

```bash
# Edit supabase.js
nano src/lib/supabase.js

# Add the function from "Issue 4" section above
```

### Step 7: Create Upload Directory

```bash
# On your Ubuntu server
sudo mkdir -p /var/www/docs
sudo chmod 755 /var/www/docs
ls -la /var/www/  # Verify it exists
```

### Step 8: Start Backend Server

```bash
# Terminal 1 - Start backend
node backend/server.js

# You should see:
# ✅ Backend server running on port 5000
# 📁 Upload directory: /var/www/docs
# 🏆 API ready at http://localhost:5000/api
```

### Step 9: Start Frontend (Different Terminal)

```bash
# Terminal 2 - Start frontend
npm run dev

# Opens at http://localhost:5173
```

### Step 10: Test Upload

1. Open http://localhost:5173
2. Login
3. Go to **Documentation > File Repository**
4. Click **Upload File**
5. Select a PDF or document
6. Fill in details
7. Click **Upload**
8. Check: `ls -la /var/www/docs/` to see file

---

## Quick Verification Checklist

- [ ] You're in the correct project directory (`ls -la` shows `package.json`)
- [ ] Backend installed: `npm list express cors multer`
- [ ] `/var/www/docs` directory exists: `ls -la /var/www/docs/`
- [ ] Backend running: `node backend/server.js` starts without errors
- [ ] Frontend running: `npm run dev` works
- [ ] CSP updated in `index.html`
- [ ] Database foreign keys created in Supabase
- [ ] `getNotifications` function added to `src/lib/supabase.js`
- [ ] Can access http://localhost:5173
- [ ] Can login
- [ ] Can upload file
- [ ] File appears in `/var/www/docs/`

---

## If Still Having Issues

### Check Backend is Running

```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok",...}
```

### Check Logs

```bash
# Backend terminal - watch for errors
node backend/server.js

# Browser console - press F12, check Console tab
# Look for red errors starting with "Failed to fetch" or "CSP"
```

### Check Permissions

```bash
ls -la /var/www/docs/
# Should show: drwxr-xr-x (755)

ls -la /var/www/
# Verify docs directory exists
```

### Check Port 5000 is Free

```bash
netstat -tuln | grep 5000
# If something is using it:
kill -9 $(lsof -t -i:5000)
```

---

## Production Deployment

Once everything works in development:

### Step 1: Build Frontend

```bash
npm run build

# Creates dist/ folder with optimized files
```

### Step 2: Deploy Backend with PM2

```bash
# Install PM2
sudo npm install -g pm2

# Start server
pm2 start backend/server.js --name "doc-api"

# Auto-restart on reboot
pm2 startup
pm2 save

# View status
pm2 status
pm2 logs doc-api
```

### Step 3: Configure Nginx

Create `/etc/nginx/sites-available/paplsv3`:

```nginx
server {
    listen 80;
    server_name partpulse.eu www.partpulse.eu;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name partpulse.eu www.partpulse.eu;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/partpulse.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/partpulse.eu/privkey.pem;

    # Upload size
    client_max_body_size 500M;

    # Frontend
    location / {
        root /home/user/paplsv3/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/documents {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/paplsv3 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Get SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d partpulse.eu -d www.partpulse.eu
```

---

## Summary

1. ✅ Navigate to correct project directory
2. ✅ Update CSP in index.html
3. ✅ Create database relationships in Supabase
4. ✅ Add missing functions to supabase.js
5. ✅ Create /var/www/docs directory
6. ✅ Start backend on port 5000
7. ✅ Start frontend on port 5173
8. ✅ Test file upload
9. ✅ Deploy to production with PM2 + Nginx

You're all set! 🚀
