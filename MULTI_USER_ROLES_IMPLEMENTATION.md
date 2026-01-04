# Multi-User Roles & Extended Technician Functionality
## Complete Implementation Guide for PaPlsv3 WMS/CMMS

### 📋 Overview

This implementation extends the technician login interface (`/technician-login`) to support **9 different user role types** with **extended functionality** including:
- ✅ Item restocking capability
- ✅ Role-based access control (RBAC)
- ✅ Building-specific views
- ✅ Audit logging for inventory transactions
- ✅ Conditional UI based on user permissions

---

## 🎯 User Roles

| Role | Description | Can Restock | Can Edit Inventory | Building Specific | Features |
|------|-------------|------------|-------------------|------------------|----------|
| Building 1 Technician | Handles Building 1 | ✅ | ❌ | 1 | Scan & restock only |
| Building 2 Technician | Handles Building 2 | ✅ | ❌ | 2 | Scan & restock only |
| Building 3/5 Technician | Handles Buildings 3 & 5 | ✅ | ❌ | 3,5 | Scan & restock only |
| Building 4 Technician | Handles Building 4 | ✅ | ❌ | 4 | Scan & restock only |
| Maintenance Organizer | Coordinates maintenance | ✅ | ✅ | All | Full access + reports |
| Head Technician | Supervises technicians | ✅ | ✅ | All | Full access + analytics |
| Technical Director | Department lead | ✅ | ✅ | All | Full access + analytics + approvals |
| CEO | Executive | ❌ | ❌ | All | Read-only reports |
| God Admin | System administrator | ✅ | ✅ | All | Full system access |

---

## 🗄️ Database Schema

### 1. Create `technician_roles` Table

```sql
CREATE TABLE technician_roles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  can_restock BOOLEAN DEFAULT FALSE,
  can_edit_inventory BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT FALSE,
  can_approve_inventory BOOLEAN DEFAULT FALSE,
  color VARCHAR(20) DEFAULT 'bg-slate-600',
  icon VARCHAR(50) DEFAULT 'Shield',
  priority INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Update `technicians` Table

```sql
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS role_id BIGINT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS assigned_building JSONB DEFAULT '[]';
ALTER TABLE technicians ADD CONSTRAINT fk_technician_role 
  FOREIGN KEY (role_id) REFERENCES technician_roles(id) ON DELETE SET NULL;
```

### 3. Create `technician_permissions` Table

```sql
CREATE TABLE technician_permissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  role_id BIGINT NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES technician_roles(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission)
);
```

### 4. Create `inventory_restock_log` Table

```sql
CREATE TABLE inventory_restock_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  technician_id BIGINT NOT NULL,
  spare_part_id BIGINT NOT NULL,
  quantity_added INT NOT NULL,
  reason VARCHAR(200),
  previous_quantity INT,
  new_quantity INT,
  building VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
  FOREIGN KEY (spare_part_id) REFERENCES spare_parts(id) ON DELETE CASCADE
);
```

### 5. Seed Initial Roles

```sql
INSERT INTO technician_roles (name, description, can_restock, can_edit_inventory, can_view_reports, can_approve_inventory, color, icon, priority) VALUES
('Building 1 Technician', 'Technician assigned to Building 1', true, false, false, false, 'bg-blue-600', 'Wrench', 1),
('Building 2 Technician', 'Technician assigned to Building 2', true, false, false, false, 'bg-blue-600', 'Wrench', 1),
('Building 3/5 Technician', 'Technician assigned to Buildings 3 & 5', true, false, false, false, 'bg-blue-600', 'Wrench', 1),
('Building 4 Technician', 'Technician assigned to Building 4', true, false, false, false, 'bg-blue-600', 'Wrench', 1),
('Maintenance Organizer', 'Coordinates all maintenance operations', true, true, true, false, 'bg-purple-600', 'Briefcase', 2),
('Head Technician', 'Supervises technical team', true, true, true, true, 'bg-orange-600', 'Crown', 3),
('Technical Director', 'Oversees all technical operations', true, true, true, true, 'bg-red-600', 'Zap', 4),
('CEO', 'Executive leadership - read only', false, false, true, false, 'bg-green-600', 'TrendingUp', 5),
('God Admin', 'System administrator', true, true, true, true, 'bg-slate-800', 'Shield', 99);

-- Insert permissions for each role
INSERT INTO technician_permissions (role_id, permission) 
SELECT id, 'view_inventory' FROM technician_roles;

-- Building technicians: limited permissions
UPDATE technician_permissions SET permission = 'restock_inventory' 
WHERE role_id IN (SELECT id FROM technician_roles WHERE name LIKE '%Building%Technician');

-- Full access roles
INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'approve_restock' FROM technician_roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'God Admin');

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'edit_inventory' FROM technician_roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'God Admin');

INSERT INTO technician_permissions (role_id, permission)
SELECT id, 'view_reports' FROM technician_roles WHERE name IN ('Maintenance Organizer', 'Head Technician', 'Technical Director', 'CEO', 'God Admin');
```

---

## 🔧 Backend API Changes

### 1. Update `/api/auth/rfid-login` Response

**File:** `backend/routes/auth.js`

```javascript
router.post('/rfid-login', async (req, res) => {
  try {
    const { rfid_card_id } = req.body;

    // Find technician with RFID card
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select(`
        *,
        role:technician_roles (
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
      return res.status(401).json({ error: 'Card not recognized' });
    }

    // Get role permissions
    const { data: permissions } = await supabase
      .from('technician_permissions')
      .select('permission')
      .eq('role_id', technician.role_id);

    // Build response with extended info
    res.json({
      success: true,
      technician: {
        id: technician.id,
        name: technician.name,
        email: technician.email,
        rfid_card_id: technician.rfid_card_id,
        role: technician.role,
        assigned_building: technician.assigned_building,
        permissions: permissions?.map(p => p.permission) || []
      },
      session: null // Optional: return Supabase session if needed
    });

  } catch (error) {
    console.error('[RFID Login] Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});
```

### 2. Create `/api/inventory/restock` Endpoint

**File:** `backend/routes/inventory.js`

```javascript
router.post('/inventory/restock', async (req, res) => {
  try {
    const { technician_id, spare_part_id, quantity_added, reason, building } = req.body;

    // Validate technician has restock permission
    const { data: tech } = await supabase
      .from('technicians')
      .select('role_id')
      .eq('id', technician_id)
      .single();

    const { data: permissions } = await supabase
      .from('technician_permissions')
      .select('permission')
      .eq('role_id', tech.role_id)
      .eq('permission', 'restock_inventory');

    if (!permissions?.length) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Get current inventory
    const { data: spare_part } = await supabase
      .from('spare_parts')
      .select('quantity_on_hand')
      .eq('id', spare_part_id)
      .single();

    const previous_qty = spare_part.quantity_on_hand;
    const new_qty = previous_qty + quantity_added;

    // Update inventory
    const { error: updateError } = await supabase
      .from('spare_parts')
      .update({ quantity_on_hand: new_qty })
      .eq('id', spare_part_id);

    if (updateError) throw updateError;

    // Log restock transaction
    const { data: log, error: logError } = await supabase
      .from('inventory_restock_log')
      .insert({
        technician_id,
        spare_part_id,
        quantity_added,
        reason,
        previous_quantity: previous_qty,
        new_quantity: new_qty,
        building
      })
      .select()
      .single();

    if (logError) throw logError;

    res.json({
      success: true,
      message: 'Inventory restocked successfully',
      log,
      new_quantity: new_qty
    });

  } catch (error) {
    console.error('[Restock] Error:', error);
    res.status(500).json({ error: 'Restock failed' });
  }
});
```

### 3. Add Permission Middleware

**File:** `backend/middleware/rolePermissions.js`

```javascript
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const technician_id = req.body.technician_id || req.query.technician_id;
      
      if (!technician_id) {
        return res.status(401).json({ error: 'No technician identified' });
      }

      // Get technician role and check permissions
      const { data: tech } = await supabase
        .from('technicians')
        .select('role_id')
        .eq('id', technician_id)
        .single();

      const { data: perms } = await supabase
        .from('technician_permissions')
        .select('permission')
        .eq('role_id', tech.role_id)
        .eq('permission', permission);

      if (!perms?.length) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};
```

---

## 🎨 Frontend Components

### 1. Create `RolePermissionsContext.jsx`

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

  const canViewReports = useCallback(() => {
    return hasPermission('view_reports');
  }, [hasPermission]);

  const canApproveRestock = useCallback(() => {
    return hasPermission('approve_restock');
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
    canEditInventory,
    canViewReports,
    canApproveRestock
  };

  return (
    <RolePermissionsContext.Provider value={value}>
      {children}
    </RolePermissionsContext.Provider>
  );
};
```

### 2. Create `useRolePermissions` Hook

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

### 3. Update `RFIDLoginPage.jsx`

Add to the `handleLoginSuccess` function:

```javascript
const handleLoginSuccess = async (technician) => {
  console.log('[RFIDLoginPage] Login successful:', technician);
  
  // Update role permissions context
  const { setRole, setPermissions, setBuilding } = useContext(RolePermissionsContext);
  setRole(technician.role);
  setPermissions(technician.permissions || []);
  setBuilding(technician.assigned_building?.[0]);
  
  setTechnicianInfo(technician);
  setIsLoggedIn(true);
};
```

### 4. Create `RestockModal.jsx`

**File:** `src/components/technician/RestockModal.jsx`

```javascript
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const RestockModal = ({ 
  isOpen, 
  onClose, 
  sparePart, 
  technicianId,
  onRestockSuccess 
}) => {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRestock = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Quantity',
        description: 'Please enter a positive number'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_id: technicianId,
          spare_part_id: sparePart.id,
          quantity_added: parseInt(quantity),
          reason: reason || 'Manual restock',
          building: localStorage.getItem('building') || 'Unknown'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Restock failed');
      }

      toast({
        title: 'Success',
        description: `Added ${quantity} units. New total: ${data.new_quantity}`
      });

      onRestockSuccess?.(data);
      onClose();
      setQuantity('');
      setReason('');

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restock: {sparePart?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-slate-100 rounded-lg">
            <p className="text-sm text-slate-600">
              Current Stock: <strong>{sparePart?.quantity_on_hand} units</strong>
            </p>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity to Add</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being restocked?"
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestock}
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restocking...
                </>
              ) : (
                'Confirm Restock'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestockModal;
```

### 5. Update `MaintenanceScanner.jsx`

Add to the scanner component where items are displayed:

```javascript
import RestockModal from './RestockModal';
import { useRolePermissions } from '@/hooks/useRolePermissions';

const MaintenanceScanner = ({ technicianId, ...props }) => {
  const { canRestock } = useRolePermissions();
  const [restockModal, setRestockModal] = useState({
    open: false,
    item: null
  });

  const handleRestockClick = (item) => {
    if (canRestock()) {
      setRestockModal({ open: true, item });
    }
  };

  return (
    <div>
      {/* Existing scanner UI */}
      
      {/* Add restock button for each item */}
      {canRestock() && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRestockClick(scannedItem)}
          className="border-teal-600 text-teal-600 hover:bg-teal-50"
        >
          📦 Restock
        </Button>
      )}

      <RestockModal
        isOpen={restockModal.open}
        onClose={() => setRestockModal({ open: false, item: null })}
        sparePart={restockModal.item}
        technicianId={technicianId}
        onRestockSuccess={(data) => {
          // Update UI, show success message, etc.
          console.log('Restock completed:', data);
        }}
      />
    </div>
  );
};
```

---

## 🚀 Implementation Steps

### Step 1: Database Setup
1. Connect to Supabase
2. Run all SQL migrations in sequence
3. Verify tables and seed data

### Step 2: Backend Implementation
1. Update `/api/auth/rfid-login` endpoint
2. Create `/api/inventory/restock` endpoint
3. Add permission middleware
4. Test API endpoints with Postman

### Step 3: Frontend Implementation
1. Create RolePermissionsContext
2. Create hooks and utilities
3. Update RFIDLoginPage and components
4. Add RestockModal component
5. Update MaintenanceScanner with restock UI

### Step 4: Testing
1. Test login with different RFID cards (different roles)
2. Verify permissions restrict actions correctly
3. Test restock workflow end-to-end
4. Check audit logging
5. Verify UI updates based on role

### Step 5: Deployment
1. Commit changes to feature branch
2. Create Pull Request for code review
3. Test on staging environment
4. Merge to main
5. Deploy to production VPS

---

## 📊 UI Flow Diagram

```
/technician-login (RFIDLoginPage)
  ↓
RFIDLogin Component (scan/manual entry)
  ↓
Authenticate with backend API
  ↓
Get technician data + role + permissions
  ↓
Store in RolePermissionsContext
  ↓
Load MaintenanceScanner
  ├─ Show tabs based on permissions
  ├─ "Restock" button if canRestock()
  └─ RestockModal for restock workflow
```

---

## 🔐 Security Considerations

1. ✅ Backend permission checks (never trust frontend permissions alone)
2. ✅ Audit logging for all inventory changes
3. ✅ Role-based endpoint access control
4. ✅ RFID card authentication tied to specific roles
5. ✅ Building isolation for location-specific roles

---

## 📝 Next Steps

1. Create the necessary database migrations
2. Implement backend API endpoints
3. Build React components
4. Set up comprehensive testing
5. Document user workflows for each role
6. Create admin panel for role management (future)

---

**Branch:** `feature/multi-user-roles-extended-technician`  
**Status:** Ready for implementation  
**Last Updated:** 2026-01-04

