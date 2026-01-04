# Quick Start: Multi-User Roles Implementation
## Step-by-Step Setup Guide

### 🎯 Objective
Implement role-based access control and restocking functionality for the technician login interface.

---

## ⚙️ Phase 1: Database Setup (Today)

### Step 1.1: Connect to Supabase
1. Open [app.supabase.com](https://app.supabase.com)
2. Select your PaPlsv3 project
3. Navigate to **SQL Editor**

### Step 1.2: Run Database Migration
1. Click **New Query**
2. Open file: `database-migrations/001-create-roles-schema.sql`
3. Copy ALL content
4. Paste into Supabase SQL Editor
5. Click **Run** (or press Ctrl+Enter)

**Expected Output:**
```
Success. No rows returned.
```

### Step 1.3: Verify Schema Creation
Run these queries one by one to confirm:

```sql
-- Check roles table
SELECT * FROM technician_roles;
-- Should show 9 rows

-- Check permissions table
SELECT COUNT(*) as permission_count FROM technician_permissions;
-- Should show multiple rows

-- Check restock log table exists
SELECT * FROM inventory_restock_log LIMIT 1;
-- Should work (may be empty)
```

### Step 1.4: Assign Roles to Existing Technicians
```sql
-- Example: Assign Building 1 Technician role
-- Get the role ID first
SELECT id FROM technician_roles WHERE name = 'Building 1 Technician';

-- Then update your technician (replace 1 with actual technician id)
UPDATE technicians 
SET role_id = (SELECT id FROM technician_roles WHERE name = 'Building 1 Technician'),
    assigned_building = '["Building 1"]'
WHERE id = 1;
```

✅ **Phase 1 Complete!** Database is ready.

---

## 🔧 Phase 2: Backend API Development

### Step 2.1: Prepare Backend Directory
```bash
# Navigate to backend
cd backend

# Check structure
ls -la routes/
# Should show: auth.js, inventory.js, etc.
```

### Step 2.2: Update `/api/auth/rfid-login` Endpoint

**File:** `backend/routes/auth.js`

Replace the RFID login handler with:

```javascript
router.post('/rfid-login', async (req, res) => {
  try {
    const { rfid_card_id } = req.body;

    console.log('[RFID Login] Card ID:', rfid_card_id);

    // Find technician with role and permissions
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select(`
        id,
        name,
        email,
        rfid_card_id,
        role_id,
        assigned_building,
        role:role_id (
          id,
          name,
          description,
          can_restock,
          can_edit_inventory,
          can_view_reports,
          can_approve_inventory,
          color,
          icon,
          priority
        )
      `)
      .eq('rfid_card_id', rfid_card_id)
      .single();

    if (techError || !technician) {
      console.error('[RFID Login] Card not found:', techError);
      return res.status(401).json({ error: 'Card not recognized' });
    }

    // Get permissions for this role
    const { data: permissions, error: permError } = await supabase
      .from('technician_permissions')
      .select('permission')
      .eq('role_id', technician.role_id);

    if (permError) {
      console.error('[RFID Login] Permission fetch error:', permError);
      return res.status(500).json({ error: 'Permission check failed' });
    }

    const permissionList = permissions?.map(p => p.permission) || [];

    console.log('[RFID Login] Success for:', technician.name, 'Role:', technician.role?.name);

    // Return enhanced response
    res.json({
      success: true,
      technician: {
        id: technician.id,
        name: technician.name,
        email: technician.email,
        rfid_card_id: technician.rfid_card_id,
        role: technician.role,
        assigned_building: technician.assigned_building || [],
        permissions: permissionList
      }
    });

  } catch (error) {
    console.error('[RFID Login] Error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});
```

### Step 2.3: Create `/api/inventory/restock` Endpoint

**File:** `backend/routes/inventory.js` (create if doesn't exist)

```javascript
import express from 'express';
import { supabase } from '../lib/supabaseClient.js';

const router = express.Router();

// POST /api/inventory/restock
router.post('/restock', async (req, res) => {
  try {
    const { technician_id, spare_part_id, quantity_added, reason, building } = req.body;

    console.log('[Restock] Request:', { technician_id, spare_part_id, quantity_added });

    // Validate input
    if (!technician_id || !spare_part_id || !quantity_added) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (quantity_added <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }

    // Verify technician has restock permission
    const { data: tech } = await supabase
      .from('technicians')
      .select('role_id')
      .eq('id', technician_id)
      .single();

    if (!tech) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    const { data: perms } = await supabase
      .from('technician_permissions')
      .select('permission')
      .match({ role_id: tech.role_id, permission: 'restock_inventory' });

    if (!perms || perms.length === 0) {
      console.log('[Restock] Permission denied for technician:', technician_id);
      return res.status(403).json({ error: 'Permission denied: Cannot restock' });
    }

    // Get current inventory
    const { data: spare_part } = await supabase
      .from('spare_parts')
      .select('id, quantity_on_hand')
      .eq('id', spare_part_id)
      .single();

    if (!spare_part) {
      return res.status(404).json({ error: 'Spare part not found' });
    }

    const previous_qty = spare_part.quantity_on_hand || 0;
    const new_qty = previous_qty + parseInt(quantity_added);

    // Update inventory
    const { error: updateError } = await supabase
      .from('spare_parts')
      .update({ quantity_on_hand: new_qty, updated_at: new Date().toISOString() })
      .eq('id', spare_part_id);

    if (updateError) {
      console.error('[Restock] Update error:', updateError);
      throw updateError;
    }

    // Log the transaction
    const { data: log, error: logError } = await supabase
      .from('inventory_restock_log')
      .insert({
        technician_id: parseInt(technician_id),
        spare_part_id: parseInt(spare_part_id),
        quantity_added: parseInt(quantity_added),
        reason: reason || 'Manual restock',
        previous_quantity: previous_qty,
        new_quantity: new_qty,
        building: building || 'Unknown'
      })
      .select()
      .single();

    if (logError) {
      console.error('[Restock] Log error:', logError);
      throw logError;
    }

    console.log('[Restock] Success:', log);

    res.json({
      success: true,
      message: `Added ${quantity_added} units to inventory`,
      log,
      previous_quantity: previous_qty,
      new_quantity: new_qty
    });

  } catch (error) {
    console.error('[Restock] Error:', error);
    res.status(500).json({ 
      error: 'Restock failed', 
      details: error.message 
    });
  }
});

export default router;
```

### Step 2.4: Register Inventory Routes

**File:** `backend/index.js` or main app file

```javascript
import inventoryRoutes from './routes/inventory.js';

// Add this with other route registrations
app.use('/api/inventory', inventoryRoutes);
```

### Step 2.5: Test Backend Endpoints

Using **Postman** or **cURL**:

**Test 1: RFID Login with Role**
```bash
curl -X POST http://localhost:5000/api/auth/rfid-login \
  -H "Content-Type: application/json" \
  -d '{
    "rfid_card_id": "YOUR_RFID_CARD_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "technician": {
    "id": 1,
    "name": "John Technician",
    "role": {
      "id": 1,
      "name": "Building 1 Technician",
      "can_restock": true
    },
    "permissions": ["view_inventory", "restock_inventory"]
  }
}
```

**Test 2: Restock Item**
```bash
curl -X POST http://localhost:5000/api/inventory/restock \
  -H "Content-Type: application/json" \
  -d '{
    "technician_id": 1,
    "spare_part_id": 5,
    "quantity_added": 10,
    "reason": "Stock replenishment",
    "building": "Building 1"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Added 10 units to inventory",
  "previous_quantity": 5,
  "new_quantity": 15,
  "log": {
    "id": 1,
    "technician_id": 1,
    "spare_part_id": 5,
    "quantity_added": 10
  }
}
```

✅ **Phase 2 Complete!** Backend endpoints working.

---

## 🎨 Phase 3: Frontend Implementation

### Step 3.1: Create Context

**File:** `src/contexts/RolePermissionsContext.jsx`

```javascript
import React, { createContext, useState, useCallback } from 'react';

export const RolePermissionsContext = createContext();

export const RolePermissionsProvider = ({ children }) => {
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [building, setBuilding] = useState(null);

  const hasPermission = useCallback((permission) => {
    return permissions.includes(permission);
  }, [permissions]);

  const canRestock = useCallback(() => {
    return hasPermission('restock_inventory');
  }, [hasPermission]);

  const canEditInventory = useCallback(() => {
    return hasPermission('edit_inventory');
  }, [hasPermission]);

  const value = {
    role,
    setRole,
    permissions,
    setPermissions,
    building,
    setBuilding,
    hasPermission,
    canRestock,
    canEditInventory
  };

  return (
    <RolePermissionsContext.Provider value={value}>
      {children}
    </RolePermissionsContext.Provider>
  );
};
```

### Step 3.2: Create Hook

**File:** `src/hooks/useRolePermissions.js`

```javascript
import { useContext } from 'react';
import { RolePermissionsContext } from '@/contexts/RolePermissionsContext';

export const useRolePermissions = () => {
  const context = useContext(RolePermissionsContext);
  if (!context) {
    throw new Error('useRolePermissions must be used within RolePermissionsProvider');
  }
  return context;
};
```

### Step 3.3: Wrap App with Provider

**File:** `src/App.jsx`

```javascript
import { RolePermissionsProvider } from '@/contexts/RolePermissionsContext';

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <RolePermissionsProvider>
          <AuthProvider>
            {/* ... rest of app ... */}
          </AuthProvider>
        </RolePermissionsProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
```

### Step 3.4: Update RFIDLoginPage

**File:** `src/pages/RFIDLoginPage.jsx`

Update `handleLoginSuccess`:

```javascript
const handleLoginSuccess = async (technician) => {
  const { setRole, setPermissions, setBuilding } = useContext(RolePermissionsContext);
  
  setRole(technician.role);
  setPermissions(technician.permissions || []);
  setBuilding(technician.assigned_building?.[0]);
  
  setTechnicianInfo(technician);
  setIsLoggedIn(true);
};
```

Add role display in the session info:

```javascript
<div className="flex items-center gap-3 flex-1">
  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
  <div>
    <p className="text-sm text-blue-900 font-medium">
      {txt.sessionActive} - {technicianInfo?.role?.name}
    </p>
    <p className="text-xs text-blue-700 mt-1">
      {txt.name}: {technicianInfo?.name} | {txt.id}: {technicianInfo?.id}
    </p>
  </div>
</div>
```

✅ **Phase 3 Complete!** Frontend ready for technician roles.

---

## 🧪 Phase 4: Testing Checklist

- [ ] Database migration executed without errors
- [ ] 9 roles appear in `technician_roles` table
- [ ] Technicians assigned to roles
- [ ] Backend API returns role in RFID login
- [ ] `/api/inventory/restock` endpoint responds to POST
- [ ] Permission checks work (reject unauthorized users)
- [ ] Restock increments inventory in database
- [ ] Audit log records each restock
- [ ] Frontend displays role name after login
- [ ] No console errors in browser

---

## 🚀 Deployment Steps

### On VPS:
```bash
# 1. Pull latest changes
cd /var/www/PaPlsv3
git pull origin feature/multi-user-roles-extended-technician

# 2. Install dependencies (if needed)
npm install

# 3. Build frontend
npm run build

# 4. Restart backend
sudo systemctl restart paplsv3-backend

# 5. Verify
curl http://localhost:5000/api/auth/rfid-login
```

---

## 📞 Troubleshooting

### Database Issues
```sql
-- Check if roles exist
SELECT COUNT(*) FROM technician_roles;
-- Should return 9

-- Check if permissions exist
SELECT * FROM technician_permissions WHERE role_id = 1;

-- Reset if needed
DROP TABLE IF EXISTS inventory_restock_log CASCADE;
DROP TABLE IF EXISTS technician_permissions CASCADE;
DROP TABLE IF EXISTS technician_roles CASCADE;
-- Then re-run migration
```

### Backend Issues
```bash
# Check logs
tail -f backend/logs/app.log

# Test connection to Supabase
curl -X GET "https://YOUR_PROJECT.supabase.co/rest/v1/technician_roles" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "apikey: YOUR_KEY"
```

### Frontend Issues
- Check browser DevTools Console
- Verify Context is wrapped around app
- Check that RFID login endpoint is accessible

---

## ✅ Success!

When everything works:
1. User scans RFID card at `/technician-login`
2. System returns user role and permissions
3. If user has `restock_inventory` permission, a "Restock" button appears
4. Clicking button opens RestockModal
5. Submitting restock calls backend, updates inventory, logs transaction
6. Audit trail is created in `inventory_restock_log`

🎉 **Implementation Complete!**

---

**Questions?** Check `MULTI_USER_ROLES_IMPLEMENTATION.md` for detailed documentation.

