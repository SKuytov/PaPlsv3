# 🚀 Item Request Feature - Complete Workflow Architecture

## ✅ SYSTEM ARCHITECTURE OVERVIEW

**Branch:** `feature/multi-user-roles-extended-technician`

Complete procurement workflow system integrated into your existing webapp without any breaking changes.

---

## 🏗️ ARCHITECTURE LAYERS

### Layer 1: Technician Login Interface (Minimal)
**Location:** `src/pages/RFIDLoginPage.jsx`

```
✅ NEW Tab: "Requests"
   ├─ Create New Request (Form Modal)
   │  └─ 2-step wizard: Basic info → Add items
   │
   ├─ My Requests (List)
   │  ├─ Status badge
   │  ├─ Quick view
   │  └─ View full details (opens main webapp)
   │
   └─ No approval buttons
      No execution buttons
      No quote management
      No order tracking
```

**That's it for technician login!**

---

### Layer 2: Main Webapp Interface (Full Control)
**Location:** `src/pages/MainApp.jsx` or dashboard

```
🏢 MAIN WEBAPP - COMPLETE CONTROL CENTER
   │
   ├─ 👷 Building Technician Dashboard
   │  ├─ Pending Approvals (Level 1)
   │  │  ├─ List of requests awaiting approval
   │  │  ├─ View full request details
   │  │  └─ Approve / Reject buttons
   │  │
   │  └─ My Requests (archived)
   │
   ├─ 👨‍💼 Maintenance Organizer Dashboard
   │  ├─ Pending Quote Requests
   │  │  ├─ Create supplier quote request
   │  │  ├─ Track quote status
   │  │  └─ Process quotes (add prices, upload PDF)
   │  │
   │  ├─ Approved Orders
   │  │  ├─ Place PO
   │  │  ├─ Track delivery status
   │  │  ├─ Receive items
   │  │  └─ Complete invoice checklist
   │  │
   │  └─ Documentation & Accounting
   │     ├─ Collect all documents
   │     └─ Send to accounting
   │
   ├─ 👔 Tech Director Dashboard
   │  ├─ Pending Approvals (Level 3)
   │  │  ├─ Review request with quote
   │  │  ├─ Review prices
   │  │  └─ Approve / Reject buttons
   │  │
   │  └─ Approved Requests
   │
   ├─ 🔧 God Admin Dashboard
   │  ├─ All Requests (any status)
   │  ├─ All Approvals
   │  ├─ All Orders
   │  └─ Full Audit Trail
   │
   ├─ 💰 Accountant Dashboard
   │  ├─ Pending Payments
   │  │  ├─ Requests ready for payment
   │  │  ├─ All documents attached
   │  │  └─ Process payment
   │  │
   │  └─ Payment History
   │
   └─ 📊 Reports & Analytics
      ├─ Request status breakdown
      ├─ Approval timelines
      ├─ Budget vs actual
      └─ Supplier performance
```

---

## 📍 FILE ORGANIZATION

### Technician Login (Minimal)
```
src/pages/
└── RFIDLoginPage.jsx (Updated)
    ├── Existing tabs (Scanner, Spare Parts, etc.)
    │
    └── NEW Tab: "Requests"
        ├── RequestsTab.jsx
        │  ├── My Requests list
        │  ├── Create button
        │  └─ View details link (opens main webapp)
        │
        ├── RequestFormModal.jsx (Create new)
        │  ├─ Step 1: Basic info
        │  └─ Step 2: Add items
        │
        └── RequestStatusBadge.jsx
           └─ Visual status indicator
```

### Main Webapp (Full System)
```
src/pages/
└── MainApp.jsx or Dashboard.jsx
    ├── Navigation/Sidebar
    │  ├─ Requests
    │  ├─ Approvals
    │  ├─ Orders
    │  ├─ Accounting
    │  └─ Reports
    │
    ├── Role-Based Views
    │  ├─ BuildingTechDashboard.jsx
    │  ├─ MaintenanceOrgDashboard.jsx
    │  ├─ TechDirectorDashboard.jsx
    │  ├─ AdminDashboard.jsx
    │  ├─ AccountantDashboard.jsx
    │  └─ AnalyticsDashboard.jsx
    │
    └── Shared Components
       ├── RequestDetailsModal.jsx
       ├── RequestApprovalPanel.jsx
       ├── QuoteManagementPanel.jsx
       ├── OrderTrackingPanel.jsx
       ├── InvoiceChecklistWidget.jsx
       └── DocumentUploadWidget.jsx
```

---

## 🔄 COMPLETE WORKFLOW (8 Phases)

### PHASE 1: Request Creation
**Location:** Technician Login
```
1. Technician logs in via RFID
2. Opens "Requests" tab (NEW)
3. Clicks "Create New Request"
4. RequestFormModal appears (2-step wizard)
5. Step 1: Enters building, priority, description
6. Step 2: Adds items (unlimited)
7. Clicks "Create Request"
✅ Request saved as DRAFT
✅ Technician sees it in "My Requests"
```

### PHASE 2: Technician Submission
**Location:** Technician Login
```
1. Technician views their DRAFT request
2. Reviews items and details
3. Clicks "Submit for Approval"
✅ Status: SUBMITTED
✅ Request moves to Building Tech dashboard
```

### PHASE 3: Building Tech Approval
**Location:** Main Webapp → Building Tech Dashboard
```
1. Building Tech logs into main webapp
2. Goes to "Pending Approvals" section
3. Sees list of SUBMITTED requests
4. Clicks request to view details
5. RequestDetailsModal opens (full view)
6. Reviews items, budget, notes
7. RequestApprovalPanel shows approve/reject buttons
8. Adds comments if needed
9. Clicks "Approve & Move to Next"
✅ Status: BUILDING_APPROVED
✅ Request moves to Maintenance Org
```

### PHASE 4: Supplier Quote Management
**Location:** Main Webapp → Maintenance Org Dashboard
```
1. Maintenance Org sees BUILDING_APPROVED request
2. Opens in "Pending Quote Requests" section
3. QuoteManagementPanel shows:
   - Request details
   - Items to be quoted
   - "Create Quote Request" button
4. Clicks "Create Quote Request"
5. System sends inquiry to supplier (email/portal)
✅ Status: QUOTE_REQUESTED

--- Supplier responds ---

6. Maintenance Org sees "Quote Received" notification
7. Opens QuoteManagementPanel
8. Reviews supplier quote
9. Adds final prices for each item
10. Uploads quote PDF
11. Clicks "Process Quote"
✅ Status: QUOTE_PROCESSED
```

### PHASE 5: Tech Director Approval
**Location:** Main Webapp → Tech Director Dashboard
```
1. Tech Director sees QUOTE_PROCESSED request
2. Goes to "Pending Approvals" section
3. RequestDetailsModal shows:
   - All items
   - Final prices from quote
   - Quote PDF attached
4. Reviews budget and specifications
5. RequestApprovalPanel shows approve/reject
6. Clicks "Approve"
✅ Status: TECH_APPROVED
✅ Request ready for order placement
```

### PHASE 6: Order Execution & Tracking
**Location:** Main Webapp → Maintenance Org Dashboard
```
1. Maintenance Org sees TECH_APPROVED request
2. Goes to "Approved Orders" section
3. OrderTrackingPanel shows:
   - Request + supplier quote
   - "Create PO" button
4. Clicks "Create PO"
5. Generates purchase order
6. Sends to supplier
✅ Status: ORDER_PLACED

--- Supplier confirms and ships ---

7. OrderTrackingPanel updates with:
   - Supplier confirmation
   - Tracking number
   - Expected delivery date
✅ Status: ORDER_CONFIRMED

8. As items ship:
   - Status updates: IN_TRANSIT
   - Delivery date calculated

9. When items arrive:
   - Maintenance Org verifies receipt
   - Clicks "Mark as Received"
✅ Status: ITEMS_RECEIVED
```

### PHASE 7: Invoice & Documentation Checklist
**Location:** Main Webapp → Maintenance Org Dashboard
```
When items marked RECEIVED, InvoiceChecklistWidget appears:

1. Dynamic checklist shows:
   ☐ Invoice Received
   ☐ Transportation Documents Received
   ☐ (If Proforma) Advance Payment Invoice Received
   ☐ (After Receipt) Final Invoice Received

2. As documents arrive:
   - Maintenance Org uploads each document
   - Checks off checklist item
   - System records timestamp

3. When all items checked:
✅ Status: DOCUMENTATION_COMPLETE
```

### PHASE 8: Accounting Handoff
**Location:** Main Webapp → Maintenance Org Dashboard
```
1. When DOCUMENTATION_COMPLETE:
   - DocumentUploadWidget shows all attachments
   - Quote PDF
   - PO Confirmation
   - Invoices
   - Transportation docs
   - Receipt confirmation

2. Maintenance Org clicks "Send to Accounting"
3. System moves request to Accountant view
✅ Status: SUBMITTED_TO_ACCOUNTING

4. Accountant sees in "Pending Payments":
   - All documents attached
   - Ready for payment processing
   - Clicks "Process Payment"
✅ Status: EXECUTED (COMPLETE)

5. Full audit trail available:
   - Who created request
   - Who approved at each stage
   - When each status changed
   - All comments and changes
```

---

## 🔐 Role-Based Access Control

### Technician (Op. Technician)
**Technician Login:**
- ✅ Create request
- ✅ Add items
- ✅ Submit for approval
- ✅ View own requests & status
- ❌ Access main webapp

### Building Technician (Level 1 Approver)
**Main Webapp:**
- ✅ View pending approvals
- ✅ View request details
- ✅ Add approval comments
- ✅ Approve or reject
- ❌ Create requests
- ❌ Manage quotes/orders

### Maintenance Organizer (Quote & Order Manager)
**Main Webapp:**
- ✅ View BUILDING_APPROVED requests
- ✅ Create supplier quote requests
- ✅ Process received quotes
- ✅ Place purchase orders
- ✅ Track order status
- ✅ Receive items
- ✅ Complete invoice checklist
- ✅ Send to accounting
- ❌ Approve requests (building tech or director does this)

### Tech Director (Level 3 Approver)
**Main Webapp:**
- ✅ View pending approvals (with quotes)
- ✅ View request details + quote
- ✅ Review prices
- ✅ Approve or reject
- ❌ Create requests
- ❌ Manage quotes/orders

### God Admin
**Main Webapp:**
- ✅ View ALL requests (any status)
- ✅ View ALL approvals
- ✅ View ALL orders
- ✅ View full audit trail
- ✅ System administration

### Accountant (NEW ROLE)
**Main Webapp:**
- ✅ View pending payments
- ✅ View all attached documents
- ✅ Process payment
- ✅ View payment history
- ❌ Create requests
- ❌ Approve requests
- ❌ Manage quotes/orders

---

## 🛠️ API ENDPOINTS (18 Total)

### Backend Routes Structure
```
/api/requests
├─ POST   /               - Create (Technician)
├─ POST   /:id/items      - Add items (Technician)
├─ POST   /:id/submit     - Submit (Technician)
├─ GET    /               - List my requests (All authenticated)
├─ GET    /:id            - Get details (All authenticated)
├─ GET    /:id/activity   - Get audit trail (All authenticated)
├─ GET    /pending-approvals  - Get pending for current user (Approvers)
├─ POST   /:id/approve    - Approve (Approvers)
├─ POST   /:id/reject     - Reject (Approvers)
└─ PATCH  /:id/edit       - Edit (Approvers)

/api/quotes (NEW)
├─ POST   /               - Create quote request (Maintenance Org)
├─ GET    /:id            - Get quote details (All authenticated)
├─ POST   /:id/receive    - Receive supplier quote (Maintenance Org)
├─ PATCH  /:id/process    - Process quote (Maintenance Org)
└─ GET    /pending        - Get pending quotes (Maintenance Org)

/api/orders (NEW)
├─ POST   /:id/place      - Place order (Maintenance Org)
├─ PATCH  /:id/status     - Update status (Maintenance Org)
├─ POST   /:id/receive-items     - Mark received (Maintenance Org)
├─ PATCH  /:id/checklist  - Update checklist (Maintenance Org)
└─ POST   /:id/submit-accounting - Send to accounting (Maintenance Org)

/api/documents (NEW)
├─ POST   /:id            - Upload document (All authenticated)
├─ GET    /:id            - List documents (All authenticated)
└─ DELETE /:docId         - Delete document (Owner/Admin)
```

---

## 📦 DATABASE SCHEMA (8 Tables)

### Core Tables (Existing Migration)
```sql
item_requests          -- Main request records
request_items          -- Line items with open text fields
request_approvals      -- Building Tech & Tech Director approvals
request_activity       -- Complete audit trail
request_documents      -- Document attachments
```

### Supplier Integration Tables (New Migration)
```sql
supplier_quotes        -- Quote management
order_tracking         -- Order status tracking
invoice_checklist      -- Documentation tracking
```

---

## 📋 React Components (8 Total)

### Technician Login Components
```
RequestsTab.jsx
├─ My Requests view
├─ Status display
└─ Links to main webapp details

RequestFormModal.jsx
├─ 2-step wizard
├─ Step 1: Basic info
└─ Step 2: Add items

RequestStatusBadge.jsx
└─ Status indicator
```

### Main Webapp Components
```
RequestDetailsModal.jsx
├─ Full request view
├─ Items list
├─ Approval history
├─ Quote details (if available)
├─ Order tracking (if available)
├─ Documents (if available)
└─ Activity log

RequestApprovalPanel.jsx
├─ Approve/Reject buttons
├─ Comment field
└─ Edit fields option

QuoteManagementPanel.jsx
├─ Create quote request
├─ View supplier response
├─ Add prices
├─ Upload PDF
└─ Process quote

OrderTrackingPanel.jsx
├─ Place PO
├─ Track status
├─ Mark received
└─ Upload documents

InvoiceChecklistWidget.jsx
├─ Dynamic checklist
├─ Document upload
└─ Status tracking
```

---

## 🚀 DEPLOYMENT - NO BREAKING CHANGES

### What's Added (NEW)
- ✅ "Requests" tab in technician login (3rd tab)
- ✅ Main webapp views for managers/directors/accountants
- ✅ Backend API endpoints
- ✅ Database tables (new migration)

### What's NOT Changed (SAFE)
- ✅ Existing technician login tabs (Scanner, Spare Parts, etc.)
- ✅ Existing main webapp functionality
- ✅ Existing authentication
- ✅ Existing user roles
- ✅ All current features work as before

---

## 📊 DATABASE MIGRATIONS

### Migration 1 (Already exists)
```
database/migrations/001-item-requests.sql
```
- 5 core tables
- Functions & triggers
- RLS policies

### Migration 2 (To Create)
```
database/migrations/002-supplier-quotes.sql
```
- supplier_quotes table
- order_tracking table
- invoice_checklist table
- Additional indexes
- Additional RLS policies

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1 - Technician Login (Quick)
```
1. Add "Requests" tab to RFIDLoginPage.jsx
2. Import RequestsTab, RequestFormModal, RequestStatusBadge
3. Copy minimal components
4. Test request creation
✅ Technician can create and track requests
```

### Phase 2 - Main Webapp Integration (Core)
```
1. Create role-based dashboard views
2. Implement approval panels
3. Add quote management UI
4. Add order tracking UI
5. Add invoice checklist widget
6. Connect all APIs
✅ Managers can approve and track
```

### Phase 3 - Supplier Integration
```
1. Implement supplier quote workflow
2. Add PDF upload/storage
3. Implement order tracking
4. Add status update system
✅ Full supplier integration working
```

### Phase 4 - Accounting Integration
```
1. Create accountant dashboard
2. Implement payment processing view
3. Add final approval workflow
4. Complete audit trail reporting
✅ System ready for accounting
```

---

## 🔍 ZERO BREAKING CHANGES

✅ **Existing code completely safe**
- Only adding new features
- Not modifying existing code
- Not changing existing tables
- Not affecting existing users
- Not breaking existing workflows

✅ **Gradual rollout possible**
- Deploy technician login first (low risk)
- Deploy manager dashboard next
- Enable by role/permission
- Can be toggled off if needed

---

## 📝 FILES IN REPOSITORY

**Branch:** `feature/multi-user-roles-extended-technician`

### Existing (Already Created)
```
✅ database/migrations/001-item-requests.sql
✅ src/api/requests.js
✅ src/components/technician/RequestsTab.jsx
✅ src/components/technician/RequestFormModal.jsx
✅ src/components/technician/RequestDetailsModal.jsx
✅ src/components/technician/RequestApprovalPanel.jsx
✅ src/components/technician/RequestStatusBadge.jsx
✅ src/hooks/useRequestsApi.js
✅ REQUESTS-FEATURE-README.md
✅ deployment-checklist.md (this file)
```

### Next to Create
```
🔄 database/migrations/002-supplier-quotes.sql
🔄 src/api/quotes.js
🔄 src/api/orders.js
🔄 src/components/technician/QuoteManagementPanel.jsx
🔄 src/components/technician/OrderTrackingPanel.jsx
🔄 src/components/technician/InvoiceChecklistWidget.jsx
🔄 src/components/technician/DocumentUploadWidget.jsx
🔄 src/hooks/useQuotesApi.js
🔄 src/hooks/useOrdersApi.js
🔄 src/pages/MainApp/BuildingTechDashboard.jsx
🔄 src/pages/MainApp/MaintenanceOrgDashboard.jsx
🔄 src/pages/MainApp/TechDirectorDashboard.jsx
🔄 src/pages/MainApp/AdminDashboard.jsx
🔄 src/pages/MainApp/AccountantDashboard.jsx
🔄 SUPPLIER-QUOTES-GUIDE.md
🔄 ORDER-TRACKING-GUIDE.md
```

---

## ✅ FINAL CHECKLIST

- [ ] Technician login has "Requests" tab
- [ ] Technician can create requests
- [ ] Technician can view their request status
- [ ] Main webapp has Building Tech dashboard
- [ ] Building Tech can see pending approvals
- [ ] Building Tech can approve/reject
- [ ] Maintenance Org can manage quotes
- [ ] Maintenance Org can track orders
- [ ] Tech Director can see quote + approve
- [ ] Accountant can see pending payments
- [ ] All audit trails working
- [ ] No existing features broken
- [ ] No existing code modified
- [ ] Zero breaking changes

---

**Status:** ✅ **Architecture Ready**
**Technician Login:** Requests tab (minimal)
**Main Webapp:** Full control center
**Breaking Changes:** ZERO
**Ready to Build:** YES

Happy building! 🚀

*Complete Item Request & Supplier Order Management System*
*Architecture: Technician Login (Create) + Main Webapp (Manage)*
*January 10, 2026*