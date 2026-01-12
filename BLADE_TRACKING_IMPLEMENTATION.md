# Blade Lifecycle Tracking System - Implementation Guide

## Overview

This document describes the complete implementation of the Blade Lifecycle Tracking System for the PaPlsv3 WMS/CMMS platform. The system tracks 20 types of cutting blades/knives used across 5 production machines:

### Machines Tracked
- **Cotton Pad Cutter** (1 machine)
- **Wet Wipes Machine 1** (1 machine)
- **Wet Wipes Machine 2** (1 machine)
- **Cotton Felt Machine 1** (1 machine)
- **Cotton Felt Machine 2** (1 machine)

## System Architecture

### 1. Database Schema

The system uses 6 main tables in Supabase PostgreSQL:

#### `blade_types`
Defines different types/models of blades available

```sql
- id: UUID (primary key)
- name: String
- code: String (unique identifier like "CUTTER-001")
- description: Text
- machine_type: Enum (cotton_pad_cutter, wet_wipes_1, wet_wipes_2, cotton_felt_1, cotton_felt_2)
- manufacturer: String
- cost_per_unit: Decimal
- expected_lifecycle_hours: Integer (before replacement)
- sharpening_interval_hours: Integer (hours between sharpenings)
- max_sharpenings: Integer (times a blade can be sharpened)
- is_active: Boolean
- created_by, updated_by: UUID references
- created_at, updated_at: Timestamps
```

#### `blades`
Individual blade units with unique serial numbers

```sql
- id: UUID (primary key)
- blade_type_id: UUID (foreign key)
- serial_number: String (unique - auto-generated if not provided)
- asset_number: String (optional inventory number)
- purchase_date: Date
- installation_date: Date
- status: Enum (new, active, in_maintenance, dull, damaged, retired)
- total_usage_hours: Decimal (cumulative)
- total_sharpenings: Integer (count)
- last_sharpening_date: Timestamp
- last_usage_date: Timestamp
- current_machine_id: UUID (which machine it's in)
- location_notes: Text
- notes: Text
- is_active: Boolean
- created_by, updated_by: UUID
- created_at, updated_at: Timestamps
```

#### `blade_usage_logs`
Detailed usage tracking for each blade

```sql
- id: UUID
- blade_id: UUID (foreign key)
- machine_id: UUID (where it was used)
- start_time: Timestamp
- end_time: Timestamp
- duration_hours: Decimal (calculated)
- cut_count: Integer (optional)
- material_processed: String
- operator_id: UUID (who operated)
- notes: Text
- created_at, updated_at: Timestamps
```

#### `blade_sharpening_history`
Tracks all sharpening events

```sql
- id: UUID
- blade_id: UUID
- sharpening_number: Integer (1st, 2nd, 3rd sharpening, etc.)
- sharpening_date: Timestamp
- sharpened_by: UUID (technician)
- sharpening_method: String (manual, automated, professional_service)
- duration_minutes: Integer
- notes: Text
- next_sharpening_scheduled_date: Date
- created_at, updated_at: Timestamps
```

#### `blade_maintenance_logs`
General maintenance and inspection records

```sql
- id: UUID
- blade_id: UUID
- maintenance_type: Enum (sharpening, inspection, repair, cleaning, storage)
- status: Enum (scheduled, in_progress, completed, failed)
- start_date: Timestamp
- end_date: Timestamp
- technician_id: UUID
- description: Text
- findings: Text
- recommendations: Text
- cost: Decimal
- parts_replaced: Text
- notes: Text
- created_at, updated_at: Timestamps
```

#### `blade_alerts`
Automatically generated alerts for maintenance/replacement needs

```sql
- id: UUID
- blade_id: UUID
- alert_type: Enum (replacement_due, sharpening_due, damage_detected, lifecycle_exceeded, usage_anomaly)
- severity: Enum (low, medium, high, critical)
- message: Text
- is_resolved: Boolean
- resolved_at: Timestamp
- resolved_by: UUID
- created_at, updated_at: Timestamps
```

### 2. API Service Layer (`src/api/bladeService.js`)

Comprehensive service for all blade operations:

#### `bladeTypeService`
- `getAll(machineType?)` - Get all blade types, optionally filtered by machine
- `getById(id)` - Get specific blade type
- `create(bladeTypeData)` - Create new blade type
- `update(id, updates)` - Update blade type

#### `bladeService`
- `getAll(filters)` - Get all blades with filtering
- `getBySerialNumber(serialNumber)` - Search blade by serial number
- `getById(id)` - Get complete blade details
- `create(bladeData)` - Register new blade (auto-generates serial if needed)
- `update(id, updates)` - Update blade information
- `checkAndUpdateStatus(id)` - Auto-check lifecycle and create alerts
- `getUsageSinceDate(bladeId, sinceDate)` - Calculate usage since date

#### `bladeUsageService`
- `getBladeUsageLogs(bladeId, limit)` - Get usage history
- `logUsage(bladeId, machineId, usageData)` - Record usage session
- `endUsageSession(logId)` - End and calculate usage duration

#### `bladeSharpeningService`
- `getHistory(bladeId)` - Get sharpening history
- `recordSharpening(bladeId, sharpeningData)` - Log sharpening event

#### `bladeMaintenanceService`
- `getMaintenanceLogs(bladeId)` - Get maintenance history
- `createMaintenanceLog(bladeId, maintenanceData)` - Create maintenance record
- `updateMaintenanceStatus(logId, status, endData)` - Update maintenance status

#### `bladeAlertService`
- `getActiveAlerts(bladeId?)` - Get unresolved alerts
- `getAllAlerts(bladeId?, limit)` - Get all alerts
- `create(bladeId, alertData)` - Create new alert
- `resolve(alertId)` - Mark alert as resolved
- `getAlertSummary()` - Get statistics on active alerts

### 3. React Components

#### `BladeManagement.jsx` (Main Page)
Main interface with tabs for different blade management tasks:
- Blade Catalog view with search and filtering
- Blade Details view
- Usage Tracking
- Sharpening Log
- Alert Management

#### `BladeCatalog.jsx`
Displays all blades in a table with:
- Serial number
- Blade type
- Current status with color coding
- Usage hours
- Sharpening count
- Quick actions

#### `BladeDetail.jsx`
Detailed view of a single blade showing:
- Blade information and specifications
- Current status and lifecycle metrics
- Usage statistics
- Maintenance history
- Alert history
- Edit capabilities

#### `BladeUsageTracker.jsx`
Track blade usage with:
- Start/end usage sessions
- Duration calculation
- Material processed tracking
- Usage log history
- Total usage statistics

#### `BladeSharpeningLog.jsx`
Sharpening management:
- Record new sharpening event
- Sharpening history timeline
- Method tracking (manual, automated, professional)
- Schedule next sharpening
- Sharpening count limits

#### `BladeAlerts.jsx`
Alert management interface:
- View all active alerts
- Filter by type and severity
- Resolve alerts
- Alert history
- Summary statistics

#### `NewBladeForm.jsx`
Form to register new blades:
- Blade type selection
- Serial number generation or manual entry
- Purchase/installation dates
- Initial status selection
- Asset number tracking

### 4. Serial Number Generation

The system automatically generates unique serial numbers in format:
```
{BLADE_CODE}-{TIMESTAMP}
```

Example: `CUTTER-001-1736605819000`

Alternatively, users can provide custom serial numbers with format validation.

## Installation & Setup

### 1. Database Migration

Execute the migration file in Supabase SQL editor:

```bash
# In Supabase dashboard, run:
SQL > New Query
# Copy content from: database-migrations/005-blade-lifecycle-tracking.sql
```

This creates:
- 6 main tables
- 12 indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp triggers

### 2. Update Application Routes

Add to your routing configuration (e.g., `src/App.jsx`):

```javascript
import BladeManagement from './pages/BladeManagement';

// In your route definitions:
{
  path: '/blade-management',
  element: <BladeManagement />,
  requiredRoles: ['supervisor', 'technician', 'admin']
}
```

### 3. Update Navigation

Add menu item to main navigation:

```javascript
{
  label: 'Blade Management',
  icon: <Wrench />,
  href: '/blade-management',
  roles: ['supervisor', 'technician']
}
```

### 4. Initial Data Setup

Create blade types in the system:

```javascript
// Example blade types for your machines
const initialBladeTypes = [
  {
    name: 'Cotton Pad Cutter - Primary Blade',
    code: 'CUTTER-001',
    machine_type: 'cotton_pad_cutter',
    manufacturer: 'Your Supplier',
    expected_lifecycle_hours: 2000,
    sharpening_interval_hours: 100,
    max_sharpenings: 20,
    cost_per_unit: 150.00
  },
  // ... add others for wet wipes and cotton felt machines
];
```

## Usage Workflow

### Registering a New Blade

1. Navigate to Blade Management → Blade Catalog
2. Click "New Blade" button
3. Select blade type
4. System generates serial number (optional: customize)
5. Set purchase date
6. Click "Register Blade"
7. Blade is now tracked with status "new"

### Logging Blade Usage

1. Select blade from catalog
2. Go to "Usage Tracking" tab
3. Click "Start Usage"
4. System records start time and operator
5. Enter material processed and notes
6. Click "End Usage" when done
7. Duration is automatically calculated
8. Total usage hours updated

### Recording Sharpening

1. Select blade
2. Go to "Sharpening Log" tab
3. Click "Record Sharpening"
4. Select sharpening method
5. System increments sharpening count
6. Blade status changed to "active"
7. Next sharpening date automatically scheduled

### Managing Alerts

1. System automatically creates alerts when:
   - Sharpening is due (based on usage hours)
   - Blade lifecycle is exceeded
   - Damage is detected
   - Usage anomalies detected

2. Navigate to "Alerts" tab
3. View active alerts sorted by severity
4. Click to resolve when addressed
5. Track resolution history

## Role-Based Access Control

### Permissions by Role

**Admin**
- Full access to all features
- Manage blade types
- Create/edit blades
- Override alerts
- Manage users

**Supervisor**
- View all blades and metrics
- Schedule maintenance
- Approve sharpening
- Resolve critical alerts
- Generate reports

**Technician**
- Log blade usage
- Record sharpening
- Update maintenance status
- Create inspection reports
- Cannot delete blade records

**Operator**
- Log blade usage only
- View blade status
- Cannot modify records

## Key Features

### 1. Automatic Status Management
- Blades automatically transition between statuses based on:
  - Usage hours vs. lifecycle limits
  - Sharpening intervals
  - Maintenance records
  - Damage reports

### 2. Predictive Alerts
- Alert generation based on:
  - Remaining lifecycle
  - Usage rates
  - Sharpening schedules
  - Historical anomalies

### 3. Usage Analytics
- Total hours per blade
- Usage rate calculations
- Peak usage periods
- Comparative blade performance

### 4. Maintenance Scheduling
- Automatic sharpening suggestions
- Maintenance interval tracking
- Service history timeline
- Cost per sharpening

### 5. Compliance Tracking
- Complete audit trail
- User attribution (who performed what)
- Timestamps for all actions
- Maintenance certifications

## Data Models & Relationships

```
blade_types (1) ─── (Many) blades
                        ├── (Many) blade_usage_logs
                        ├── (Many) blade_sharpening_history
                        ├── (Many) blade_maintenance_logs
                        └── (Many) blade_alerts

machines (1) ─── (Many) blades (current location)
machines (1) ─── (Many) blade_usage_logs (where used)

auth.users ─── blade_types (created_by, updated_by)
auth.users ─── blades (created_by, updated_by)
auth.users ─── blade_usage_logs (operator_id)
auth.users ─── blade_sharpening_history (sharpened_by)
auth.users ─── blade_maintenance_logs (technician_id)
auth.users ─── blade_alerts (resolved_by)
```

## Reporting & Analytics

Potential reports to build:
1. **Blade Lifecycle Report** - Remaining hours before replacement
2. **Sharpening Schedule** - Upcoming sharpenings needed
3. **Cost Analysis** - Cost per blade type, maintenance costs
4. **Usage Statistics** - Which blades are most used
5. **Downtime Analysis** - Blade-related production impact
6. **Maintenance Compliance** - Adherence to schedules

## Performance Optimizations

1. **Indexes** - Created on frequently searched columns:
   - serial_number
   - status
   - machine_id
   - timestamps

2. **Query Optimization**
   - Batch loading with eager joins
   - Pagination for large datasets
   - Caching of blade types

3. **Real-time Updates**
   - Supabase Realtime subscriptions for active blades
   - Automatic alert notifications

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies:
- Users can only see blades based on their role
- Technicians cannot delete blade records
- Only admins can manage blade types
- Audit trail protected from modification

### Data Validation
- Serial number uniqueness enforced at DB level
- Status transitions validated
- Date validations (installation after purchase)
- Usage hours cannot go negative

## Maintenance & Monitoring

### Health Checks
1. Monitor blade status transitions
2. Alert response times
3. Blade lifecycle accuracy
4. Sharpening compliance

### Common Issues & Solutions

**Issue**: Usage hours not updating
- Check: End usage session was called
- Check: Duration calculation in service

**Issue**: Alerts not generating
- Verify: checkAndUpdateStatus called after usage logged
- Check: Alert type configuration correct

**Issue**: Serial number conflicts
- Verify: Uniqueness constraint on blade_types.code
- Check: Auto-generation logic

## Future Enhancements

1. **RFID Integration**
   - Track blade location with RFID tags
   - Automatic location updates
   - Real-time inventory

2. **Mobile App**
   - Quick usage logging
   - Barcode scanning for serial numbers
   - Offline capability

3. **Machine Integration**
   - IoT sensor data for actual usage hours
   - Automatic usage logging
   - Predictive failure detection

4. **Advanced Analytics**
   - Machine learning for usage patterns
   - Predictive maintenance scheduling
   - Cost optimization

5. **Integration with Suppliers**
   - Automatic reorder alerts
   - Price tracking
   - Supplier performance metrics

## Support & Troubleshooting

For issues or questions:
1. Check database migration executed successfully
2. Verify RLS policies in Supabase dashboard
3. Check browser console for API errors
4. Review audit logs for data integrity
5. Contact development team with specific blade IDs

## Version History

**v1.0.0** (2026-01-12)
- Initial release
- Core blade tracking
- Usage logging
- Sharpening management
- Alert system
- Role-based access control
