# System Architecture & Data Flow

## 🏗️ Complete System Architecture

```
╔════════════════════════════════════════════════════════════════════════════╗
║                         PARTPULSE PROCUREMENT SYSTEM                       ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐           │
│  │  RFID Login    │  │   Technician    │  │     MainApp      │           │
│  │    Page        │  │   Dashboard     │  │   Router (NEW)   │           │
│  └────────┬───────┘  └────────┬────────┘  └────────┬─────────┘           │
│           │                   │                    │                      │
│           └───────────────────┼────────────────────┘                      │
│                               │                                           │
│     ┌─────────────────────────┼──────────────────────────────┐           │
│     │                         │                              │           │
│  ┌──▼─────────────────┐  ┌───▼────────────────┐   ┌────────▼────────┐  │
│  │ Technician        │  │ BuildingTech       │   │ Maintenance    │  │
│  │ Requests Tab      │  │ Dashboard (L1)     │   │ Org Dashboard  │  │
│  │ (Existing)        │  │ (Level 1 Approval) │   │ (L2 + Quotes)  │  │
│  └──────────────────┘  └───────────────────┘   └────────────────┘  │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ TechDirector        │  │ Accountant       │  │ Admin          │ │
│  │ Dashboard (L3)      │  │ Dashboard        │  │ Dashboard (L4) │ │
│  │ (Director Approval) │  │ (Finance)        │  │ (Execution)    │ │
│  └──────────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                      │
│  Shared Components:                                                 │
│  • RequestDetailsModal                                              │
│  • RequestApprovalPanel                                             │
│  • QuoteManagementPanel                                             │
│  • OrderTrackingPanel                                               │
│  • InvoiceChecklistWidget                                           │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /api/requests              [GET/POST - List & Create]                     │
│  /api/requests/:id          [GET - View]                                   │
│  /api/requests/:id/items    [POST - Add Items]                             │
│  /api/requests/:id/submit   [POST - Submit]                                │
│  /api/requests/:id/approve  [POST - Approve]                               │
│  /api/requests/:id/reject   [POST - Reject]                                │
│  /api/requests/:id/execute  [POST - Execute]                               │
│  /api/requests/:id/activity [GET - Activity Log]                           │
│  /api/requests/pending-approvals/:role [GET - Pending]                     │
│  /api/user/profile          [GET - User Info]                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER (Supabase)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ item_requests    │  │ request_items    │  │ request_approvals│         │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤         │
│  │ id               │  │ id               │  │ id               │         │
│  │ request_number   │  │ request_id (FK)  │  │ request_id (FK)  │         │
│  │ status           │  │ description      │  │ approval_level   │         │
│  │ priority         │  │ quantity         │  │ status           │         │
│  │ building         │  │ unit             │  │ approved_by      │         │
│  │ description      │  │ price            │  │ timestamp        │         │
│  │ total_amount     │  │ created_at       │  │ comments         │         │
│  │ submitter_id     │  │ updated_at       │  │                  │         │
│  │ created_at       │  └──────────────────┘  └──────────────────┘         │
│  │ updated_at       │                                                     │
│  └──────────────────┘                                                     │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐       │
│  │ request_activity │  │ request_documents                        │       │
│  ├──────────────────┤  ├──────────────────────────────────────────┤       │
│  │ id               │  │ id                                       │       │
│  │ request_id (FK)  │  │ request_id (FK)                          │       │
│  │ action           │  │ document_type (quote/po/invoice)        │       │
│  │ actor_id         │  │ document_url                             │       │
│  │ actor_email      │  │ uploaded_at                              │       │
│  │ notes            │  │ file_size                                │       │
│  │ timestamp        │  └──────────────────────────────────────────┘       │
│  └──────────────────┘                                                     │
│                                                                             │
│  Indexes: 12 (optimized for common queries)                                │
│  RLS Policies: 8 (row-level security)                                      │
│  Triggers: 3 (auto-number, timestamp, logging)                             │
│  Functions: 1 (generate_request_number)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION & SECURITY                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  • Supabase Auth (JWT tokens)                                               │
│  • Role-Based Access Control (RBAC)                                         │
│  • Row-Level Security (RLS)                                                 │
│  • Request ownership validation                                             │
│  • Approval level verification                                              │
│  • Complete audit trail                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Request Approval Flow

```
                         COMPLETE REQUEST LIFECYCLE

  TECHNICIAN CREATE PHASE
  ═══════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  1. Technician logs in via RFID                                 │
  │  2. Clicks "Requests" tab (NEW)                                 │
  │  3. Fills in request details:                                  │
  │     - Building selection                                        │
  │     - Priority level                                            │
  │     - Description                                               │
  │  4. Clicks "Next: Add Items"                                    │
  │  5. Adds items (unlimited):                                    │
  │     - Description (open text)                                   │
  │     - Quantity                                                  │
  │     - Unit                                                      │
  │     - Price/Unit                                                │
  │  6. Reviews budget summary                                      │
  │  7. Clicks "Create Request"                                     │
  │  Status: DRAFT ✓                                                │
  │                                                                  │
  │  📝 Technician can edit draft requests                           │
  │  💾 Auto-save feature                                           │
  │  📊 Budget calculated automatically                             │
  └─────────────────────────────────────────────────────────────────┘
                              ↓
  APPROVAL PHASE 1 - BUILDING TECHNICIAN
  ═══════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  Technician clicks "Submit"                                     │
  │  Status: SUBMITTED ✓                                            │
  │                                                                  │
  │  🔔 Building Tech receives notification                         │
  │     (email or system notification)                              │
  │                                                                  │
  │  Building Tech Dashboard shows pending approval:               │
  │  • Request number (REQ-2026-00001)                              │
  │  • Building name                                                │
  │  • Priority badge (URGENT/HIGH/MEDIUM/LOW)                     │
  │  • Item count                                                   │
  │  • Total budget                                                 │
  │  • Days since submitted                                         │
  │                                                                  │
  │  Building Tech clicks "Review & Approve"                        │
  │  Modal opens showing:                                           │
  │  ✓ Full request details                                         │
  │  ✓ All items with prices                                        │
  │  ✓ Activity log                                                 │
  │  ✓ Budget summary                                               │
  │                                                                  │
  │  Options:                                                        │
  │  A) ✅ APPROVE & MOVE TO NEXT LEVEL                             │
  │  B) ❌ REJECT & RETURN TO SUBMITTER                             │
  │                                                                  │
  │  If Approved:                                                   │
  │    Status: BUILDING_APPROVED ✓                                 │
  │    Action logged in activity                                    │
  │    Moves to Level 2 (Maintenance Org)                          │
  │                                                                  │
  │  If Rejected:                                                   │
  │    Status: REJECTED ❌                                          │
  │    Reason stored                                                │
  │    Technician notified                                          │
  │    Technician can edit & resubmit                               │
  └─────────────────────────────────────────────────────────────────┘
                              ↓
  APPROVAL PHASE 2 - MAINTENANCE ORGANIZATION
  ═══════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  Maintenance Org Dashboard shows:                               │
  │                                                                  │
  │  📋 "Pending Quotes" tab - BUILDING_APPROVED requests          │
  │  🛒 "Active Orders" tab - orders being tracked                 │
  │  ✅ "Items Received" tab - waiting for invoice verification    │
  │  💰 "Ready for Accounting" tab - completed                    │
  │                                                                  │
  │  QUOTE MANAGEMENT:                                              │
  │  ─────────────────                                              │
  │  1. Clicks "Create Quote Request"                              │
  │  2. Can add multiple supplier quotes:                           │
  │     - Supplier name                                             │
  │     - Quote amount                                              │
  │     - Upload quote PDF                                          │
  │  3. System highlights BEST QUOTE (lowest price)                │
  │  4. Click "Use This Quote" to select                           │
  │                                                                  │
  │  ORDER TRACKING:                                                │
  │  ────────────────                                               │
  │  1. Places purchase order                                       │
  │     Status: ORDER_PLACED                                        │
  │  2. Updates tracking number                                     │
  │  3. Sets expected delivery date                                 │
  │  4. Progresses through: IN_TRANSIT → DELIVERED                │
  │                                                                  │
  │  INVOICE VERIFICATION:                                          │
  │  ───────────────────────                                        │
  │  Completes 6-point checklist:                                   │
  │  ☐ All items received                                           │
  │  ☐ Quantities verified                                          │
  │  ☐ Invoice matches PO                                           │
  │  ☐ Prices verified                                              │
  │  ☐ No damages                                                   │
  │  ☐ Documentation complete                                       │
  │                                                                  │
  │  5. Clicks "Submit to Accounting"                               │
  │  Status: MAINTENANCE_APPROVED ✓                                │
  │  Moves to Level 3 (Tech Director)                              │
  └─────────────────────────────────────────────────────────────────┘
                              ↓
  APPROVAL PHASE 3 - TECHNICAL DIRECTOR
  ═══════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  Tech Director Dashboard shows:                                 │
  │  • Pending approvals count                                      │
  │  • Total pending budget                                         │
  │  • Approval statistics                                          │
  │  • Priority filter options                                      │
  │                                                                  │
  │  Each request card shows:                                       │
  │  • Request number & status                                      │
  │  • Building & items count                                       │
  │  • Priority badge                                               │
  │  • Total budget                                                 │
  │  • "Review & Approve" button                                    │
  │                                                                  │
  │  Reviews full request details                                   │
  │  Adds optional strategic comments                               │
  │  Approves for final execution                                   │
  │                                                                  │
  │  Status: DIRECTOR_APPROVED ✓                                   │
  │  Moves to Level 4 (Admin)                                      │
  └─────────────────────────────────────────────────────────────────┘
                              ↓
  APPROVAL PHASE 4 - ADMIN EXECUTION
  ═══════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  Admin Dashboard shows:                                         │
  │  • System-wide statistics                                       │
  │  • Total requests, budget, completed                           │
  │  • Pending execution count                                      │
  │  • Rejected requests                                            │
  │  • Average processing time                                      │
  │                                                                  │
  │  "Pending Execution" tab lists:                                 │
  │  DIRECTOR_APPROVED requests ready for final execution          │
  │                                                                  │
  │  Admin reviews and clicks "Review & Execute"                    │
  │  Final confirmation required                                    │
  │  System locks request                                           │
  │  Updates status: EXECUTED ✓                                    │
  │                                                                  │
  │  Moves to Accounting                                            │
  └─────────────────────────────────────────────────────────────────┘
                              ↓
  FINANCE PHASE - ACCOUNTANT
  ═══════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │  Accountant Dashboard shows:                                    │
  │  • Financial summary:                                           │
  │    - Total amount                                               │
  │    - Pending payment                                            │
  │    - Already paid                                               │
  │    - Invoices processed                                         │
  │                                                                  │
  │  "Ready for Payment" tab shows invoices:                       │
  │  • Request number & building                                    │
  │  • Amount to pay                                                │
  │  • Items received count                                         │
  │  • Created date                                                 │
  │                                                                  │
  │  Accountant clicks "Process Payment"                            │
  │  Payment recorded in system                                     │
  │  Status: COMPLETED ✓                                           │
  │                                                                  │
  │  Request fully closed                                           │
  │  Can be archived                                                │
  │  Kept in audit trail                                            │
  └─────────────────────────────────────────────────────────────────┘

  END RESULT:
  ═════════════════════════════════════════════════════════════════════
  ✅ Request fully processed
  ✅ All approvals collected
  ✅ Supplier quotes evaluated
  ✅ Purchase order placed
  ✅ Items received
  ✅ Invoice verified
  ✅ Payment processed
  ✅ Complete audit trail
  ✅ Ready for archive
```

---

## 🔄 Data Flow Diagram

```
FRONTEND                          BACKEND                         DATABASE
═════════════════════════════════════════════════════════════════════════════

User Action                   API Call                         Data Operation
──────────────────────────────────────────────────────────────────────────────

1. Technician creates    →    POST /api/requests         →   INSERT item_requests
   request                    with auth token                INSERT request_items
                             User ID validated               generate_request_number
                                                            trigger: tr_set_request_number
                                                            trigger: tr_log_request_created

2. Building Tech         →    POST /api/requests/:id/    →   UPDATE request_approvals
   approves                   approve                         INSERT request_activity
                             Role validated                  update status
                             Approval level checked          RLS policy applied

3. Maintenance Org       →    POST /api/requests/:id/    →   INSERT request_documents
   adds supplier quote        submit (with quote data)       UPDATE item_requests
                             File upload handled             (quote info)
                                                            RLS policy applied

4. Maintenance Org       →    POST /api/requests/:id/    →   UPDATE item_requests
   places order               update (order info)            (order status)
                             Order ID generated              INSERT request_activity
                                                            RLS policy applied

5. Tech Director         →    POST /api/requests/:id/    →   UPDATE request_approvals
   approves                   approve                         INSERT request_activity
                             Role: tech_director             Status: DIRECTOR_APPROVED
                             Validates level = L3            trigger: auto timestamp

6. Admin executes        →    POST /api/requests/:id/    →   UPDATE item_requests
                             execute                         Status: EXECUTED
                             Role: admin                      INSERT request_activity
                             Final authority                  RLS policy applied

7. Accountant processes  →    POST /api/requests/:id/    →   UPDATE item_requests
   payment                    update (payment info)          Status: COMPLETED
                             Role: accountant                INSERT request_activity
                                                            RLS policy applied

8. Anyone views          →    GET /api/requests/:id      →   SELECT * FROM item_requests
   request details                                           SELECT * FROM request_items
                             Auth validated                  SELECT * FROM request_activity
                             RLS policy applied              WHERE id = ? AND 
                                                               user can access
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: AUTHENTICATION (Frontend → Backend)                              │
│  ─────────────────────────────────────────────                             │
│  • JWT Token in Authorization header                                        │
│  • Token validated on every API call                                        │
│  • Token expiration checked                                                 │
│  • HTTPS only (SSL/TLS)                                                     │
│                                                                             │
│  Layer 2: AUTHORIZATION (Backend)                                          │
│  ─────────────────────────────────────                                     │
│  • User role verified                                                       │
│  • Approval level validated                                                 │
│  • Request ownership checked                                                │
│  • Business logic rules enforced                                            │
│                                                                             │
│  Layer 3: ROW-LEVEL SECURITY (Database)                                    │
│  ──────────────────────────────────────                                    │
│  • RLS Policy 1: Users see only own requests                                │
│  • RLS Policy 2: Managers see pending for their level                       │
│  • RLS Policy 3: Admins see all requests                                    │
│  • RLS Policy 4: Accountants see completed requests                         │
│  • RLS Policy 5: Activity visible to involved users                         │
│  • RLS Policy 6: Approvals limited by role                                  │
│  • RLS Policy 7: Documents accessible to authorized users                   │
│  • RLS Policy 8: Full audit trail for all users                             │
│                                                                             │
│  Layer 4: AUDIT TRAIL (Complete Logging)                                   │
│  ──────────────────────────────────────                                    │
│  • Every action logged with:                                                │
│    - Action type                                                            │
│    - User ID & email                                                        │
│    - Timestamp                                                              │
│    - Comments/reason                                                        │
│    - IP address (recommended)                                               │
│  • Cannot be deleted                                                        │
│  • Immutable record                                                         │
│                                                                             │
│  Layer 5: DATA VALIDATION (Input Sanitization)                             │
│  ──────────────────────────────────────────                                │
│  • All inputs validated on backend                                          │
│  • SQL injection prevention                                                 │
│  • XSS protection                                                           │
│  • CSRF protection (if applicable)                                          │
│  • File upload scanning                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📈 Component Hierarchy

```
App.jsx (Root)
│
├── RFIDLoginPage (Existing)
│
├── MainApp (NEW)
│   │
│   ├── Header
│   │   ├── Logo/Title
│   │   ├── User Badge (Role + Info)
│   │   └── Logout Button
│   │
│   ├── Approval Flow Indicator
│   │
│   ├── Dashboard Router (Role-based)
│   │   │
│   │   ├── BuildingTechDashboard
│   │   │   ├── Stats Bar
│   │   │   ├── Requests Grid
│   │   │   └── RequestDetailsModal
│   │   │       └── RequestApprovalPanel
│   │   │
│   │   ├── MaintenanceOrgDashboard
│   │   │   ├── Tab Navigation
│   │   │   ├── Pending Quotes Tab
│   │   │   │   └── RequestDetailsModal
│   │   │   │       └── QuoteManagementPanel
│   │   │   ├── Active Orders Tab
│   │   │   │   └── RequestDetailsModal
│   │   │   │       └── OrderTrackingPanel
│   │   │   ├── Items Received Tab
│   │   │   │   └── RequestDetailsModal
│   │   │   │       └── InvoiceChecklistWidget
│   │   │   └── Accounting Ready Tab
│   │   │
│   │   ├── TechDirectorDashboard
│   │   │   ├── Statistics
│   │   │   ├── Priority Filter
│   │   │   ├── Requests List
│   │   │   └── RequestDetailsModal
│   │   │       └── RequestApprovalPanel
│   │   │
│   │   ├── AccountantDashboard
│   │   │   ├── Financial Summary
│   │   │   ├── Filter Tabs
│   │   │   ├── Invoices Table
│   │   │   └── RequestDetailsModal
│   │   │
│   │   └── AdminDashboard
│   │       ├── System Statistics
│   │       ├── Tab Navigation
│   │       ├── Requests Grid
│   │       └── RequestDetailsModal
│   │           └── RequestApprovalPanel
│   │
│   └── Footer
│
└── TechnicianDashboard (Existing)
```

---

## ⚙️ State Management Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT ARCHITECTURE                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Global State (React Context/Redux optional)                          │
│  ├── userInfo                                                         │
│  │   ├── id                                                           │
│  │   ├── name                                                         │
│  │   ├── email                                                        │
│  │   ├── role                                                         │
│  │   └── permissions[]                                                │
│  │                                                                    │
│  ├── authToken (JWT)                                                  │
│  │   └── expires_at                                                   │
│  │                                                                    │
│  └── appSettings                                                      │
│      ├── theme (light/dark)                                          │
│      ├── notifications_enabled                                        │
│      └── preferred_view                                               │
│                                                                        │
│  Component Local State                                                │
│  ├── requests[]                 [Loaded from API]                     │
│  ├── selectedRequest            [User selected]                       │
│  ├── loading                    [Loading indicator]                   │
│  ├── error                      [Error message]                       │
│  ├── filter                     [Current filter]                      │
│  ├── sortOrder                  [Sort setting]                        │
│  └── pagination                 [Page info]                           │
│                                                                        │
│  Custom Hook State (useRequestsApi)                                   │
│  ├── getPendingApprovals()      [API call wrapper]                    │
│  ├── getRequestDetails()        [API call wrapper]                    │
│  ├── approveRequest()           [API call wrapper]                    │
│  ├── rejectRequest()            [API call wrapper]                    │
│  ├── executeRequest()           [API call wrapper]                    │
│  └── [other API methods]                                              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📞 Integration Points

```
┌────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INTEGRATIONS                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Email Notifications (Optional Enhancement)                           │
│  └── SendGrid / Nodemailer / AWS SES                                  │
│      ├── Request submitted                                            │
│      ├── Approval needed                                              │
│      ├── Status changed                                               │
│      └── Payment processed                                            │
│                                                                        │
│  File Storage (Document Management)                                   │
│  └── Supabase Storage / AWS S3                                        │
│      ├── Quote PDFs                                                   │
│      ├── Purchase Orders                                              │
│      ├── Invoices                                                     │
│      └── Receipts                                                     │
│                                                                        │
│  Accounting Software (Future Enhancement)                             │
│  └── QuickBooks / Xero / NetSuite                                     │
│      ├── Send approved requests                                       │
│      ├── Sync invoice data                                            │
│      └── Reconcile payments                                           │
│                                                                        │
│  Supplier Management (Future Enhancement)                             │
│  └── Supplier databases / APIs                                        │
│      ├── Auto-populate suppliers                                      │
│      ├── Auto-get quotes                                              │
│      └── Performance tracking                                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Design Principles

1. **Separation of Concerns**
   - Each dashboard handles one role
   - Reusable components for common UI
   - Clean API contracts

2. **Single Responsibility**
   - Each component does one thing
   - Clear props and state
   - Easy to test

3. **DRY (Don't Repeat Yourself)**
   - Shared modals (RequestDetailsModal)
   - Shared approval panel
   - Custom hooks for API calls

4. **Scalability**
   - New dashboards easy to add
   - New roles easy to integrate
   - Database design supports growth

5. **Security First**
   - RLS at database level
   - JWT validation
   - Complete audit trail
   - Role-based access

6. **User Experience**
   - Clear workflow
   - Visual feedback
   - Error handling
   - Loading states

---

**Status:** ✅ **PRODUCTION READY**  
**Architecture:** Well-defined and scalable  
**Security:** Multi-layer protection  
**Performance:** Optimized queries with indexes
