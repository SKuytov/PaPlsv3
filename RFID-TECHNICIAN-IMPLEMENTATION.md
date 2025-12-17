# RFID Technician User System - Implementation Guide

## 🎯 Overview

This feature adds support for **Technician** users who:
- Login via USB RFID card reader (keyboard emulation)
- Use a restricted **Scanner** (can only register USAGE/ISSUE transactions, not restock)
- View a read-only **Spare Parts** catalog
- Have all activities logged for audit trail

**Branch:** `feature/rfid-maintenance-users`

---

## 📋 What's Included

### Frontend Components (React)

| File | Purpose |
|------|----------|
| `src/utils/rfidReader.js` | USB keyboard RFID reader utility - handles keypress events |
| `src/components/auth/RFIDLogin.jsx` | RFID login UI with card reader animation |
| `src/components/modules/MaintenanceScanner.jsx` | Restricted scanner for technicians (usage-only) |
| `src/components/modules/MaintenanceSpareParts.jsx` | Read-only spare parts catalog view |
| `src/pages/RFIDLoginPage.jsx` | Main page orchestrating login + scanner/parts tabs |

### Backend (Node.js/Express)

| File | Purpose |
|------|----------|
| `backend/routes/authRoutes.js` | RFID authentication endpoints |
| `backend/server.js` | Updated to mount auth routes |

### Database (Supabase/PostgreSQL)

| File | Purpose |
|------|----------|
| `database-migrations/RFID-TECHNICIAN-SETUP.sql` | Complete SQL migration |

---

## 🚀 Quick Start (5 Steps)

### Step 1: Run Database Migration

In **Supabase Console** → SQL Editor:

```bash
# Copy entire contents of database-migrations/RFID-TECHNICIAN-SETUP.sql
# Paste into Supabase SQL Editor
# Click "Run"
```

This creates:
- `rfid_cards` table (RFID card ↔ user mapping)
- `rfid_login_audit` table (login tracking)
- Views for reporting
- RLS policies for security

### Step 2: Create a Technician User

In Supabase:

1. **Go to Auth → Users → Create User**
   - Email: `technician@example.com`
   - Password: `SecurePassword123!`
   - Don't auto-generate password

2. **Get User ID** - Copy the UUID from the user row

3. **In Database** → SQL Editor, run:

```sql
INSERT INTO public.rfid_cards 
(card_id, user_id, card_holder_name, card_holder_department, notes)
VALUES 
('0000123456', 'YOUR_USER_UUID_HERE', 'John Technician', 'Maintenance', 'Test card');
```

**Replace:**
- `'0000123456'` with actual RFID card ID
- `'YOUR_USER_UUID_HERE'` with the user UUID from step 2

### Step 3: Update Backend Environment

On your Ubuntu VPS, update `backend/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
VITE_API_URL=http://localhost:5000
```

**Where to find:**
- `SUPABASE_URL` → Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` → same location, labeled "service_role"

### Step 4: Restart Backend

```bash
cd /path/to/PaPlsv3/backend
npm install  # if needed
node server.js
```

Check health:
```bash
curl http://localhost:5000/api/health
```

Should see `"rfid_auth": "enabled"`.

### Step 5: Add Frontend Route

In your router file (likely `src/components/AppRouter.jsx` or similar):

```jsx
import RFIDLoginPage from '@/pages/RFIDLoginPage';

// Add route:
<Route path="/technician-login" element={<RFIDLoginPage />} />
```

Access at: `http://your-app/technician-login`

---

## 🔑 Key Features

### RFID Card Reader

- **No external libraries required** - uses native DOM keyboard events
- **Supports:** Any USB RFID reader that emulates keyboard (plug-and-play)
- **Configuration in `rfidReader.js`:**
  - `minLength: 8` - minimum card ID length
  - `maxLength: 50` - maximum card ID length
  - `timeoutMs: 100` - buffer timeout
  - Handles optional prefix/suffix characters

### Technician Scanner

**Permissions:**
- ✅ Can scan items
- ✅ Can register "USAGE" transactions (consume stock)
- ✅ Can view item details
- ✅ Can select machine for usage
- ✅ Can add notes/reason
- ❌ Cannot restock (no button shown)
- ❌ Cannot modify prices
- ❌ Cannot delete items

**Transaction Recording:**
```javascript
{
  part_id: uuid,
  machine_id: uuid,
  transaction_type: 'usage', // ALWAYS 'usage' for technicians
  quantity: -5, // Always negative (consuming stock)
  performed_by: user_id,
  performed_by_role: 'technician' // Tracked for audit
}
```

### Spare Parts Catalog

**Features:**
- 📦 Search by name, part number, or barcode
- 🔍 Sort by name, stock level, or cost
- 📊 View current stock and min thresholds
- 💰 See average cost
- 📋 View full details in modal
- ✅ Read-only (no create/edit/delete)

---

## 🔐 Security & Audit

### Row Level Security (RLS)

**`rfid_cards` table:**
- Authenticated users can read
- Only admins can modify

**`rfid_login_audit` table:**
- Backend service role inserts events
- Admins can query for reporting

**`inventory_transactions` table:**
- Database constraint prevents technicians from creating "restock" transactions
- All technician transactions are tagged with `performed_by_role = 'technician'`

### Audit Trail

**Every RFID login attempt is logged:**
```sql
SELECT * FROM rfid_login_audit
WHERE user_id = 'UUID'
ORDER BY created_at DESC;
```

Includes:
- ✅ Success/failure
- ✅ Timestamp
- ✅ IP address
- ✅ User agent
- ✅ Error message (if failed)

---

## 🧪 Testing

### Test RFID Login Endpoint

```bash
curl -X POST http://localhost:5000/api/auth/rfid-login \
  -H "Content-Type: application/json" \
  -d '{
    "rfid_card_id": "0000123456"
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "technician": {
    "id": "uuid...",
    "name": "John Technician",
    "email": "technician@example.com",
    "rfid_card_id": "0000123456",
    "role": "technician"
  },
  "message": "Welcome John Technician"
}
```

**Expected Response (Failure):**
```json
{
  "error": "Card not recognized. Please contact administrator.",
  "code": "CARD_NOT_FOUND"
}
```

### Test with Browser

1. Navigate to `/technician-login`
2. Click **Manual Entry** (if reader not connected)
3. Enter test card ID (e.g., `0000123456`)
4. Click **Login**
5. Should show Scanner and Spare Parts tabs

### Test Scanner

1. After login, in **Scanner** tab
2. Scan or manually enter a part barcode
3. Verify:
   - ✅ Only "Use Item" button shown (no Restock)
   - ✅ Can select quantity and machine
   - ✅ Can add notes
   - ✅ Transaction saved with `performed_by_role = 'technician'`

---

## 📊 Database Views

### Technician Recent Activities

```sql
SELECT * FROM public.technician_recent_activities
LIMIT 10;
```

Shows all usage transactions by technicians with part names, quantities, machines.

### Active RFID Cards

```sql
SELECT * FROM public.active_rfid_cards_view;
```

Lists all active RFID cards assigned to technicians.

### Login Statistics

```sql
SELECT * FROM public.rfid_login_statistics
ORDER BY last_login DESC;
```

Shows login counts and last access for each technician.

---

## 🔧 Configuration

### RFID Reader Settings

Edit `src/utils/rfidReader.js`:

```javascript
const rfidReader = new RFIDReader({
  minLength: 8,         // Minimum card ID length
  maxLength: 50,        // Maximum card ID length
  timeoutMs: 100,       // Wait time for complete read
  prefixChar: null,     // e.g., '^' if reader sends ^CARDID
  suffixChar: null,     // e.g., '^' if reader sends CARDID^
  clearOnRead: true     // Clear buffer after successful read
});
```

### Backend Port & URL

Edit `backend/.env` or `src/components/auth/RFIDLogin.jsx`:

```javascript
const response = await fetch(
  `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/rfid-login`,
  // ...
);
```

---

## 🐛 Troubleshooting

### "Card not recognized"

**Cause:** Card ID not in `rfid_cards` table or user not assigned technician role

**Fix:**
```sql
-- Verify card exists
SELECT * FROM rfid_cards WHERE card_id = '0000123456';

-- Verify user has technician role
SELECT u.*, r.name 
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.id = 'USER_UUID';
```

### "Could not access camera"

**Cause:** Browser doesn't have camera permissions

**Fix:**
- Grant camera permission in browser settings
- Or use Manual Entry mode

### Backend not responding

**Check:**
```bash
# SSH to VPS
ssh root@your-vps-ip

# Check if backend is running
lsof -i :5000

# Check logs
cd /path/to/backend
node server.js
```

### RFID reader not detected

**Check:**
1. USB reader plugged in
2. Open browser DevTools (F12) → Console
3. Try manual entry instead
4. Check if reader works in text editor (Notepad)

---

## 📈 Deployment Checklist

- [ ] Run database migration (RFID-TECHNICIAN-SETUP.sql)
- [ ] Create technician users in Supabase Auth
- [ ] Assign RFID cards in `rfid_cards` table
- [ ] Set backend environment variables
- [ ] Restart backend service
- [ ] Add frontend route
- [ ] Test login flow
- [ ] Test scanner (usage only)
- [ ] Test spare parts view (read-only)
- [ ] Verify audit logs are recorded

---

## 📚 File Structure

```
feature/rfid-maintenance-users/
├── backend/
│   ├── routes/
│   │   └── authRoutes.js                 # RFID auth endpoints
│   └── server.js                         # Updated with auth routes
├── database-migrations/
│   └── RFID-TECHNICIAN-SETUP.sql         # Complete DB schema
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── RFIDLogin.jsx             # RFID login UI
│   │   └── modules/
│   │       ├── MaintenanceScanner.jsx    # Usage-only scanner
│   │       └── MaintenanceSpareParts.jsx # Read-only parts
│   ├── pages/
│   │   └── RFIDLoginPage.jsx             # Main entry point
│   └── utils/
│       └── rfidReader.js                 # RFID reader logic
└── RFID-TECHNICIAN-IMPLEMENTATION.md     # This file
```

---

## 🤝 Support

**Issues?**
1. Check the **Troubleshooting** section above
2. Review backend logs: `tail -f /var/log/backend.log`
3. Check Supabase logs: Dashboard → Logs → Edge Functions
4. Verify RLS policies in Supabase: Dashboard → Authentication → Policies

---

## 📝 Next Steps

1. **Merge** this feature branch to `main`
2. **Deploy** backend changes
3. **Test** in production
4. **Monitor** audit logs for usage patterns
5. **Scale** with additional RFID readers

---

**Happy maintaining! 🔧**
