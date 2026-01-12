# Blade Tracking System - Setup & Initial Configuration Guide

## Quick Start (5 minutes)

### Step 1: Deploy Database Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your PaPlsv3 project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy entire content from `database-migrations/005-blade-lifecycle-tracking.sql`
6. Paste into the editor
7. Click **Run** button
8. Verify "Success" message appears

**Expected Output:**
```
✓ 6 tables created
✓ 12 indexes created
✓ RLS policies enabled
```

### Step 2: Create Initial Blade Types

After migration, add blade types using Supabase SQL:

```sql
-- Insert initial blade types for your machines
INSERT INTO blade_types (name, code, machine_type, description, manufacturer, expected_lifecycle_hours, sharpening_interval_hours, max_sharpenings, cost_per_unit, is_active) VALUES
-- Cotton Pad Cutter Machine (1 machine, multiple blade types)
('Cotton Pad Cutter - Primary Blade', 'CUTTER-001', 'cotton_pad_cutter', 'Main cutting blade for cotton pad machine', 'Premium Supplier', 2000, 100, 20, 150.00, true),
('Cotton Pad Cutter - Secondary Blade', 'CUTTER-002', 'cotton_pad_cutter', 'Secondary cutting blade for cotton pad machine', 'Premium Supplier', 1800, 90, 18, 140.00, true),
('Cotton Pad Cutter - Trim Blade', 'CUTTER-003', 'cotton_pad_cutter', 'Edge trimming blade', 'Premium Supplier', 1500, 75, 15, 120.00, true),
('Cotton Pad Cutter - Perforation Blade', 'CUTTER-004', 'cotton_pad_cutter', 'Perforation punch blade', 'Premium Supplier', 1600, 80, 16, 130.00, true),

-- Wet Wipes Machine 1 (multiple blade configurations)
('Wet Wipes Machine 1 - Cutting Blade', 'WIPES1-001', 'wet_wipes_1', 'Main cutting blade for wet wipes machine 1', 'Premium Supplier', 1800, 90, 18, 140.00, true),
('Wet Wipes Machine 1 - Cross Cut Blade', 'WIPES1-002', 'wet_wipes_1', 'Cross-cutting blade for size reduction', 'Premium Supplier', 1700, 85, 17, 135.00, true),
('Wet Wipes Machine 1 - Sealing Blade', 'WIPES1-003', 'wet_wipes_1', 'Package sealing blade', 'Premium Supplier', 1600, 80, 16, 130.00, true),
('Wet Wipes Machine 1 - Perforation Blade', 'WIPES1-004', 'wet_wipes_1', 'Perforation for easy opening', 'Premium Supplier', 1500, 75, 15, 120.00, true),

-- Wet Wipes Machine 2 (same configuration as machine 1)
('Wet Wipes Machine 2 - Cutting Blade', 'WIPES2-001', 'wet_wipes_2', 'Main cutting blade for wet wipes machine 2', 'Premium Supplier', 1800, 90, 18, 140.00, true),
('Wet Wipes Machine 2 - Cross Cut Blade', 'WIPES2-002', 'wet_wipes_2', 'Cross-cutting blade for size reduction', 'Premium Supplier', 1700, 85, 17, 135.00, true),
('Wet Wipes Machine 2 - Sealing Blade', 'WIPES2-003', 'wet_wipes_2', 'Package sealing blade', 'Premium Supplier', 1600, 80, 16, 130.00, true),
('Wet Wipes Machine 2 - Perforation Blade', 'WIPES2-004', 'wet_wipes_2', 'Perforation for easy opening', 'Premium Supplier', 1500, 75, 15, 120.00, true),

-- Cotton Felt Machine 1
('Cotton Felt Machine 1 - Carding Blade', 'FELT1-001', 'cotton_felt_1', 'Carding/combing blade for cotton felt', 'Premium Supplier', 2200, 110, 22, 160.00, true),
('Cotton Felt Machine 1 - Trimming Blade', 'FELT1-002', 'cotton_felt_1', 'Precision trimming blade', 'Premium Supplier', 1900, 95, 19, 145.00, true),
('Cotton Felt Machine 1 - Cutting Blade', 'FELT1-003', 'cotton_felt_1', 'Main cutting blade', 'Premium Supplier', 2000, 100, 20, 150.00, true),
('Cotton Felt Machine 1 - Finishing Blade', 'FELT1-004', 'cotton_felt_1', 'Final finishing blade', 'Premium Supplier', 1700, 85, 17, 135.00, true),

-- Cotton Felt Machine 2
('Cotton Felt Machine 2 - Carding Blade', 'FELT2-001', 'cotton_felt_2', 'Carding/combing blade for cotton felt', 'Premium Supplier', 2200, 110, 22, 160.00, true),
('Cotton Felt Machine 2 - Trimming Blade', 'FELT2-002', 'cotton_felt_2', 'Precision trimming blade', 'Premium Supplier', 1900, 95, 19, 145.00, true),
('Cotton Felt Machine 2 - Cutting Blade', 'FELT2-003', 'cotton_felt_2', 'Main cutting blade', 'Premium Supplier', 2000, 100, 20, 150.00, true),
('Cotton Felt Machine 2 - Finishing Blade', 'FELT2-004', 'cotton_felt_2', 'Final finishing blade', 'Premium Supplier', 1700, 85, 17, 135.00, true);
```

### Step 3: Update Application Routes

Edit your **routing configuration** (usually `src/App.jsx` or `src/routes.jsx`):

```javascript
import BladeManagement from '@/pages/BladeManagement';

// Add this to your route definitions:
{
  path: '/blade-management',
  element: <BladeManagement />,
  name: 'Blade Management',
  requiredRoles: ['admin', 'supervisor', 'technician']
}
```

### Step 4: Update Navigation Menu

Edit your **navigation component** (usually `src/components/Navigation.jsx` or `src/components/Sidebar.jsx`):

```javascript
import { Wrench } from 'lucide-react';

// Add this menu item:
const navigationItems = [
  // ... existing items
  {
    label: 'Blade Management',
    icon: <Wrench className="w-5 h-5" />,
    href: '/blade-management',
    requiredRoles: ['admin', 'supervisor', 'technician']
  }
];
```

### Step 5: Test the Installation

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Blade Management:**
   - Click on "Blade Management" in main menu
   - You should see empty "Blade Catalog"

3. **Create a test blade:**
   - Click "New Blade" button
   - Select a blade type (e.g., "CUTTER-001")
   - Click "Register Blade"
   - Serial number auto-generates
   - Status: "new"

4. **Verify in Supabase:**
   - Go to Supabase Dashboard
   - Table Editor → blades
   - Should show your new blade

## Component Stubs to Implement

The main BladeManagement page references several child components. Create these files:

### 1. `src/components/blade/BladeCatalog.jsx`
```javascript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const BladeCatalog = ({ blades, onBladeSelect, loading }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Serial Number</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Usage Hours</TableHead>
          <TableHead>Sharpenings</TableHead>
          <TableHead>Machine</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {blades.map(blade => (
          <TableRow key={blade.id}>
            <TableCell className="font-mono">{blade.serial_number}</TableCell>
            <TableCell>{blade.blade_types?.name}</TableCell>
            <TableCell>
              <Badge variant={blade.status === 'active' ? 'default' : 'secondary'}>
                {blade.status}
              </Badge>
            </TableCell>
            <TableCell>{blade.total_usage_hours?.toFixed(2)} hrs</TableCell>
            <TableCell>{blade.total_sharpenings}</TableCell>
            <TableCell>{blade.machines?.name || '-'}</TableCell>
            <TableCell>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onBladeSelect(blade)}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default BladeCatalog;
```

### 2. `src/components/blade/BladeDetail.jsx`
```javascript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BladeDetail = ({ blade, onBladeUpdated, onRefresh }) => {
  if (!blade) return <div>Select a blade</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Blade Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Serial Number</label>
              <p className="text-lg font-mono">{blade.serial_number}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <p className="text-lg">{blade.status}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Blade Type</label>
              <p className="text-lg">{blade.blade_types?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Total Usage Hours</label>
              <p className="text-lg">{blade.total_usage_hours?.toFixed(2)} hrs</p>
            </div>
            <div>
              <label className="text-sm font-medium">Total Sharpenings</label>
              <p className="text-lg">{blade.total_sharpenings}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Current Machine</label>
              <p className="text-lg">{blade.machines?.name || 'Unassigned'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BladeDetail;
```

### 3. Other Component Stubs

Create placeholder components:
- `BladeUsageTracker.jsx` - Track usage sessions
- `BladeSharpeningLog.jsx` - Record sharpening events  
- `BladeAlerts.jsx` - Display and manage alerts
- `NewBladeForm.jsx` - Register new blades

Start with basic implementations showing the data structure, then enhance with full functionality.

## Database Verification

After migration, verify tables exist:

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'blade%';

-- Expected output:
-- blade_types
-- blades
-- blade_usage_logs
-- blade_sharpening_history
-- blade_maintenance_logs
-- blade_alerts

-- Verify blade types were inserted
SELECT code, name, machine_type, expected_lifecycle_hours FROM blade_types ORDER BY code;

-- Expected output: All 20 blade types listed
```

## Testing Workflow

### Test 1: Create and Register Blade
```
1. Navigate to Blade Management
2. Click "New Blade"
3. Select "CUTTER-001"
4. Leave serial number empty (auto-generate)
5. Set purchase date to today
6. Click "Register"
✓ Blade appears in catalog
✓ Serial number auto-generated
✓ Status = "new"
```

### Test 2: Log Usage
```
1. Select the blade
2. Go to "Usage Tracking" tab
3. Click "Start Usage"
4. System shows start time
5. Enter notes "Test material"
6. Wait 1 minute
7. Click "End Usage"
✓ Duration calculated
✓ Total usage hours updated
```

### Test 3: Record Sharpening
```
1. Select the blade
2. Go to "Sharpening Log" tab
3. Click "Record Sharpening"
4. Select method "manual"
5. Enter duration "15 minutes"
6. Click "Record"
✓ Sharpening count incremented
✓ Status changed to "active"
✓ Last sharpening date updated
```

## Troubleshooting

### Issue: "Permission denied" when creating blade
**Solution:**
- Verify RLS policies in Supabase
- Check user role assignments
- Ensure user has 'supervisor' or 'technician' role

### Issue: Serial number generation fails
**Solution:**
- Check blade_types table has data
- Verify timestamp generation in service
- Check browser console for errors

### Issue: Usage hours not calculating
**Solution:**
- Verify end_time is set
- Check bladeUsageService.endUsageSession is called
- Review duration_hours calculation logic

### Issue: Components not rendering
**Solution:**
- Install/import all UI components from shadcn/ui
- Verify Lucide icons are installed
- Check import paths are correct

## Configuration Reference

### Blade Type Parameters

| Parameter | Type | Example | Notes |
|-----------|------|---------|-------|
| name | string | "Cotton Pad Cutter - Primary" | User-friendly name |
| code | string | "CUTTER-001" | Short identifier |
| machine_type | enum | "cotton_pad_cutter" | Links to machines |
| expected_lifecycle_hours | integer | 2000 | Hours before replacement |
| sharpening_interval_hours | integer | 100 | Hours between sharpenings |
| max_sharpenings | integer | 20 | Total times can sharpen |
| cost_per_unit | decimal | 150.00 | Purchase price |

### Blade Status Values

| Status | Meaning | Auto-triggered when |
|--------|---------|---------------------|
| new | Just registered | Blade created |
| active | In use | After first usage |
| in_maintenance | Being serviced | Maintenance created |
| dull | Needs sharpening | Usage exceeds interval |
| damaged | Not usable | Damage reported |
| retired | End of life | Usage exceeds lifecycle |

### Alert Types

| Alert Type | Severity | Triggered | Action |
|------------|----------|-----------|--------|
| sharpening_due | medium | Usage >= interval | Schedule sharpening |
| replacement_due | high | Usage >= lifecycle | Order replacement |
| damage_detected | critical | Damage reported | Stop using, repair |
| lifecycle_exceeded | high | Usage > lifecycle | Retire blade |
| usage_anomaly | medium | Unusual pattern | Investigate |

## Next Steps

1. **Run migration and verify tables**
2. **Create initial blade types using SQL**
3. **Update routing and navigation**
4. **Implement component stubs**
5. **Test basic workflow**
6. **Deploy to production**
7. **Train users on system**

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Component API: See BLADE_TRACKING_IMPLEMENTATION.md

## Performance Tips

1. **Batch load related data** - Use eager joins in queries
2. **Cache blade types** - They change infrequently
3. **Paginate usage logs** - Don't load all history at once
4. **Index by serial number** - Already created for fast lookup
5. **Archive old alerts** - Move resolved alerts periodically

## Security Checklist

- [ ] RLS policies enabled on all blade tables
- [ ] Role-based access control implemented
- [ ] Audit logging working (created_by, updated_by)
- [ ] Serial numbers validated before insert
- [ ] Status transitions validated
- [ ] Sensitive data encrypted (if needed)

You're now ready to use the Blade Lifecycle Tracking System!
