# 🚀 COMPLETE DEPLOYMENT GUIDE

## ⚡ QUICK START: 4 STEPS TO LIVE

### STEP 1: Run All SQL Migrations in Supabase (5 minutes)

**Order matters! Run these migrations in this exact sequence:**

#### Migration 1: Item Requests (Already exists)
```
File: database/migrations/001-item-requests.sql
Status: ✅ Already created in your repo
Action: Run this first if you haven't already
```

#### Migration 2: Manager Dashboards
```
File: database/migrations/002-manager-dashboards.sql
Tables Created:
  ✅ supplier_quotes        - Quote management
  ✅ purchase_orders        - Order tracking  
  ✅ invoice_checklist      - Invoice verification
  ✅ payment_records        - Payment processing
  ✅ dashboard_preferences  - User preferences
Indexes: 14 performance indexes
RLS Policies: 15 security policies
Status: ✅ NEW - Run this second
```

#### Migration 3: Role-Based Access Control
```
File: database/migrations/003-role-based-access.sql
Tables Created:
  ✅ user_roles             - User role assignments
  ✅ role_permissions       - Permission matrix (6 roles pre-configured)
  ✅ user_dashboard_access  - Dashboard access control
Views Created:
  ✅ user_permissions_view          - What users can do
  ✅ user_accessible_dashboards    - Which dashboards are accessible
Status: ✅ NEW - Run this third
```

---

## 📋 HOW TO EXECUTE MIGRATIONS IN SUPABASE

### Step-by-Step Instructions

**For EACH migration file (002, then 003):**

1. **Go to Supabase Dashboard**
   ```
   URL: https://app.supabase.com
   Select your project
   ```

2. **Open SQL Editor**
   ```
   Left sidebar → "SQL Editor" tab
   Click "New Query" button
   ```

3. **Get Migration SQL**
   ```
   Open GitHub: https://github.com/SKuytov/PaPlsv3
   Branch: feature/multi-user-roles-extended-technician
   Path: database/migrations/002-manager-dashboards.sql
   Click "Raw" button (top right)
   Copy all content (Ctrl+A → Ctrl+C)
   ```

4. **Paste Into Supabase**
   ```
   Click in SQL Editor
   Paste (Ctrl+V)
   Review SQL (should be 300+ lines)
   ```

5. **Run Migration**
   ```
   Click "Run" button (bottom right)
   Wait for completion...
   Should see: "✓ Migration 002 completed successfully!"
   Verify: No error messages
   ```

6. **Repeat for Migration 003**
   ```
   Same steps, different file
   ```

---

## ✅ VERIFICATION CHECKLIST

After running all migrations, verify in Supabase by running this SQL:

```sql
-- Check all new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'supplier_quotes',
    'purchase_orders', 
    'invoice_checklist',
    'payment_records',
    'dashboard_preferences',
    'user_roles',
    'role_permissions',
    'user_dashboard_access'
)
ORDER BY table_name;

-- Should return 8 rows - all new tables
```

**Expected Output:**
```
✅ supplier_quotes
✅ purchase_orders
✅ invoice_checklist
✅ payment_records
✅ dashboard_preferences
✅ user_roles
✅ role_permissions
✅ user_dashboard_access
```

---

## 🔧 STEP 2: Backend Integration (5 minutes)

### Update Environment Variables

**File:** `.env`

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Keep existing configuration
PORT=3000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
```

### How to Get Your Keys

1. Go to: `https://app.supabase.com`
2. Select your project
3. Settings (bottom left) → API
4. Copy:
   - "Project URL" → `SUPABASE_URL`
   - "Service role key" → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Register API Routes

**File:** `src/app.js` or `src/server.js`

Find where you have:
```javascript
const requestsRouter = require('./src/api/requests');
app.use('/api', requestsRouter);
```

Add these lines after it:
```javascript
// New API Routes
const dashboardRouter = require('./src/api/dashboards');
const quotesRouter = require('./src/api/quotes');
const ordersRouter = require('./src/api/orders');
const invoicesRouter = require('./src/api/invoices');
const paymentsRouter = require('./src/api/payments');

// Register routes (add to existing app.use calls)
app.use('/api', dashboardRouter);
app.use('/api', quotesRouter);
app.use('/api', ordersRouter);
app.use('/api', invoicesRouter);
app.use('/api', paymentsRouter);
```

### Restart Backend

```bash
# In your backend terminal
Ctrl+C  # Stop current process
npm run dev

# Should show:
# ✅ Server running on port 3000
# ✅ Connected to Supabase
# ✅ All routes registered
```

---

## 🎨 STEP 3: Frontend Integration (5 minutes)

### Update Main App Component

**File:** `src/pages/RFIDLoginPage.jsx`

Replace or update your login page to use the new dashboard routing:

```javascript
// Add imports at top
import MainApp from '@/components/MainApp';
import { useEffect, useState } from 'react';

export default function RFIDLoginPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [technicianInfo, setTechnicianInfo] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // ... existing login logic ...

  // After successful login:
  useEffect(() => {
    if (isLoggedIn && technicianInfo) {
      setUserRole(technicianInfo.role || 'technician');
    }
  }, [isLoggedIn, technicianInfo]);

  // Render the correct dashboard
  if (isLoggedIn) {
    return <MainApp technicianInfo={technicianInfo} userRole={userRole} />;
  }

  // Show login form
  return (
    <div>
      {/* Your existing login form */}
    </div>
  );
}
```

### Alternative: Role-Based Routing

If you prefer explicit routing:

```javascript
import BuildingTechDashboard from '@/components/dashboards/BuildingTechDashboard';
import MaintenanceOrgDashboard from '@/components/dashboards/MaintenanceOrgDashboard';
import TechDirectorDashboard from '@/components/dashboards/TechDirectorDashboard';
import AccountantDashboard from '@/components/dashboards/AccountantDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import RequestsTab from '@/components/technician/RequestsTab';

function renderDashboard(role, technicianInfo) {
  switch(role) {
    case 'building_tech':
      return <BuildingTechDashboard technicianInfo={technicianInfo} />;
    case 'maintenance_org':
      return <MaintenanceOrgDashboard technicianInfo={technicianInfo} />;
    case 'tech_director':
      return <TechDirectorDashboard technicianInfo={technicianInfo} />;
    case 'accountant':
      return <AccountantDashboard technicianInfo={technicianInfo} />;
    case 'god_admin':
      return <AdminDashboard technicianInfo={technicianInfo} />;
    default:
      return <RequestsTab technicianInfo={technicianInfo} />;
  }
}

// In your component:
if (isLoggedIn) {
  return renderDashboard(userRole, technicianInfo);
}
```

### Restart Frontend

```bash
# In your frontend terminal
Ctrl+C  # Stop current process
npm run dev

# Should show:
# ✅ Frontend running on port 5173 (or your port)
# ✅ All components loaded
# ✅ Connected to backend
```

---

## 🧪 STEP 4: Test Complete Workflows (10 minutes)

### Test 1: Technician Creates Request
```
1. Login as any technician user
2. Should see "Requests" tab (or dashboard)
3. Click "Create New Request"
4. Fill in: Building, Priority, Description
5. Click "Next: Add Items"
6. Add 2-3 items with quantities and prices
7. Click "Create Request"
8. ✅ Request appears with DRAFT status
9. Click "Submit"
10. ✅ Status changes to SUBMITTED
```

### Test 2: Building Tech Level 1 Approval
```
1. Logout from technician
2. Login as building_tech user
3. Should see "Building Tech Dashboard"
4. Click "Pending Approvals" tab
5. ✅ See submitted request from Test 1
6. Click on request
7. Add optional approval comment
8. Click "Approve"
9. ✅ Status changes to BUILDING_APPROVED
```

### Test 3: Maintenance Org Quote Management
```
1. Login as maintenance_org user  
2. Should see "Maintenance Dashboard"
3. Tabs visible: Requests, Quotes, Orders, Received, Accounting
4. Click "Quotes" tab
5. ✅ See pending request
6. Click "Add Quote"
7. Enter supplier name, total amount, notes
8. Upload PDF (optional)
9. Click "Add Quote"
10. ✅ Quote appears in list
11. Mark as "Selected"
12. ✅ Status changes to quote-selected
```

### Test 4: Maintenance Org Order Placement
```
1. Still in maintenance_org dashboard
2. Click "Orders" tab
3. Click "Create Purchase Order"
4. Select supplier quote
5. Enter tracking info
6. Click "Place Order"
7. ✅ Order appears with status NOT_PLACED
8. Click order to edit
9. Update tracking number
10. Update status to IN_TRANSIT
11. ✅ Status updates in real-time
```

### Test 5: Maintenance Org Invoice Verification
```
1. Still in maintenance_org dashboard
2. Click "Received" tab  
3. Click "Verify Invoice"
4. Check 6-point checklist:
   ✅ Items Received
   ✅ Quantities Verified
   ✅ Invoice matches PO
   ✅ Prices Verified
   ✅ No Damages
   ✅ Documentation Complete
5. Upload invoice PDF
6. Click "Complete Verification"
7. ✅ Status changes to invoice-verified
```

### Test 6: Tech Director Level 3 Approval
```
1. Login as tech_director user
2. Should see "Tech Director Dashboard"
3. Click "Pending Approvals"
4. ✅ See request from all previous tests
5. Can review all details
6. Click "Approve"
7. ✅ Status changes to DIRECTOR_APPROVED
```

### Test 7: Accountant Payment Processing
```
1. Login as accountant user
2. Should see "Accountant Dashboard"
3. Click "Accounting" or "Payments" tab
4. ✅ See invoice and payment records
5. Click "Process Payment"
6. Enter payment method, reference, date
7. Click "Process"
8. ✅ Status changes to PROCESSED
9. Can view payment history
```

### Test 8: Admin Full System Access
```
1. Login as god_admin user
2. Should see "Admin Dashboard"
3. Can access ALL dashboards
4. Can see system-wide metrics
5. Can access any request
6. Can execute final approval
7. Can manage users and roles
```

---

## 🚀 STEP 5: Run Build Script (10 minutes)

### After All Tests Pass

```bash
# Make script executable
chmod +x rebuild-1.sh

# Run the deployment script
./rebuild-1.sh

# Script will:
# ✅ Clean dependencies
# ✅ Reinstall node_modules
# ✅ Build frontend (Vite)
# ✅ Build backend
# ✅ Run all tests
# ✅ Deploy to production

# Watch for:
# ✅ No build errors
# ✅ All tests passing
# ✅ Both frontend and backend running
```

---

## 📊 DATABASE STRUCTURE REFERENCE

### All Tables Created

```
Item Request Tables (from Migration 001):
├── item_requests           ← Main request records
├── request_items          ← Line items
├── request_approvals      ← Approval tracking
├── request_activity       ← Audit trail
└── request_documents      ← Attachments

Dashboard Tables (from Migration 002):
├── supplier_quotes        ← Quote management
├── purchase_orders        ← Order tracking
├── invoice_checklist      ← Invoice verification
├── payment_records        ← Payment processing
└── dashboard_preferences  ← User preferences

Role/Access Tables (from Migration 003):
├── user_roles             ← User role assignments
├── role_permissions       ← Permission matrix
└── user_dashboard_access  ← Dashboard access control

Total: 13 Tables
```

### Available Roles

```
1. technician           → Create requests
2. building_tech        → Level 1 approvals
3. maintenance_org      → Quotes, Orders, Invoices
4. tech_director        → Level 3 approvals
5. accountant           → Process payments
6. god_admin            → Full system access
```

---

## 🔐 Security Information

✅ **Row-Level Security (RLS):** 28 RLS policies  
✅ **Role-Based Access:** 6 roles with 50+ permissions  
✅ **JWT Authentication:** All API endpoints secured  
✅ **Audit Trail:** Every action logged with timestamp  
✅ **Data Encryption:** Supabase handles encryption  
✅ **SQL Injection Prevention:** Parameterized queries  

---

## 🆘 TROUBLESHOOTING

### "Table doesn't exist" Error
```
❌ Problem: SQL migration didn't run
✅ Solution:
   1. Go to Supabase Dashboard → SQL Editor
   2. Run the migration manually
   3. Copy entire file content
   4. Paste into editor
   5. Click Run
   6. Look for error messages
```

### "RLS Policy Violation" Error
```
❌ Problem: Row-level security blocking access
✅ Solution:
   1. Verify user role is assigned in user_roles table
   2. Check JWT token contains role field
   3. Ensure user has required permission
```

### "401 Unauthorized" on API
```
❌ Problem: API authentication failing
✅ Solution:
   1. Check SUPABASE_SERVICE_ROLE_KEY is correct
   2. Verify JWT token is sent in Authorization header
   3. Check token hasn't expired
   4. Restart backend
```

### "Dashboard Not Showing"
```
❌ Problem: Wrong component rendering
✅ Solution:
   1. Verify user role in database
   2. Check MainApp component is imported
   3. Review console for JS errors
   4. Check browser Network tab for 404s
```

### "Build Script Fails"
```
❌ Problem: rebuild-1.sh errors
✅ Solution:
   1. Ensure chmod +x rebuild-1.sh
   2. Check Node.js version (>= 16)
   3. Check npm is in PATH
   4. Try running steps manually
```

---

## 📈 MONITORING & VERIFICATION

### Check Database Health

```sql
-- Count requests by status
SELECT status, COUNT(*) FROM item_requests GROUP BY status;

-- View pending approvals
SELECT * FROM request_approvals WHERE status = 'PENDING';

-- Check recent activity
SELECT * FROM request_activity ORDER BY timestamp DESC LIMIT 20;

-- View role assignments
SELECT * FROM user_roles WHERE status = 'ACTIVE';
```

### Check API Logs

```bash
# Watch backend logs
Ctrl+L (in backend terminal)

# Look for:
# ✅ POST /api/requests 200
# ✅ GET /api/requests 200
# ❌ 401 errors = auth issue
# ❌ 500 errors = server error
```

### Check Frontend Console

```javascript
// In browser DevTools Console (F12):

// Should see no red errors
// Should see component mounting
// Should see API responses
```

---

## ✨ WHAT YOU NOW HAVE

✅ **6 Complete Dashboards**
- Technician Dashboard
- Building Tech Dashboard  
- Maintenance Dashboard
- Tech Director Dashboard
- Accountant Dashboard
- Admin Dashboard

✅ **4-Level Approval Workflow**
- Level 1: Building Technician
- Level 2: Maintenance Organizer
- Level 3: Tech Director
- Level 4: Admin Execution

✅ **Complete Procurement Cycle**
- Quote Request & Comparison
- Purchase Order Creation
- Order Tracking & Delivery
- Invoice Verification
- Payment Processing

✅ **Audit & Compliance**
- Complete activity trail
- User attribution
- Timestamp tracking
- Role-based access logs

---

## 🎯 DEPLOYMENT CHECKLIST

- [ ] Mission 1: Run all 3 SQL migrations in Supabase
- [ ] Mission 2: Update backend .env with Supabase keys
- [ ] Mission 3: Register all API routes in backend
- [ ] Mission 4: Update frontend RFIDLoginPage component
- [ ] Mission 5: Test all 8 workflows
- [ ] Mission 6: Run ./rebuild-1.sh script
- [ ] Mission 7: Verify all services running
- [ ] Mission 8: Monitor logs for errors

---

## 📞 QUICK REFERENCE

**GitHub Branch:** `feature/multi-user-roles-extended-technician`

**Migration Files:**
- `database/migrations/001-item-requests.sql` (already exists)
- `database/migrations/002-manager-dashboards.sql` (NEW)
- `database/migrations/003-role-based-access.sql` (NEW)

**Deployment Time:** ~30 minutes total

**Status:** ✅ **PRODUCTION READY**

---

**Ready to deploy? Follow the 5 steps above and you'll be live in 30 minutes! 🚀**