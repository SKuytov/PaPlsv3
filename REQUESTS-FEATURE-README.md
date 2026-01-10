# 📋 Item Request Feature - Complete Documentation

## Overview

A production-ready **multi-level item request workflow** with complete audit trail for your WMS/CMMS system. Operationaltech nicans can request items through a 4-level approval process with full role-based access control.

## 🚀 Quick Facts

- ✅ **5 database tables** with indexes and RLS policies
- ✅ **11 API endpoints** fully implemented
- ✅ **5 React components** ready to use
- ✅ **Complete audit trail** of all actions
- ✅ **4-level approval workflow** (Building → Maintenance → Director → Admin)
- ✅ **Multi-language support** (English/Bulgarian)
- ✅ **Production-tested patterns**
- ✅ **Zero breaking changes** to existing code

## 📦 What's Included

### Database (database/migrations/001-item-requests.sql)
```
✓ item_requests       - Main request records
✓ request_items       - Line items per request (open text fields)
✓ request_approvals   - 4-level approval tracking
✓ request_activity    - Complete audit trail
✓ request_documents   - Optional file attachments
```

### API (src/api/requests.js)
```
1.  POST   /api/requests                  → Create draft
2.  POST   /api/requests/:id/items        → Add items
3.  POST   /api/requests/:id/submit       → Submit for approval
4.  GET    /api/requests/:id              → Get details
5.  GET    /api/requests                  → My requests
6.  GET    /api/requests/pending-approvals → Manager's pending list
7.  POST   /api/requests/:id/approve      → Approve & move level
8.  POST   /api/requests/:id/reject       → Reject with reason
9.  PATCH  /api/requests/:id/edit         → Edit by approver
10. GET    /api/requests/:id/activity     → Audit trail
11. POST   /api/requests/:id/execute      → Execute (admin)
```

### Frontend Components
```
✓ RequestsTab.jsx           - Main dashboard (3rd tab in RFID login)
✓ RequestFormModal.jsx      - 2-step request creation wizard
✓ RequestDetailsModal.jsx   - Full request details viewer
✓ RequestApprovalPanel.jsx  - Approval interface
✓ RequestStatusBadge.jsx    - Status indicator
✓ useRequestsApi.js         - 11 custom hook methods
```

## 📊 Workflow Visual

```
┌─────────────────────────────────────────────────────────────────┐
│ TECHNICIAN creates request with items (DRAFT)                  │
│           │                                                     │
│           ▼                                                     │
│ Clicks "Submit" → SUBMITTED (Building Tech gets notification) │
│           │                                                     │
│           ▼                                                     │
│ BUILDING TECH reviews & approves → BUILDING_APPROVED           │
│           │                                                     │
│           ▼                                                     │
│ MAINTENANCE ORG reviews & approves → MAINTENANCE_APPROVED      │
│           │                                                     │
│           ▼                                                     │
│ TECH DIRECTOR reviews & approves → DIRECTOR_APPROVED           │
│           │                                                     │
│           ▼                                                     │
│ GOD ADMIN executes → EXECUTED (ready for procurement)          │
│                                                                 │
│ [Each stage has full audit trail of who did what, when]        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Role-Based Access

| Role | Create | Submit | L1 Auth | L2 Auth | L3 Auth | L4 Exec |
|------|--------|--------|---------|---------|---------|----------|
| **Op. Technician** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Building Tech** | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Maintenance Org** | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Tech Director** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **God Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 🗄️ Database Schema

### item_requests
```sql
id                    UUID PRIMARY KEY
request_number        VARCHAR(50) UNIQUE        -- Auto-generated: REQ-2024-00001
submitter_id          UUID                      -- User who created it
building_id           VARCHAR(100)              -- Building 1, Building 2, etc.
status                VARCHAR(50)               -- DRAFT, SUBMITTED, *_APPROVED, EXECUTED, REJECTED
priority              VARCHAR(20)               -- LOW, NORMAL, HIGH, URGENT
description           TEXT                      -- What they need
notes                 TEXT                      -- Additional details
estimated_budget      DECIMAL(12,2)             -- Auto-calculated from items
actual_cost           DECIMAL(12,2)             -- Set during execution
created_at            TIMESTAMP                 -- Creation time
submitted_at          TIMESTAMP                 -- When submitted for approval
completed_at          TIMESTAMP                 -- When fully executed
updated_at            TIMESTAMP                 -- Last modification
```

### request_items
```sql
id                    UUID PRIMARY KEY
request_id            UUID FK → item_requests
item_name             VARCHAR(255)              -- "Hydraulic Pump", "Compressor", etc.
quantity              DECIMAL(10,2)             -- How many
unit                  VARCHAR(50)               -- pcs, kg, m, hours, set, box, etc.
estimated_unit_price  DECIMAL(10,2)             -- Price per unit
actual_unit_price     DECIMAL(10,2)             -- Set during execution
specs                 JSONB                     -- Open-ended specs object
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### request_approvals
```sql
id                    UUID PRIMARY KEY
request_id            UUID FK → item_requests
approval_level        INT                       -- 1, 2, 3, or 4
approval_role         VARCHAR(100)              -- "Building Technician", etc.
approver_id           UUID FK → auth.users
approver_email        VARCHAR(255)
status                VARCHAR(50)               -- PENDING, APPROVED, REJECTED, CHANGES_REQUESTED
comments              TEXT                      -- Approval comments
requested_changes     TEXT                      -- If requesting changes
edited_fields         JSONB                     -- What was modified
approval_date         TIMESTAMP                 -- When approved
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### request_activity (Audit Trail)
```sql
id                    UUID PRIMARY KEY
request_id            UUID FK → item_requests
action                VARCHAR(100)              -- REQUEST_CREATED, STATUS_CHANGED, ITEM_ADDED, etc.
actor_id              UUID FK → auth.users
actor_email           VARCHAR(255)
action_details        JSONB                     -- Details about the action
timestamp             TIMESTAMP                 -- When it happened
```

## 📋 Complete SQL for Supabase

Copy the entire contents of `database/migrations/001-item-requests.sql` and run in Supabase SQL Editor:

**File location:** `database/migrations/001-item-requests.sql`

**Key features of the SQL:**
- ✅ 5 tables with proper relationships
- ✅ Automatic request number generation (REQ-YYYY-NNNNN)
- ✅ Timestamp auto-update triggers
- ✅ Activity logging triggers
- ✅ Performance indexes on frequently queried columns
- ✅ Row-Level Security (RLS) policies
- ✅ Cascading deletes for data integrity

## 🚀 Integration Steps

### 1. Database (5 min)
```bash
1. Supabase → SQL Editor
2. Copy database/migrations/001-item-requests.sql
3. Run query
4. Verify tables created
```

### 2. Backend (10 min)
```bash
1. Copy src/api/requests.js to your backend
2. Add to app.js:
   const requestsRouter = require('./src/api/requests');
   app.use('/api', requestsRouter);
3. Restart backend
4. Test: GET /api/requests
```

### 3. Frontend (15 min)
```bash
1. Copy src/hooks/useRequestsApi.js
2. Copy all files from src/components/technician/
3. Update RFIDLoginPage.jsx:
   - Import RequestsTab
   - Add 3rd tab for "Requests"
   - Add TabsContent for requests
4. Restart frontend
```

## 📝 Complete Implementation Checklist

- [ ] Database schema created in Supabase
- [ ] All 5 tables verified
- [ ] RLS policies enabled
- [ ] Backend API file copied
- [ ] API routes registered in app
- [ ] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY configured
- [ ] React hook copied to src/hooks/
- [ ] All 5 React components copied
- [ ] RequestsTab imported in RFIDLoginPage
- [ ] 3rd tab added for Requests
- [ ] API base URL configured
- [ ] Can create requests in UI
- [ ] Can submit requests
- [ ] Can view pending approvals as manager
- [ ] Can approve/reject requests
- [ ] Status updates propagate through all levels
- [ ] No console errors
- [ ] No API 401 errors

## 🧪 Testing the Feature

### Test 1: Create Request
```
1. Login as any technician
2. Click "Requests" tab
3. Click "Create New Request"
4. Fill in: Building, Priority, Description
5. Click "Next: Add Items"
6. Add 2-3 items with quantities and prices
7. Click "Create Request"
✓ Request appears in "My Requests" with DRAFT status
```

### Test 2: Submit for Approval
```
1. Still in "My Requests"
2. Click request details
3. Click "Submit" button
✓ Status changes to SUBMITTED
✓ Building Tech gets notification
```

### Test 3: Approval Workflow
```
1. Login as Building Technician
2. Go to "Pending Approvals" tab
3. Click request
4. Review items and budget
5. Click "Review & Approve"
6. Add comments
7. Check "Move to next approval level"
8. Click "Approve"
✓ Status: BUILDING_APPROVED
✓ Maintenance Org now sees it in pending
```

### Test 4: Complete Workflow
```
1. Repeat approval as each role:
   - Maintenance Org → MAINTENANCE_APPROVED
   - Tech Director → DIRECTOR_APPROVED  
   - God Admin → EXECUTED
✓ Request moves through all levels
✓ All timestamps recorded
✓ Activity log shows every action
```

## 🎯 Key Features

✅ **Open Text Fields** - No predefined items, users enter custom specs
✅ **Multi-item Support** - Add unlimited items per request
✅ **Budget Tracking** - Auto-calculates total from items
✅ **Status Badges** - Visual indicators for each stage
✅ **Approval Comments** - Each approver can leave notes
✅ **Request Editing** - Approvers can modify quantities/prices
✅ **Rejection Workflow** - Can reject at any level with reasons
✅ **Complete Audit Trail** - Every action logged with timestamp
✅ **Activity Timeline** - View who did what and when
✅ **Role-Based Access** - Automatic level-based approval routing

## 🔍 Monitoring

### Check Database Activity
```sql
-- Last 10 requests
SELECT request_number, status, submitter_email, created_at 
FROM item_requests 
ORDER BY created_at DESC LIMIT 10;

-- Pending approvals
SELECT r.request_number, a.approval_level, a.approval_role, a.status
FROM request_approvals a
JOIN item_requests r ON a.request_id = r.id
WHERE a.status = 'PENDING'
ORDER BY a.created_at DESC;

-- Activity log for a request
SELECT action, actor_email, timestamp, action_details
FROM request_activity
WHERE request_id = 'YOUR_REQUEST_ID'
ORDER BY timestamp DESC;
```

### Frontend Debugging
```javascript
// Open DevTools (F12) → Network tab
// Make a request, watch API calls
// Should see successful requests to:
//   GET /api/requests
//   POST /api/requests
//   POST /api/requests/{id}/submit
//   POST /api/requests/{id}/approve
```

## 📞 Support Resources

**In this repository:**
- `IMPLEMENTATION.md` - Step-by-step setup guide
- `database/migrations/001-item-requests.sql` - Database schema
- `src/api/requests.js` - API documentation in comments
- Component files - Inline JSDoc comments

**In the code:**
- Each function has detailed comments
- Error messages are descriptive
- Console logs for debugging (development only)

## ✅ Verification Checklist

After implementation:

```bash
# Test database
psql -U postgres -d your_db -f database/migrations/001-item-requests.sql
# ✓ Should complete without errors

# Test backend API
curl -X GET http://localhost:3000/api/requests \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# ✓ Should return array of requests

# Test frontend
# ✓ Login page loads
# ✓ 3rd tab "Requests" visible
# ✓ Can create request
# ✓ Can submit for approval
# ✓ Manager can see pending
# ✓ Approval moves through levels
```

## 🎉 You're Done!

Your item request system is now fully operational with:
- Complete 4-level approval workflow
- Full audit trail of all actions  
- Role-based access control
- Multi-item support with open text fields
- Automatic budget calculations
- Status tracking and notifications

---

**Feature Status:** ✅ **Production Ready**
**Last Updated:** January 2026
**Branch:** `feature/multi-user-roles-extended-technician`
