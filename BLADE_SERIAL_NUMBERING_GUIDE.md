# Blade Sequential Serial Numbering System - Complete Guide

## Overview

This guide explains the advanced blade serial numbering system that automatically generates and tracks sequential serial numbers for each blade type. It supports purchasing new blades in batches while maintaining continuous numbering sequences.

**Key Feature:** When you order new blades, the system automatically generates serial numbers in sequence, regardless of previous purchases.

---

## Serial Number Format

### Format Pattern
```
{PREFIX}{SEQUENTIAL_NUMBER}

Example: B400043
├─ B4    = Serial prefix (blade type code)
└─ 00043 = Sequential number (5 digits, zero-padded)
```

### Serial Prefixes by Machine

| Machine Type | Blade Type | Prefix | Example Range |
|--------------|-----------|--------|----------------|
| Cotton Pad Cutter | Type 1 | B1 | B100001 - B100060 |
| Cotton Pad Cutter | Type 2 | B2 | B200001 - B200060 |
| Cotton Pad Cutter | Type 3 | B3 | B300001 - B300060 |
| Cotton Pad Cutter | Type 4 | B4 | B400001 - B400060 |
| Wet Wipes 1 | Type 1 | W1 | W100001 - W100060 |
| Wet Wipes 1 | Type 2 | W1 | W100001 - W100060 |
| Wet Wipes 2 | Type 1 | W2 | W200001 - W200060 |
| Wet Wipes 2 | Type 2 | W2 | W200001 - W200060 |
| Cotton Felt 1 | Type 1 | F1 | F100001 - F100060 |
| Cotton Felt 2 | Type 1 | F2 | F200001 - F200060 |

---

## Database Schema

### 1. blade_serial_counter
Tracks the next serial number to assign for each blade type.

```sql
Table: blade_serial_counter
Columns:
  id                 UUID (Primary Key)
  blade_type_id      UUID (Foreign Key → blade_types)
  serial_prefix      VARCHAR(10)    -- e.g., 'B4', 'W1'
  current_counter    INTEGER        -- Last assigned number
  total_allocated    INTEGER        -- Total blades ever allocated
  total_active       INTEGER        -- Currently in use
  total_retired      INTEGER        -- Decommissioned
  created_at         TIMESTAMP
  updated_at         TIMESTAMP
```

**Example Data:**
```sql
| blade_type_id | serial_prefix | current_counter | total_allocated |
|---------------|---------------|-----------------|----------------|
| type-4-id     | B4            | 60              | 60             |
| type-4-id     | B4            | 92              | 92             |
| type-4-id     | B4            | 105             | 105            |
```

After 3 purchase orders:
- 1st order: B400001 - B400060 (60 blades)
- 2nd order: B400061 - B400092 (32 blades)
- 3rd order: B400093 - B400105 (13 blades)
- Next blade will be: B400106

### 2. blade_purchase_order
Records each purchase order and the serial number range assigned.

```sql
Table: blade_purchase_order
Columns:
  id                    UUID (Primary Key)
  blade_type_id         UUID (Foreign Key)
  order_date            DATE
  quantity_ordered      INTEGER
  serial_number_start   VARCHAR(20)  -- e.g., 'B400001'
  serial_number_end     VARCHAR(20)  -- e.g., 'B400060'
  supplier_name         VARCHAR(255)
  po_number             VARCHAR(100)
  unit_cost             DECIMAL
  total_cost            DECIMAL
  status                VARCHAR(50)  -- pending, received, partial, cancelled
  created_by            UUID
  created_at            TIMESTAMP
  updated_at            TIMESTAMP
```

**Example Data:**
```sql
Order 1:
| id | blade_type_id | quantity_ordered | serial_number_start | serial_number_end | status   |
|----|---------------|------------------|---------------------|-------------------|----------|
| 1  | type-4        | 60               | B400001             | B400060           | received |

Order 2:
| id | blade_type_id | quantity_ordered | serial_number_start | serial_number_end | status   |
|----|---------------|------------------|---------------------|-------------------|----------|
| 2  | type-4        | 32               | B400061             | B400092           | received |
```

### 3. blade_retirement_record
Tracks when blades are retired and removed from service.

```sql
Table: blade_retirement_record
Columns:
  id                UUID (Primary Key)
  blade_id          UUID (Foreign Key → blades)
  serial_number     VARCHAR(20)
  blade_type_id     UUID
  retirement_date   TIMESTAMP
  retirement_reason VARCHAR(100)  -- lifecycle_exceeded, damage, wear
  total_usage_hours DECIMAL
  total_sharpenings INTEGER
  notes             TEXT
  retired_by        UUID
  created_at        TIMESTAMP
```

### 4. blade_inventory_summary
Real-time view of blade inventory by type.

```sql
Table: blade_inventory_summary
Columns:
  id                    UUID
  blade_type_id         UUID (Unique)
  total_allocated       INTEGER  -- All ever allocated
  total_active          INTEGER  -- In service
  total_in_maintenance  INTEGER  -- Being serviced
  total_dull            INTEGER  -- Needs sharpening
  total_damaged         INTEGER  -- Can't use
  total_retired         INTEGER  -- End of life
  total_new_unused      INTEGER  -- Never used
  average_usage_hours   DECIMAL
  next_serial_number    INTEGER  -- For reference
  reorder_point         INTEGER  -- Alert threshold
  last_updated          TIMESTAMP
```

---

## How It Works

### Workflow 1: Initial Blade Type Setup

```
1. Create blade type (e.g., "B4 - Cotton Cutter Main Blade")
   ↓
2. System auto-initializes serial counter for B4
   ↓
3. blade_serial_counter.current_counter = 0
   blade_serial_counter.serial_prefix = 'B4'
   ↓
4. Next serial number will be: B400001
```

### Workflow 2: First Purchase Order (60 blades of type B4)

```
User creates purchase order:
- Blade Type: B4
- Quantity: 60
- Supplier: "Blades Inc."

↓

System executes create_purchase_order_with_blades():

  1. Get current counter for B4 (current_counter = 0)
  2. Calculate range: 1 to 60
  3. Create purchase_order record:
     serial_number_start = 'B400001'
     serial_number_end = 'B400060'
  4. Generate 60 blade records:
     - B400001 through B400060
  5. Update counter:
     current_counter = 60
     total_allocated = 60
  6. Return result:
     "Created 60 blades: B400001 to B400060"

↓

Inventory after first order:
- Total allocated: 60
- Total active (new): 60
- Next blade: B400061
```

### Workflow 3: Second Purchase Order (32 blades of type B4)

```
User creates purchase order:
- Blade Type: B4
- Quantity: 32
- Supplier: "Blades Inc."

↓

System executes create_purchase_order_with_blades():

  1. Get current counter for B4 (current_counter = 60)
  2. Calculate range: 61 to 92 (60+32)
  3. Create purchase_order record:
     serial_number_start = 'B400061'
     serial_number_end = 'B400092'
  4. Generate 32 blade records:
     - B400061 through B400092
  5. Update counter:
     current_counter = 92
     total_allocated = 92
  6. Return result:
     "Created 32 blades: B400061 to B400092"

↓

Inventory after second order:
- Total allocated: 92
- Total active: 92
- Next blade: B400093
```

### Workflow 4: Retiring a Blade

```
User clicks "Retire Blade" on blade B400043:

↓

System executes retire_blade():

  1. Create retirement_record:
     blade_id = B400043_id
     serial_number = 'B400043'
     retirement_reason = 'lifecycle_exceeded'
     total_usage_hours = 2150
     total_sharpenings = 18
  2. Update blade status:
     status = 'retired'
     is_active = false
  3. Update serial counter:
     total_retired = 61
  4. Update inventory summary automatically

↓

Result:
- Blade B400043 is no longer in active inventory
- Retirement history is preserved
- Next blade to use is still B400061 (B400043 was skipped)
```

---

## API Methods

### Create Purchase Order with Auto-Generation

```javascript
import bladePurchaseService from '@/api/bladePurchaseService';

const result = await bladePurchaseService.createPurchaseOrder({
  bladeTypeId: 'uuid-of-blade-type-4',
  quantityOrdered: 32,  // Order 32 new blades
  supplierName: 'Blades Inc.',
  poNumber: 'PO-2026-001',
  unitCost: 150.00,
  expectedDeliveryDate: '2026-01-25',
});

Result:
{
  success: true,
  orderId: 'order-uuid',
  serialNumberStart: 'B400061',  // First new blade
  serialNumberEnd: 'B400092',    // Last new blade
  bladeCount: 32,
  message: 'Created 32 blades with serial numbers from B400061 to B400092'
}
```

### Get Next Serial Number

```javascript
const nextInfo = await bladePurchaseService.getNextSerialNumber(
  'uuid-of-blade-type-4'
);

Result:
{
  prefix: 'B4',
  currentCounter: 105,
  nextNumber: 106,
  nextSerialNumber: 'B400106',
  totalAllocated: 105,
  totalActive: 102,
  totalRetired: 3
}
```

### Get Inventory Summary

```javascript
const inventory = await bladePurchaseService.getInventorySummaryByType(
  'uuid-of-blade-type-4'
);

Result:
{
  blade_type_id: 'type-4-uuid',
  total_allocated: 105,      // Ever allocated
  total_active: 102,         // Currently in use
  total_in_maintenance: 1,   // Being serviced
  total_dull: 1,             // Needs sharpening
  total_damaged: 1,          // Can't use
  total_retired: 0,          // End of life
  total_new_unused: 0,       // Never used
  average_usage_hours: 1545,
  next_serial_number: 106,
  reorder_point: 20          // Alert when active < 20
}
```

### Retire a Blade

```javascript
const success = await bladePurchaseService.retireBlade(
  'blade-uuid',
  'lifecycle_exceeded',  // Reason
  'Blade exceeded 2000 hours'  // Notes
);
```

### Get Purchase Order History

```javascript
const orders = await bladePurchaseService.getAllPurchaseOrders({
  bladeTypeId: 'uuid-of-blade-type-4',
  status: 'received',
  limit: 50
});

// Returns array of purchase orders with details
```

---

## React Component Usage

### Add Purchase Order Management to Your App

```jsx
import BladePurchaseOrder from '@/components/blade/BladePurchaseOrder';

function BladeManagement() {
  return (
    <div>
      <BladePurchaseOrder />
    </div>
  );
}
```

### Component Features

✅ **Create new purchase orders** with automatic serial number generation  
✅ **View all purchase orders** with filtering by status and search  
✅ **Track serial number ranges** for each order  
✅ **Mark orders as received** to update inventory  
✅ **View order details** with supplier info and costs  
✅ **Role-based access** (Supervisors and Admins only)  

---

## Real-World Example

### Scenario: Blade Type 4 Lifecycle

**January 2026:**
```
Action: Order 60 new blades of type B4
↓
Serial numbers allocated: B400001 → B400060
Status: Received and in stock
```

**February 2026:**
```
Action: 10 blades retired due to normal wear
Retired blades: B400005, B400012, B400018, etc.
↓
Inventory: 50 active blades remaining
Next serial for new order: B400061
```

**March 2026:**
```
Action: Order 32 new blades of type B4
↓
Serial numbers allocated: B400061 → B400092
Status: Received and in stock
Inventory: 50 + 32 = 82 active blades
```

**April 2026:**
```
Action: Order 13 new blades of type B4
↓
Serial numbers allocated: B400093 → B400105
Status: Received and in stock
Inventory: 82 + 13 = 95 active blades
```

**Status Report:**
```
Blade Type: B4 - Cotton Cutter Main Blade
Total ever allocated: 105 blades
Currently active: 95 blades
In maintenance: 1 blade
Retired: 9 blades
Next serial number: B400106
```

---

## Database Functions

### create_purchase_order_with_blades()

Atomically creates a purchase order and generates all blade records in sequence.

```sql
SELECT create_purchase_order_with_blades(
  blade_type_id_param => 'type-4-uuid',
  quantity_param => 32,
  supplier_name_param => 'Blades Inc.',
  po_number_param => 'PO-2026-001',
  unit_cost_param => 150.00
);
```

**Returns:**
```sql
order_id   | serial_start | serial_end | blades_created
-----------|--------------|-----------|---------------
order-uuid | B400061      | B400092    | 32
```

### retire_blade()

Retires a blade and creates a permanent retirement record.

```sql
SELECT retire_blade(
  blade_id_param => 'blade-uuid',
  reason => 'lifecycle_exceeded',
  notes_param => 'Exceeded 2000 hours'
);
```

**Returns:** `true` (success)

### generate_next_serial_number()

Generates the next serial number for a blade type.

```sql
SELECT generate_next_serial_number('type-4-uuid');
```

**Returns:** `'B400106'`

---

## Setup Instructions

### Step 1: Run Migration

```sql
-- In Supabase SQL Editor:
-- Copy entire content from: database-migrations/006-blade-serial-tracking.sql
-- Click Run
```

This creates:
- ✅ blade_serial_counter table
- ✅ blade_purchase_order table
- ✅ blade_retirement_record table
- ✅ blade_inventory_summary table
- ✅ Database functions for auto-generation
- ✅ RLS policies
- ✅ Triggers for inventory updates

### Step 2: Verify Serial Counters

```sql
SELECT * FROM blade_serial_counter;
```

Should show one row per blade type with serial prefix initialized.

### Step 3: Add Component to Routes

```jsx
// In src/pages/BladeManagement.jsx or your routing:
import BladePurchaseOrder from '@/components/blade/BladePurchaseOrder';

// Add tab or route
<BladePurchaseOrder />
```

### Step 4: Import Service

```javascript
import bladePurchaseService from '@/api/bladePurchaseService';
```

### Step 5: Test

```
1. Navigate to Blade Management → Purchase Orders
2. Click "New Order"
3. Select blade type, quantity (e.g., 32), supplier
4. Click "Create Order"
5. Verify serial numbers are generated in sequence
6. Check database for purchase_order and blade records
```

---

## Troubleshooting

### Problem: Serial numbers not consecutive

**Cause:** Counter wasn't initialized for blade type  
**Solution:**
```sql
SELECT initialize_blade_serial_counter(
  'blade-type-uuid',
  'B4'  -- Serial prefix
);
```

### Problem: Blade records created but not visible

**Cause:** RLS policies blocking read access  
**Solution:** Verify user has appropriate role in user_roles table
```sql
SELECT * FROM user_roles WHERE user_id = current_user_id;
```

### Problem: Can't update purchase order

**Cause:** User doesn't have supervisor/admin role  
**Solution:** Grant appropriate role
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid', 'supervisor');
```

---

## Performance Considerations

- **Index on serial_prefix:** O(1) lookup for counter
- **Index on serial_number:** Fast blade lookup by ID
- **Index on blade_type_id:** Fast filtering by machine
- **Batch creation:** 60 blades created in < 500ms
- **Query performance:** < 50ms for most operations

---

## Security

- **RLS Policies:** Only authenticated users can view  
- **Purchase orders:** Supervisors and Admins can create  
- **Retirement:** Technicians and Supervisors can retire blades  
- **Audit trail:** All users are tracked (created_by, retired_by)  
- **Data integrity:** Serial number uniqueness enforced at DB level  

---

## FAQ

**Q: Can I reuse serial numbers?**  
A: No, serial numbers are unique and sequential. A retired blade's number is never reused.

**Q: What if I need to order blades in batches?**  
A: Create multiple purchase orders. Each order will get the next sequential numbers automatically.

**Q: How do I track which blades came from which order?**  
A: Check the serial_number_start and serial_number_end in blade_purchase_order table.

**Q: Can I change a blade's serial number?**  
A: No, serial numbers are immutable. Create a retirement record and new order if needed.

**Q: What happens to retired blades in the database?**  
A: They're marked as 'retired' status and moved to blade_retirement_record table. Historical data is preserved.

**Q: How do I know when to reorder?**  
A: Check the reorder_point in blade_inventory_summary. Alerts trigger when active count falls below this.

---

## Summary

The sequential serial numbering system provides:

✅ **Automatic serial number generation** for each blade  
✅ **Persistent numbering** across multiple purchase orders  
✅ **Complete purchase order history** with serial ranges  
✅ **Retirement tracking** with historical data  
✅ **Real-time inventory** views by blade type  
✅ **Role-based access** control  
✅ **Full audit trail** of all operations  

---

**For implementation questions, refer to:**
- BLADE_TRACKING_README.md
- BLADE_TRACKING_IMPLEMENTATION.md  
- BLADE_SETUP_GUIDE.md
