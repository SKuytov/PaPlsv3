# 🚀 DEPLOYMENT GUIDE - PaPlsv3 WMS/CMMS System

**Status**: ✅ Production Ready | Last Updated: January 10, 2026

---

## 🏆 Quick Summary of New Features

This branch (`feature/multi-user-roles-extended-technician`) includes:

✅ **Quote Requests Management** - Create, track, and manage supplier quote requests
✅ **Supplier Invoices System** - Log, track, and route invoices to accounting
✅ **Production-Ready Components** - Full CRUD operations with validation
✅ **Database Migrations** - Supabase tables with RLS security policies
✅ **Type-Safe API Routes** - Express.js backend with Supabase integration
✅ **Responsive UI** - React components with error handling and loading states

---

## 📝 Prerequisites

Before deploying, ensure you have:

- [ ] Node.js 18+ installed
- [ ] Supabase account with database access
- [ ] Access to your Hostinger VPS KVM4 Ubuntu server
- [ ] Git access to your repository
- [ ] PM2 or systemd for process management

---

## 📄 Step 1: Database Setup (Supabase)

### 1.1 Access Supabase SQL Editor

1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Navigate to **SQL Editor**
4. Click **New Query**

### 1.2 Run Migration for Quote Requests

Copy and paste the contents of `database/migrations/001_create_quote_requests.sql`:

```sql
-- This creates the quote_requests table with RLS policies
-- Copy from: database/migrations/001_create_quote_requests.sql
```

✅ Click **Run**

### 1.3 Run Migration for Supplier Invoices

Copy and paste the contents of `database/migrations/002_create_supplier_invoices.sql`:

```sql
-- This creates the supplier_invoices table with RLS policies
-- Copy from: database/migrations/002_create_supplier_invoices.sql
```

✅ Click **Run**

### 1.4 Verify Tables

In Supabase SQL Editor, run:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see:
- `quote_requests`
- `supplier_invoices`
- Your existing tables (orders, payments, etc.)

---

## 🚀 Step 2: Backend Deployment

### 2.1 Pull Latest Changes on VPS

```bash
cd /path/to/PaPlsv3
git pull origin feature/multi-user-roles-extended-technician
```

### 2.2 Install/Update Dependencies

```bash
cd backend
npm install
```

### 2.3 Verify Environment Variables

Check `.env` file in backend directory:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://partpulse.eu
USE_HTTPS=true
```

⚠️ **Important**: Never commit `.env` file to Git

### 2.4 Test Backend Locally (Optional)

```bash
cd backend
npm start
```

You should see:
```
============================================================
✅ Backend server running on HTTPS port 5000
🔒 SSL Certificate: Let's Encrypt
🟆 API ready at https://partpulse.eu:5000/api
...
```

### 2.5 Restart Backend Service on VPS

If using PM2:

```bash
pm2 restart PaPlsv3
pm2 save
pm2 startup
```

Or with systemd:

```bash
sudo systemctl restart papls
sudo systemctl status papls
```

### 2.6 Verify API Endpoints

Test the health check:

```bash
curl https://partpulse.eu:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "express": "running",
    "quote_requests": "active",
    "supplier_invoices": "active",
    "auth_api": "active"
  }
}
```

---

## 🎉 Step 3: Frontend Deployment

### 3.1 Pull Latest Changes

```bash
git pull origin feature/multi-user-roles-extended-technician
```

### 3.2 Install Dependencies

```bash
cd frontend  # or root if Vite is at root
npm install
```

### 3.3 Verify Environment Variables

Check `.env` or `.env.production`:

```env
VITE_API_URL=https://partpulse.eu:5000
```

### 3.4 Build for Production

```bash
npm run build
```

Should create `dist/` folder with optimized assets.

### 3.5 Deploy Built Files

If using Vercel/Netlify, push to `feature/multi-user-roles-extended-technician` and it will auto-deploy.

If using manual deployment:

```bash
rsync -avz dist/ user@partpulse.eu:/var/www/html/
```

### 3.6 Clear Browser Cache

- Ctrl+Shift+Del (or Cmd+Shift+Del)
- Clear browsing data
- Visit https://partpulse.eu

---

## ✅ Step 4: Post-Deployment Testing

### 4.1 Test Authentication

1. Go to https://partpulse.eu
2. Log in with your credentials
3. Check browser console for errors (F12)

### 4.2 Test Quote Requests Module

1. Navigate to **Quote Requests** page
2. Click **New Request**
3. Fill in:
   - Title: "Test Request"
   - Description: "Testing the system"
   - Budget: 1000
   - Priority: Normal
4. Click **Create Request**
5. ✅ Should appear in list

### 4.3 Test Supplier Invoices Module

1. Navigate to **Supplier Invoices** page
2. Click **New Invoice**
3. Fill in:
   - Invoice #: "INV-2024-0001"
   - Amount: 500.00
   - Received Date: Today
   - Due Date: 30 days from today
4. Click **Log Invoice**
5. ✅ Should appear in list with "Pending" status
6. Click **Send** button
7. ✅ Status should change to "Sent to Accounting"

### 4.4 Check Backend Logs

```bash
pm2 logs PaPlsv3 --lines 50
```

Should show successful API calls, no errors.

### 4.5 Monitor Database

In Supabase:

1. Go to **Table Editor**
2. Click `quote_requests` table
3. ✅ Should see your test request
4. Click `supplier_invoices` table
5. ✅ Should see your test invoice

---

## 📋 Rollback Plan (If Needed)

If something goes wrong:

### Option 1: Revert to Previous Commit

```bash
git checkout main  # or previous branch
git pull origin main
pm2 restart PaPlsv3
```

### Option 2: Drop Tables (Last Resort)

⚠️ **WARNING**: This deletes all data!

```sql
DROP TABLE IF EXISTS public.supplier_invoices CASCADE;
DROP TABLE IF EXISTS public.quote_requests CASCADE;
```

Then re-run migrations.

---

## 🔐 Security Checklist

- [ ] HTTPS enabled (Let's Encrypt certificates loaded)
- [ ] Environment variables are NOT committed to Git
- [ ] Supabase Row Level Security (RLS) policies enabled
- [ ] JWT tokens validated on all endpoints
- [ ] File uploads validated for MIME type
- [ ] SQL injection prevention via parameterized queries
- [ ] CORS properly configured for your domain
- [ ] API endpoints require authentication

---

## 📋 API Endpoints Summary

### Quote Requests
```
GET    /api/quote-requests              - List all (with filters)
GET    /api/quote-requests/:id          - Get single
POST   /api/quote-requests              - Create
PATCH  /api/quote-requests/:id          - Update
DELETE /api/quote-requests/:id          - Delete
```

### Supplier Invoices
```
GET    /api/supplier-invoices           - List all (with filters)
GET    /api/supplier-invoices/:id       - Get single
POST   /api/supplier-invoices           - Create
PATCH  /api/supplier-invoices/:id       - Update
DELETE /api/supplier-invoices/:id       - Delete
POST   /api/supplier-invoices/:id/send-to-accounting  - Route to accounting
GET    /api/supplier-invoices/stats/summary - Get statistics
```

---

## 📊 Monitoring & Maintenance

### Daily Checks

```bash
# Check backend status
pm2 status

# Check recent logs for errors
pm2 logs PaPlsv3 --lines 100 | grep -i error

# Check disk space
df -h

# Check upload directory
du -sh /var/www/docs
```

### Weekly Backups

Supabase automatically backs up. To verify:

1. Go to Supabase dashboard
2. Settings → Backups
3. Verify recent backups exist

### Monthly Maintenance

```bash
# Update Node.js if needed
node --version  # Should be 18+

# Update dependencies
cd backend && npm update
cd frontend && npm update

# Commit changes
git add -A
git commit -m "chore: update dependencies"
git push origin feature/multi-user-roles-extended-technician
```

---

## 🐛 Troubleshooting

### Issue: 404 on new endpoints

**Solution**: 
- Verify routes are imported in `backend/server.js`
- Check server has been restarted: `pm2 restart PaPlsv3`
- Test with: `curl https://partpulse.eu:5000/api/quote-requests`

### Issue: CORS Error

**Solution**:
- Update `FRONTEND_URL` in backend `.env`
- Restart backend: `pm2 restart PaPlsv3`
- Check: server.js has CORS config

### Issue: Database queries fail

**Solution**:
- Verify Supabase credentials in `.env`
- Check tables exist in Supabase SQL Editor
- Verify RLS policies: Go to Authentication → Policies
- Check user has proper permissions

### Issue: 401 Unauthorized

**Solution**:
- Ensure JWT token is in Authorization header: `Bearer YOUR_TOKEN`
- Check token expiry
- Verify JWT_SECRET matches both frontend and backend

### Issue: Changes not visible

**Solution**:
- Hard refresh browser: Ctrl+Shift+R
- Clear browser cache
- Check if frontend/backend are actually restarted
- Verify no errors in browser console (F12)

---

## 📝 Documentation Files

- `IMPLEMENTATION_GUIDE.md` - Full feature details
- `database/migrations/` - SQL migration scripts
- `backend/routes/` - API route implementations
- `src/pages/` - React page components
- `src/components/` - Reusable React components
- `src/hooks/` - Custom React hooks

---

## ❓ Support

If you encounter issues:

1. Check `pm2 logs PaPlsv3` for backend errors
2. Check browser console (F12) for frontend errors
3. Verify all `.env` variables are set correctly
4. Test endpoints with curl: `curl -H "Authorization: Bearer YOUR_TOKEN" https://partpulse.eu:5000/api/quote-requests`
5. Check Supabase console for database issues

---

## 🎆 Success Indicators

You'll know everything is working when:

✅ API health check returns 200 with all services running
✅ Quote requests page loads without errors
✅ Can create a new quote request
✅ Can see created request in the list
✅ Supplier invoices page loads without errors
✅ Can create and log a supplier invoice
✅ Can send invoice to accounting
✅ Invoice status updates correctly
✅ Statistics card shows correct totals
✅ All data persists after page refresh
✅ No errors in browser console
✅ No errors in backend logs

---

**Deployment Date**: January 10, 2026  
**Branch**: `feature/multi-user-roles-extended-technician`  
**Status**: ✅ Ready for Production
