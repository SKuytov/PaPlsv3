# Multi-User Roles Implementation - Quick Reference

**Status: ✅ READY FOR DEPLOYMENT**

---

## 🚀 QUICK START (For Deployment)

### Step 1: Merge Branch
```bash
cd ~/PaPlsv3
git checkout main
git pull origin main
git merge feature/multi-user-roles-extended-technician
git push origin main
```

### Step 2: SSH & Pull
```bash
ssh root@YOUR_VPS_IP
cd /var/www/PaPlsv3
git pull origin main
```

### Step 3: Update Database
1. Go to Supabase Dashboard
2. SQL Editor → New Query
3. Copy-paste from: `database-migrations/002-integrate-with-existing-schema.sql`
4. Click Run ✅

### Step 4: Restart Services
```bash
# Backend
sudo systemctl restart paplsv3-backend

# Frontend
cd frontend && npm run build
sudo systemctl restart paplsv3-frontend
```

### Step 5: Verify
- Visit: `https://your-domain.com`
- Login with RFID
- Check if Restock button appears (if authorized)
- Test the restock flow

---

## 📋 WHAT WAS CREATED

### Backend
- ✅ `backend/routes/inventory.js` - Restock API endpoint
- ✅ Permission validation
- ✅ Audit logging

### Frontend
- ✅ `src/contexts/RolePermissionsContext.jsx` - Role state
- ✅ `src/hooks/useRolePermissions.js` - Role hook
- ✅ `src/components/technician/RestockModal.jsx` - Restock UI
- ✅ `src/utils/rolePermissions.js` - Permission helpers
- ✅ Updated `src/pages/RFIDLoginPage.jsx`
- ✅ Updated `src/components/modules/MaintenanceSpareParts.jsx`

### Database
- ✅ `database-migrations/002-integrate-with-existing-schema.sql`
  - ✅ Extends `roles` table
  - ✅ Creates `technician_profiles`
  - ✅ Creates `technician_permissions`
  - ✅ Creates `inventory_restock_log` (audit trail)
  - ✅ Seeds 9 roles with permissions

### Documentation
- ✅ `DEPLOYMENT_INSTRUCTIONS.md` - Step-by-step deploy guide
- ✅ `IMPLEMENTATION_SUMMARY.md` - Detailed technical overview
- ✅ `QUICK_REFERENCE.md` - This file

---

## 🎭 THE 9 ROLES

| # | Role | Restock | Edit | Approve |
|---|------|---------|------|----------|
| 1 | 🔧 Building 1 Technician | ✅ | ❌ | ❌ |
| 2 | 🔧 Building 2 Technician | ✅ | ❌ | ❌ |
| 3 | 🔧 Building 3/5 Technician | ✅ | ❌ | ❌ |
| 4 | 🔧 Building 4 Technician | ✅ | ❌ | ❌ |
| 5 | 📋 Maintenance Organizer | ✅ | ✅ | ❌ |
| 6 | 👑 Head Technician | ✅ | ✅ | ✅ |
| 7 | ⚡ Technical Director | ✅ | ✅ | ✅ |
| 8 | 📊 CEO | ❌ | ❌ | ❌ |
| 9 | 🛡️ God Admin | ✅ | ✅ | ✅ |

---

## 🔄 DATA FLOW

### Login
```
RFID Scan → Fetch User + Role → Show Role Info → Set Permissions
```

### Restock
```
User Views Spare Parts
  → If has permission: Show "Restock" button
  → Click Restock
  → Enter Quantity + Reason
  → Backend validates permission
  → Updates inventory_spare_parts table
  → Creates audit log
  → Shows success message
```

### Audit Trail
```
All restocks logged to inventory_restock_log with:
- Who (user_id, user_name)
- What (part_id, part_name)
- When (timestamp)
- How much (quantity_added)
- Why (reason)
- Building info
```

---

## 🔐 PERMISSION LEVELS

```javascript
// Technicians (Building 1-4)
["view_inventory", "restock_inventory"]

// Maintenance Organizer
["view_inventory", "restock_inventory", "edit_inventory", "view_reports"]

// Head Technician
["view_inventory", "restock_inventory", "edit_inventory", "view_reports", "approve_restock", "manage_users"]

// Technical Director
[...above + "view_audit_logs"]

// CEO
["view_reports", "view_executive_dashboard"]

// God Admin
["system_admin"]
```

---

## 📱 API ENDPOINTS

### Restock Item
```bash
POST /api/inventory/restock
Content-Type: application/json

{
  "user_id": "uuid",
  "spare_part_id": 123,
  "quantity_added": 5,
  "reason": "Stock replenishment",
  "building": "Building 1",
  "technician_name": "John Doe"
}

Response 200:
{
  "success": true,
  "spare_part": {
    "id": 123,
    "name": "Part Name",
    "previous_quantity": 10,
    "quantity_added": 5,
    "new_quantity": 15
  },
  "log": { /* audit log entry */ }
}
```

### Get Restock History
```bash
GET /api/inventory/restock-history?limit=50&offset=0&building=Building%201

Response 200:
{
  "success": true,
  "data": [ /* array of restock logs */ ],
  "pagination": { "limit": 50, "offset": 0 }
}
```

---

## 🗄️ DATABASE SCHEMA

### inventory_restock_log
```sql
id (UUID, PK)
user_id (UUID, FK → users)
spare_part_id (BIGINT, FK → spare_parts)
quantity_added (INT)
reason (VARCHAR)
previous_quantity (INT)
new_quantity (INT)
building (VARCHAR)
notes (TEXT)
created_at (TIMESTAMP, immutable)
```

### technician_profiles
```sql
id (UUID, PK)
user_id (UUID, FK → users)
assigned_buildings (JSONB) -- ["Building 1", "Building 3"]
rfid_card_id (VARCHAR, unique)
specializations (JSONB)
certification_level (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### technician_permissions
```sql
id (UUID, PK)
role_id (UUID, FK → roles)
permission (VARCHAR)
created_at (TIMESTAMP)
UNIQUE(role_id, permission)
```

---

## 🛠️ COMMON TASKS

### Assign Role to User
```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'Building 1 Technician')
WHERE email = 'tech@example.com';
```

### View Restock History
```sql
SELECT * FROM inventory_restock_log
ORDER BY created_at DESC LIMIT 20;
```

### Count Restocks by Technician
```sql
SELECT u.full_name, COUNT(*) as restocks
FROM inventory_restock_log l
JOIN users u ON l.user_id = u.id
GROUP BY u.full_name
ORDER BY restocks DESC;
```

### Check User Permissions
```sql
SELECT u.email, r.name, r.permissions
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'user@example.com';
```

---

## 🐛 TROUBLESHOOTING

### Restock button doesn't show
```
❌ Check: User role has "restock_inventory" permission
❌ Check: User is assigned correct role in database
❌ Check: Browser cache (Ctrl+F5)
```

### "Permission denied" error
```
❌ Check: Verify role in Supabase:
    SELECT name FROM roles WHERE id = user_role_id;
❌ Check: Verify permissions in role:
    SELECT permissions FROM roles WHERE name = 'Role Name';
```

### Backend won't start
```bash
❌ Check logs:
    sudo journalctl -u paplsv3-backend -n 50
❌ Check environment variables:
    cat /etc/systemd/system/paplsv3-backend.service
❌ Manual start to see errors:
    cd backend && node server.js
```

### Database migration fails
```
❌ Check: Migration syntax errors
❌ Check: Table names match your schema
❌ Check: Run line-by-line in Supabase SQL Editor
```

---

## 📚 DOCUMENTATION FILES

| File | Purpose |
|------|----------|
| `IMPLEMENTATION_SUMMARY.md` | Complete technical overview |
| `DEPLOYMENT_INSTRUCTIONS.md` | Step-by-step deployment guide |
| `QUICK_REFERENCE.md` | This file - quick lookup |
| `database-migrations/002-integrate-with-existing-schema.sql` | SQL migrations |

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] Code reviewed on GitHub
- [ ] Feature branch created: `feature/multi-user-roles-extended-technician`
- [ ] All files committed
- [ ] Database migrations prepared
- [ ] Backend endpoint tested
- [ ] Frontend components tested
- [ ] Documentation complete

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Feature branch merged to main
- [ ] SSH'ed into VPS
- [ ] Code pulled to server
- [ ] Database migrations ran successfully
- [ ] Backend restarted
- [ ] Frontend rebuilt and restarted
- [ ] Login tested with different roles
- [ ] Restock functionality tested
- [ ] Audit logs verified in database
- [ ] No errors in server logs

---

## 📞 SUPPORT COMMANDS

### View Backend Logs
```bash
sudo journalctl -u paplsv3-backend -f
```

### View Frontend Logs
```bash
sudo journalctl -u paplsv3-frontend -f
```

### Restart Backend
```bash
sudo systemctl restart paplsv3-backend
```

### Restart Frontend
```bash
sudo systemctl restart paplsv3-frontend
```

### Check Service Status
```bash
sudo systemctl status paplsv3-backend
sudo systemctl status paplsv3-frontend
```

### Test Endpoint
```bash
curl -X POST http://localhost:5000/api/inventory/restock \
  -H "Content-Type: application/json" \
  -d '{ "user_id": "test", ... }'
```

---

## 🎯 KEY METRICS

After deployment, monitor:

```sql
-- Total operations
SELECT COUNT(*) FROM inventory_restock_log;

-- By day
SELECT DATE(created_at), COUNT(*)
FROM inventory_restock_log
GROUP BY DATE(created_at);

-- Top restockers
SELECT u.full_name, COUNT(*)
FROM inventory_restock_log l
JOIN users u ON l.user_id = u.id
GROUP BY u.full_name LIMIT 10;
```

---

## 💡 TIPS

1. **Use audit trail for compliance** - Every restock is logged
2. **Monitor permissions** - Easy to see who can do what
3. **Build on this** - Easy to add more roles/permissions
4. **Test thoroughly** - Try different roles after deployment
5. **Check logs first** - 90% of issues visible in logs

---

## 📞 EMERGENCY ROLLBACK

If something goes seriously wrong:

```bash
# Revert code
cd /var/www/PaPlsv3
git reset --hard HEAD~1
git push origin main --force

# Restart services
sudo systemctl restart paplsv3-backend paplsv3-frontend
```

⚠️ **DO NOT** drop database tables without backup!

---

**All done! Ready for deployment.** 🎉

*See `DEPLOYMENT_INSTRUCTIONS.md` for detailed steps.*
