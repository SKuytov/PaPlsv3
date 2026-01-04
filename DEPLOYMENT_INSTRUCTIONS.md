# Multi-User Roles Implementation - Deployment Instructions

**Date:** January 4, 2026  
**Version:** 1.0.0  
**Status:** Ready for Production Deployment

---

## 📋 Pre-Deployment Checklist

- [x] All code committed to `feature/multi-user-roles-extended-technician` branch
- [x] Database migrations created and tested
- [x] Backend endpoints implemented
- [x] Frontend components created
- [x] Role permissions system integrated
- [x] Documentation completed

---

## 🚀 STEP-BY-STEP DEPLOYMENT GUIDE

### STEP 1: MERGE FEATURE BRANCH (GitHub)

**On your local machine:**

```bash
# Navigate to project
cd ~/PaPlsv3  # or wherever your project is

# Make sure you're on the feature branch
git checkout feature/multi-user-roles-extended-technician

# Update to latest
git pull origin feature/multi-user-roles-extended-technician

# Switch to main branch
git checkout main

# Update main
git pull origin main

# Merge feature branch into main
git merge feature/multi-user-roles-extended-technician

# Push to GitHub
git push origin main
```

**Or via GitHub UI:**
1. Go to: https://github.com/SKuytov/PaPlsv3
2. Click "Compare & pull request" (if shown)
3. Or go to Pull Requests → New Pull Request
4. Set base branch to `main`, compare branch to `feature/multi-user-roles-extended-technician`
5. Click "Create Pull Request"
6. Click "Merge pull request"
7. Confirm merge

---

### STEP 2: SSH INTO VPS AND UPDATE CODE

**Connect to your Hostinger VPS:**

```bash
# SSH into server
ssh -i /path/to/key root@YOUR_VPS_IP

# Or if using password:
ssh root@YOUR_VPS_IP

# Navigate to project directory
cd /var/www/PaPlsv3  # Adjust path if different

# Pull latest changes
git pull origin main

# Verify you have the latest code
git log --oneline -5  # Should show recent commits
```

---

### STEP 3: UPDATE SUPABASE DATABASE

**Run database migrations in Supabase SQL Editor:**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor → New Query
4. **Copy and paste the entire contents of:**  
   `database-migrations/002-integrate-with-existing-schema.sql`
5. Click "Run"
6. **Wait for success message** ✅

**Verify migrations ran successfully:**

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%technician%';

-- Check roles were seeded
SELECT name, is_technician_role FROM roles WHERE is_technician_role = true;
```

**Expected output for second query (9 roles):**
```
Building 1 Technician | true
Building 2 Technician | true
Building 3/5 Technician | true
Building 4 Technician | true
Maintenance Organizer | true
Head Technician | true
Technical Director | true
CEO | false (not technician role, but has permissions)
God Admin | false (admin role)
```

---

### STEP 4: BACKEND DEPLOYMENT

**On your VPS:**

```bash
# Navigate to backend directory
cd /var/www/PaPlsv3/backend

# Install new dependencies (if any)
npm install

# Stop current backend service
sudo systemctl stop paplsv3-backend
# OR if using PM2:
pm2 stop paplsv3-backend

# Start backend (it should auto-restart new code)
sudo systemctl start paplsv3-backend
# OR if using PM2:
pm2 start paplsv3-backend

# Verify it's running
ps aux | grep node
# OR
pm2 list

# Check logs for errors
sudo journalctl -u paplsv3-backend -n 50
# OR
pm2 logs paplsv3-backend
```

**Expected logs (no errors):**
```
[INFO] Server running on http://localhost:5000
[INFO] Connected to Supabase
```

---

### STEP 5: FRONTEND DEPLOYMENT

**On your VPS:**

```bash
# Navigate to frontend directory
cd /var/www/PaPlsv3/frontend

# Install dependencies
npm install

# Build production version
npm run build

# Stop current frontend service
sudo systemctl stop paplsv3-frontend
# OR if using PM2:
pm2 stop paplsv3-frontend

# Start frontend
sudo systemctl start paplsv3-frontend
# OR if using PM2:
pm2 start paplsv3-frontend

# Verify it's running
ps aux | grep vite  # or webpack/build tool
# OR
pm2 list
```

**Verify frontend is accessible:**
```bash
curl http://localhost:3000  # Should return HTML
```

---

### STEP 6: VERIFY DEPLOYMENT

**1. Test in browser:**

```
URL: https://your-domain.com  (or http://YOUR_VPS_IP)
```

**2. Test RFID login flow:**

- Go to technician login page
- Should see role information after login
- Test with different roles:
  - **Building Technician** → Should see Restock button
  - **Head Technician** → Should see Restock + Edit buttons
  - **CEO** → Should see Reports only (read-only)

**3. Test restock functionality:**

- Scan an item (or simulate RFID)
- Click "Restock" button (if available)
- Enter quantity
- Submit
- Check Supabase for audit log:

```sql
SELECT * FROM inventory_restock_log ORDER BY created_at DESC LIMIT 5;
```

**4. Check server logs:**

```bash
# Backend logs
sudo journalctl -u paplsv3-backend -f  # Live logs

# Frontend logs
sudo journalctl -u paplsv3-frontend -f

# Nginx logs (if using Nginx proxy)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔧 SUPABASE SETUP REFERENCE

If you need to manually check/update things in Supabase:

**View users and roles:**
```sql
SELECT 
  u.email,
  u.full_name,
  r.name,
  r.permissions
FROM users u
JOIN roles r ON u.role_id = r.id
LIMIT 10;
```

**View technician profiles:**
```sql
SELECT * FROM technician_profiles LIMIT 5;
```

**View restock history:**
```sql
SELECT * FROM inventory_restock_log ORDER BY created_at DESC LIMIT 20;
```

**Assign role to user:**
```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'Building 1 Technician')
WHERE email = 'technician@example.com';
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Permission denied: Your role cannot restock inventory"

**Solution:** Check user's role in Supabase:
```sql
SELECT u.email, r.name, r.permissions 
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'user@example.com';
```

Make sure the role has `"restock_inventory": true` in permissions.

### Issue: Restock modal doesn't appear after scan

**Solution:** Check:
1. User role has permission: `canRestock()` returns true
2. Backend endpoint `/api/inventory/restock` is responding
3. Browser console for JS errors

```bash
# Test backend endpoint
curl -X POST http://localhost:5000/api/inventory/restock \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "spare_part_id": 1,
    "quantity_added": 5,
    "reason": "Test",
    "building": "Building 1",
    "technician_name": "Test Tech"
  }'
```

### Issue: Database migration fails

**Solution:**
1. Check migration file for syntax errors
2. Run migration line by line in Supabase SQL Editor
3. Check Supabase logs for specific error
4. Verify table names match your schema

### Issue: Backend won't start

**Solution:**
```bash
# Check logs
sudo journalctl -u paplsv3-backend -n 100

# Verify environment variables
cat /etc/systemd/system/paplsv3-backend.service

# Restart
sudo systemctl restart paplsv3-backend

# Manual start to see errors
cd /var/www/PaPlsv3/backend
node server.js
```

---

## 📊 MONITORING AFTER DEPLOYMENT

**First 24 hours - Check:**

✅ No error logs  
✅ Users can login with RFID  
✅ Role information displays correctly  
✅ Restock functionality works  
✅ Audit logs are created  
✅ Performance is acceptable  

**Weekly - Check:**

```sql
-- Total restock operations
SELECT COUNT(*) FROM inventory_restock_log;

-- Restocks by user
SELECT u.full_name, COUNT(*) FROM inventory_restock_log l
JOIN users u ON l.user_id = u.id
GROUP BY u.full_name;

-- Most restocked items
SELECT sp.name, COUNT(*), SUM(l.quantity_added) FROM inventory_restock_log l
JOIN spare_parts sp ON l.spare_part_id = sp.id
GROUP BY sp.name
ORDER BY COUNT(*) DESC LIMIT 10;
```

---

## 📝 ROLLBACK INSTRUCTIONS (If needed)

**If something goes wrong:**

```bash
# 1. Revert code
cd /var/www/PaPlsv3
git reset --hard HEAD~1
git push origin main --force  # USE CAUTION

# 2. Stop services
sudo systemctl stop paplsv3-backend paplsv3-frontend

# 3. Reinstall dependencies
cd backend && npm install && cd ../frontend && npm install

# 4. Rebuild frontend
npm run build

# 5. Start services
sudo systemctl start paplsv3-backend paplsv3-frontend
```

**To rollback database:**

```sql
-- Drop new tables (CAUTION - destroys data)
DROP TABLE inventory_restock_log CASCADE;
DROP TABLE technician_permissions CASCADE;
DROP TABLE technician_profiles CASCADE;

-- Remove role columns
ALTER TABLE roles DROP COLUMN IF EXISTS can_restock;
ALTER TABLE roles DROP COLUMN IF EXISTS can_edit_inventory;
-- ... remove other columns
```

⚠️ **Database rollback is destructive! Only use if absolutely necessary.**

---

## ✅ DEPLOYMENT COMPLETE CHECKLIST

- [ ] Code merged to main branch
- [ ] SSH'ed into VPS
- [ ] Code pulled to server
- [ ] Database migrations ran successfully
- [ ] 9 technician roles visible in Supabase
- [ ] Backend restarted and running
- [ ] Frontend rebuilt and running
- [ ] Tested login with different roles
- [ ] Tested restock functionality
- [ ] Verified audit logs are created
- [ ] Checked server logs for errors
- [ ] Tested permissions enforcement
- [ ] Performance is acceptable
- [ ] Notified team of deployment

---

## 📞 SUPPORT

If you encounter issues:

1. Check logs (backend, frontend, Nginx)
2. Verify database migrations completed
3. Test API endpoints manually
4. Check browser console for JS errors
5. Review Supabase query performance

**Key Files for Reference:**
- Backend endpoints: `backend/routes/inventory.js`
- Frontend components: `src/components/technician/RestockModal.jsx`
- Context: `src/contexts/RolePermissionsContext.jsx`
- Utils: `src/utils/rolePermissions.js`
- Database: `database-migrations/002-integrate-with-existing-schema.sql`

---

**Deployment Date:** January 4, 2026  
**Status:** ✅ READY FOR PRODUCTION
