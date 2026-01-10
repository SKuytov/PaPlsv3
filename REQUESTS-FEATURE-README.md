# 📋 Item Request & Supplier Order Management System

## Overview

A **production-ready multi-level procurement workflow** with complete supplier integration for your WMS/CMMS system. Operationaltechnicians can request items through approval process with integrated supplier quote management, order tracking, and accounting handoff.

## 🚀 Quick Facts

- ✅ **8 database tables** with relationships and RLS policies
- ✅ **18 API endpoints** fully implemented
- ✅ **8 React components** ready to use
- ✅ **Complete audit trail** of all actions
- ✅ **Multi-phase workflow** (Request → Quote → Approval → Order → Receipt → Accounting)
- ✅ **Supplier integration** with quote management
- ✅ **Invoice checklist** for documentation tracking
- ✅ **Order tracking** with status updates
- ✅ **Production-tested patterns**
- ✅ **Zero breaking changes** to existing code

## 📦 Complete Workflow

### Phase 1: Request & Building Tech Approval
```
TECHNICIAN Creates Request (with items)
        ↓
Submits for Approval
        ↓
BUILDING TECH Reviews & Approves (Level 1)
        ↓
Status: BUILDING_APPROVED
```

### Phase 2: Supplier Quote Management
```
MAINTENANCE ORG Creates Quote Request
        ↓
Sends to Supplier
        ↓
SUPPLIER Responds with Quote
        ↓
MAINTENANCE ORG Reviews Quote
        ↓
Adds Final Prices for Each Item
        ↓
Attaches Quote PDF
        ↓
Status: QUOTE_PROCESSED
```

### Phase 3: Tech Director Approval
```
TECH DIRECTOR Reviews Request with Quote
        ↓
Reviews Prices & Budget
        ↓
APPROVES or REJECTS
        ↓
If APPROVED: Status = TECH_APPROVED
If REJECTED: Maintenance Org Can Request New Quote
```

### Phase 4: Order Execution
```
MAINTENANCE ORG Places Order
        ↓
Creates & Sends PO to Supplier
        ↓
Status: ORDER_PLACED
        ↓
SUPPLIER Confirms Order
        ↓
Status: ORDER_CONFIRMED
        ↓
Items Shipped
        ↓
Status: IN_TRANSIT
```

### Phase 5: Receipt & Tracking
```
Items Arrive at Warehouse
        ↓
MAINTENANCE ORG Verifies All Items
        ↓
Marks Items as RECEIVED
        ↓
Status: ITEMS_RECEIVED
        ↓
INVOICE CHECKLIST Appears:
  ☐ Invoice Received
  ☐ Transportation Documents Received
  ☐ (If Proforma) Advance Payment Invoice Received
  ☐ (After Receipt) Final Invoice Received
```

### Phase 6: Documentation Completion
```
MAINTENANCE ORG Checks Off Items as Received:
        ↓
Status: AWAITING_DOCUMENTATION
        ↓
All Items Checked
        ↓
Status: DOCUMENTATION_COMPLETE
```

### Phase 7: Accounting Handoff
```
MAINTENANCE ORG Attaches All Documents:
  - Quote PDF
  - PO Confirmation
  - Invoices (Proforma + Final)
  - Transportation Documents
  - Receipt Confirmation
        ↓
Sends to Accounting Department
        ↓
Status: SUBMITTED_TO_ACCOUNTING
        ↓
✅ COMPLETE
        ↓
Full Activity Log Shows Every Change
```

## 📋 Database Schema (8 Tables)

### Core Tables

**item_requests** - Main request records
```sql
id, request_number, status, priority
submitter_id, submitter_email, building_id
estimated_budget, actual_cost
created_at, submitted_at, completed_at
```

**request_items** - Line items (open text fields)
```sql
id, request_id, item_name
quantity, unit, estimated_unit_price, actual_unit_price
specs (JSONB)
```

**request_approvals** - Multi-level approval tracking
```sql
id, request_id, approval_level
approval_role, approver_id, status
comments, edited_fields (JSONB)
```

### Supplier Integration Tables

**supplier_quotes** - Quote management
```sql
id, request_id, supplier_id, supplier_name
quote_pdf_url, items_with_prices (JSONB)
status (PENDING, RECEIVED, REVIEWED, APPROVED)
created_at, received_at, reviewed_at
```

**order_tracking** - Order status
```sql
id, request_id, po_number
status (PLACED, CONFIRMED, IN_TRANSIT, RECEIVED)
expected_delivery_date, actual_delivery_date
```

**invoice_checklist** - Documentation tracking
```sql
id, request_id
invoice_received (bool, date)
transport_docs_received (bool, date)
proforma_invoice_received (bool, date)
final_invoice_received (bool, date)
items_received (bool, date)
```

### Supporting Tables

**request_activity** - Complete audit trail
```sql
id, request_id, action
actor_id, actor_email, timestamp
action_details (JSONB)
```

**request_documents** - Document attachments
```sql
id, request_id, document_type
file_url, file_name, uploaded_by_id
created_at
```

## 🔄 Request Status Values

```
DRAFT
  ↓
SUBMITTED (awaiting Building Tech)
  ↓
BUILDING_APPROVED (Level 1 complete)
  ↓
QUOTE_REQUESTED (Maintenance Org creates quote)
  ↓
QUOTE_RECEIVED (Supplier responded)
  ↓
QUOTE_PROCESSED (Prices added, PDF attached)
  ↓
TECH_DIRECTOR_REVIEW_PENDING (Level 3 review)
  ↓
TECH_APPROVED (Level 3 complete)
  ↓
ORDER_PLACED (PO sent to supplier)
  ↓
ORDER_CONFIRMED (Supplier confirmed)
  ↓
IN_TRANSIT (Items shipped)
  ↓
ITEMS_RECEIVED (Arrived at warehouse)
  ↓
AWAITING_DOCUMENTATION (Checklist pending)
  ↓
DOCUMENTATION_COMPLETE (All docs received)
  ↓
SUBMITTED_TO_ACCOUNTING (Sent for payment)
  ↓
✅ EXECUTED (Complete)

[Can be REJECTED at Building Tech or Tech Director approval stages]
```

## 🎯 Role-Based Access

| Role | Create | Submit | Building Tech | Quote Mgmt | Tech Director | Execute | Accounting |
|------|--------|--------|---------------|-----------|---------------|---------|------------|
| **Op. Technician** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Building Tech** | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Maintenance Org** | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Tech Director** | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| **God Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Accountant** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

## 👥 Role Details

### Technician (Op. Technician)
- Creates request with items
- Submits for approval
- Views own requests
- Cannot approve or manage quotes

### Building Technician
- Reviews technician requests
- Approves or rejects
- First approval gate
- Cannot manage quotes

### Maintenance Organizer
- **Quote Phase:** Creates quote request, reviews supplier response, adds prices, uploads PDF
- **Execution Phase:** Places order, tracks shipment, receives items
- **Documentation Phase:** Completes invoice checklist, collects documents, sends to accounting
- Key role in supplier integration

### Tech Director
- Reviews complete request with quote and prices
- Approves or rejects
- Final technical/budget approval

### God Admin
- Full system access
- View all requests
- View all audit trails
- System administration

### Accountant (NEW)
- Receives completed orders with all documents
- Processes payment
- Views audit trail
- No creation permissions

## 💎 API Endpoints (18 Total)

### Request Management (Core)
```
POST   /api/requests                    - Create request
POST   /api/requests/:id/items          - Add items
POST   /api/requests/:id/submit         - Submit for approval
GET    /api/requests/:id                - Get details
GET    /api/requests                    - Get my requests
GET    /api/requests/:id/activity       - Get audit trail
```

### Approval Workflow
```
GET    /api/requests/pending-approvals  - Get pending for user
POST   /api/requests/:id/approve        - Approve
POST   /api/requests/:id/reject         - Reject
PATCH  /api/requests/:id/edit           - Edit details
```

### Supplier Quote Management (NEW)
```
POST   /api/quotes                      - Create quote request
GET    /api/quotes/:id                  - Get quote details
POST   /api/quotes/:id/receive          - Receive supplier quote
PATCH  /api/quotes/:id/process          - Process quote (add prices, upload PDF)
GET    /api/quotes/pending              - Get pending quotes
```

### Order Tracking (NEW)
```
POST   /api/orders/:id/place            - Place order
PATCH  /api/orders/:id/status           - Update order status
POST   /api/orders/:id/receive-items    - Mark items received
PATCH  /api/orders/:id/checklist        - Update checklist
POST   /api/orders/:id/submit-accounting - Send to accounting
```

### Documents
```
POST   /api/documents/:id               - Upload document
GET    /api/documents/:id               - Get documents
DELETE /api/documents/:docId            - Delete document
```

## 🚰 React Components (8 Total)

**Core Components:**
- `RequestsTab.jsx` - Main dashboard with multiple tabs
- `RequestFormModal.jsx` - Request creation wizard
- `RequestDetailsModal.jsx` - Full request viewer
- `RequestApprovalPanel.jsx` - Approval interface
- `RequestStatusBadge.jsx` - Status indicator

**New Components:**
- `QuoteManagementPanel.jsx` - Quote creation/review/processing
- `OrderTrackingPanel.jsx` - Order status and receipt
- `InvoiceChecklistWidget.jsx` - Documentation checklist

## 🚀 Getting Started

### Step 1: Database Setup (5 min)
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy `database/migrations/001-item-requests.sql`
4. Paste and execute
5. Copy `database/migrations/002-supplier-quotes.sql` (NEW)
6. Paste and execute

### Step 2: Backend Integration (5 min)
```javascript
// In app.js:
const requestsRouter = require('./src/api/requests');
const quotesRouter = require('./src/api/quotes');
const ordersRouter = require('./src/api/orders');

app.use('/api', requestsRouter);
app.use('/api', quotesRouter);
app.use('/api', ordersRouter);

// In .env:
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Step 3: Frontend Integration (5 min)
```javascript
// In RFIDLoginPage.jsx:
import RequestsTab from '@/components/technician/RequestsTab';

<TabsTrigger value="requests">📋 Requests</TabsTrigger>
<TabsContent value="requests">
  <RequestsTab technicianInfo={technicianInfo} />
</TabsContent>
```

## 🎉 Features

✅ **Open Text Fields** - No predefined items
✅ **Multi-item Support** - Unlimited items per request
✅ **Supplier Quote Integration** - Full quote workflow
✅ **Price Tracking** - Estimated vs actual
✅ **PDF Quote Storage** - Attachment system
✅ **Order Tracking** - Status updates
✅ **Receipt Confirmation** - Warehouse verification
✅ **Invoice Checklist** - Dynamic documentation tracking
✅ **Accounting Handoff** - Ready for payment processing
✅ **Complete Audit Trail** - Every action logged
✅ **Role-Based Access** - Automatic routing
✅ **Production Ready** - Error handling, validation, security

---

**Status:** ✅ **Production Ready**
**Last Updated:** January 2026
**Branch:** `feature/multi-user-roles-extended-technician`