# Quote ID Format & Supplier Part Mapping Updates

## 📋 Summary of Changes

This document outlines all the updates made to support the new Quote ID format (QT-YY-XXXXX) and automatic supplier part number/SKU loading with user warnings for missing data.

---

## 🔄 Quote ID Format Change

### New Format: `QT-YY-XXXXX`
- **QT**: Quote Type identifier
- **YY**: Last 2 digits of year (e.g., 25 for 2025)
- **XXXXX**: Sequential 5-digit number (padded with zeros)

### Examples
- `QT-25-01001` (First quote of 2025)
- `QT-25-01002` (Second quote of 2025)
- `QT-25-10500` (Quote #10500 of 2025)

### Implementation Location
**File**: `src/components/modules/quotes/ManualQuoteRequestModal.jsx` (Lines 47-57)

```javascript
const generateQuoteId = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  quoteCounter++;
  const sequentialNumber = quoteCounter.toString().padStart(5, '0');
  return `QT-${year}-${sequentialNumber}`;
};
```

### Where Quote IDs Appear
1. **Quote Creation Modal** - Step 1: Auto-generated display box
2. **Quote Review Screen** - Step 2: Summary section
3. **Confirmation Screen** - Step 3: Success card
4. **Copy Email Step** - Step 4: Email preview
5. **Quotes Dashboard** - Table display
6. **Quote Details Modal** - Header section
7. **Email Subject** - "Quote Request: X items [QT-YY-XXXXX]"
8. **Email Body** - "Quote ID: QT-YY-XXXXX"

---

## 🔗 Supplier Part Mapping Auto-Load Feature

### What This Does

When creating a quote, users can now:

1. **Select a Part** from the part selector
2. **Select a Supplier**
3. **Automatically Load**:
   - Supplier Part Number (from `supplier_part_mappings` table)
   - Supplier SKU (from `supplier_part_mappings` table)

### Missing Data Handling

**If data is missing in the database:**
- User sees a warning: ⚠️ "No Supplier Mapping for [Supplier Name]"
- They can **manually enter** supplier part number and SKU during quote creation
- The manually entered values are saved in the quote
- Email will show what's entered (manual or auto-loaded)

### Updated Files

#### 1. SearchablePartSelector.jsx
**Location**: `src/components/modules/quotes/SearchablePartSelector.jsx`

**Changes**:
- Added `selectedSupplier` prop to component
- Load `supplier_part_mappings` from Supabase with parts query
- Display supplier part info in dropdown when part is selected
- Show warnings if mapping is missing for the selected supplier
- Display mapping status in selected part card

**Key Features**:
```javascript
// Load supplier mappings
const { data, error: err } = await supabase
  .from('spare_parts')
  .select(`
    *,
    supplier_part_mappings(
      id,
      supplier_id,
      supplier_part_number,
      supplier_sku,
      supplier:supplier_id(id, name)
    )
  `);

// Get supplier info for selected part
const getSupplierPartInfo = (partId, supplierId) => {
  if (!supplierPartData[partId]) return null;
  return supplierPartData[partId].find(m => m.supplier_id === supplierId);
};
```

#### 2. ManualQuoteRequestModal.jsx
**Location**: `src/components/modules/quotes/ManualQuoteRequestModal.jsx`

**Changes**:
- Added `supplierPartNumber` and `supplierSku` to item state
- Auto-fetch supplier mappings when part/supplier changes
- Pass `selectedSupplier` to SearchablePartSelector
- Display supplier part fields in item form with:
  - Auto-filled values (if mapping exists)
  - Manual entry option (if mapping missing)
  - Warning badges for missing data
- Store supplier part data in quote items
- Include in email generation

**Key Features**:
```javascript
const [currentItem, setCurrentItem] = useState({
  part: null,
  quantity: '',
  unitPrice: '',
  notes: '',
  supplierPartNumber: '',  // NEW
  supplierSku: '',          // NEW
});

// Auto-load mappings
useEffect(() => {
  const loadSupplierMappings = async () => {
    if (!currentItem.part || !selectedSupplier?.id) return;
    
    const { data, error } = await supabase
      .from('supplier_part_mappings')
      .select('supplier_part_number, supplier_sku')
      .eq('part_id', currentItem.part.id)
      .eq('supplier_id', selectedSupplier.id)
      .single();
    
    if (data) {
      // Auto-fill if found
      setCurrentItem(prev => ({
        ...prev,
        supplierPartNumber: data.supplier_part_number || '',
        supplierSku: data.supplier_sku || ''
      }));
    }
  };
  
  loadSupplierMappings();
}, [currentItem.part?.id, selectedSupplier?.id]);
```

#### 3. EmailTemplateGenerator.jsx
**Location**: `src/components/modules/quotes/EmailTemplateGenerator.jsx`

**Changes**:
- Hardcoded delivery location to: `155 Blvd. Lipnik, 7005 Ruse, Bulgaria`
- Uses supplier part data from email template
- Email displays supplier part number and SKU (or N/A if missing)

---

## 📧 Email Template Updates

### Email Format

```
Dear [Supplier Name],

We are reaching out regarding a quote request for the following items:

------- QUOTE REQUEST DETAILS -------

Quote ID: QT-25-01001
Date: December 8, 2025
Delivery Date: [User specified]

------- REQUESTED ITEMS -------

Item 1:
  Part Name: [Part Name]
  Supplier Part Number: [Auto-loaded or Manual]
  Supplier SKU: [Auto-loaded or Manual]
  SKU/Internal ID: [From spare_parts table]
  Quantity: [User entered]
  Description: [From part]

Delivery Location: 155 Blvd. Lipnik, 7005 Ruse, Bulgaria

------- REQUESTOR INFORMATION -------

[Contact info]
PartPulse Industrial
www.partpulse.eu
```

---

## 🎯 User Flow

### Creating a Quote with Auto-Loaded Supplier Data

1. **Click "Create Quote Request"**
   - Modal opens, Quote ID auto-generated (e.g., `QT-25-01001`)
   - Quote ID displayed in highlighted box

2. **Select Supplier**
   - Supplier selector fills with options
   - Select desired supplier
   - Supplier info card displays below

3. **Add Item**
   - Click "Add New Item"
   - Select part from SearchablePartSelector
   - Part selector now shows:
     - Part name, SKU, category
     - IF supplier selected: Supplier part info (if exists)
     - IF supplier selected & no mapping: Warning ⚠️

4. **Supplier Part Number & SKU**
   - Fields appear automatically
   - If mapping exists:
     - Fields auto-fill with green checkmark
     - User can edit if needed
   - If mapping doesn't exist:
     - Fields empty with amber warning
     - User can enter manually
     - Fields have amber background to highlight

5. **Review & Send**
   - Quote summary shows all items
   - Email preview shows Quote ID and supplier part numbers
   - Email sent with correct format

---

## 🗄️ Database Requirements

### Tables Used

#### spare_parts
```sql
COLUMNS:
- id (uuid, primary key)
- name (text)
- sku (text)
- barcode (text)
- part_number (text)
- description (text)
- category (text)
- preferred_supplier_id (uuid, foreign key)
```

#### supplier_part_mappings
```sql
COLUMNS:
- id (uuid, primary key)
- part_id (uuid, foreign key to spare_parts)
- supplier_id (uuid, foreign key to suppliers)
- supplier_part_number (text) **REQUIRED FOR AUTO-LOAD**
- supplier_sku (text) **REQUIRED FOR AUTO-LOAD**
- created_at (timestamp)
```

**Note**: If `supplier_part_mappings` entry doesn't exist for a part/supplier combo, user is prompted to enter data manually.

---

## 🚀 Deployment Instructions

### Prerequisites
- Ensure `supplier_part_mappings` table exists with correct columns
- Ensure `spare_parts` table has supplier relationship setup

### Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Build
npm run build

# 4. Deploy to production
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo systemctl reload nginx

# 5. Clear browser cache
# Navigate to https://your-domain.com/quotes/dashboard
# Use Ctrl+Shift+Delete to clear browser cache
```

---

## ✅ Testing Checklist

- [ ] Quote IDs generate as `QT-25-XXXXX` format
- [ ] Quote ID increments correctly
- [ ] Quote ID persists across sessions
- [ ] Supplier part numbers auto-load when mapping exists
- [ ] Supplier SKU auto-loads when mapping exists
- [ ] Warning shows when mapping doesn't exist
- [ ] Manual entry works for missing mappings
- [ ] Email shows correct supplier part numbers
- [ ] Email shows `155 Blvd. Lipnik, 7005 Ruse, Bulgaria`
- [ ] Quote ID appears in email subject
- [ ] Quote ID appears in email body
- [ ] Quote ID appears in dashboard table
- [ ] Quote ID appears in quote details modal

---

## 📝 Notes

- The global `quoteCounter` starts at 1000 and increments with each quote creation
- To reset counter for production, modify the initialization value in `ManualQuoteRequestModal.jsx`
- All supplier part data is optional - if missing, users can enter manually
- Email template automatically uses data from `supplierPartNumber` and `supplierSku` fields on items

---

## 🔗 Related Files

1. `src/components/modules/quotes/ManualQuoteRequestModal.jsx` - Quote creation
2. `src/components/modules/quotes/SearchablePartSelector.jsx` - Part selection
3. `src/components/modules/quotes/EmailTemplateGenerator.jsx` - Email formatting
4. `src/components/modules/quotes/QuotesDashboard.jsx` - Quote listing/viewing
