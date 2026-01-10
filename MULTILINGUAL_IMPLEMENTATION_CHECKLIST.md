# 🚀 Multilingual Email Templates - Implementation Checklist

**Branch:** `feature/multi-user-roles-extended-technician`

**Status:** ✅ **FILES CREATED & READY**

---

## 📄 Files Created

### 1. &#10004; `emailTemplates.js` 
**Location:** `src/components/modules/quotes/emailTemplates.js`

**What it does:**
- Exports `emailTemplates` object with EN and BG translations
- Provides `getTemplate(languageCode)` function
- Exports `generateSubject()`, `formatItems()`, `formatList()`, `formatDate()` functions
- All email sections translated to Bulgarian
- Ready to use immediately

**Contains:**
- Subject lines (single item, multiple items, with Quote ID)
- Greeting messages
- Section headers
- Field labels (Part Name, Quantity, etc.)
- Professional format instructions
- Casual format text
- Technical format expectations
- All text in English and Bulgarian

### 2. &#10004; `MULTILINGUAL_EMAIL_TEMPLATES_GUIDE.md`
**Location:** Repository root

**Contains:**
- Complete implementation guide
- Step-by-step instructions
- Code examples
- Testing checklist
- Troubleshooting tips
- Future extension guide

---

## 🛠️ Implementation Steps (Next)

### STEP 1: Update `EmailTemplateGenerator.jsx`

**File:** `src/components/modules/quotes/EmailTemplateGenerator.jsx`

**Changes needed:**

**1.1** Add import at top:
```javascript
import { getTemplate } from './emailTemplates';
```

**1.2** Update function signature (line ~9):
```javascript
const EmailTemplateGenerator = ({ 
  quoteData, 
  supplierData, 
  partData, 
  quoteId = '', 
  showCopyOnly = false, 
  items = [],
  languageCode = 'EN'  // ADD THIS
}) => {
```

**1.3** In the subject useMemo (around line 23):
```javascript
const subject = useMemo(() => {
  if (!supplierData) return '';
  
  const template = getTemplate(languageCode);  // ADD THIS
  let subjectText = 'Quote Request';
  
  if (isMultipleItems) {
    subjectText = template.subject.items(items.length);  // CHANGE
  } else if (partData?.name) {
    const quantity = quoteData.quantity_requested || quoteData.quantity || 1;
    subjectText = template.subject.singleItem(quantity, partData.name);  // CHANGE
  }
  
  const idPart = quoteId ? ` [${quoteId}]` : '';
  return `${subjectText}${idPart}`;
}, [partData, quoteData, supplierData, quoteId, isMultipleItems, items.length, languageCode]);  // ADD languageCode
```

**1.4** Update dependencies in subject useMemo:
Add `languageCode` to dependency array

---

### STEP 2: Update `Suppliers.jsx`

**File:** `src/components/modules/Suppliers.jsx`

**Changes needed:**

**2.1** Update formData state (around line 38):
```javascript
const [formData, setFormData] = useState({
  name: '', 
  contact_person: '', 
  email: '', 
  phone: '', 
  address: '',
  is_oem: false, 
  quality_score: 80, 
  delivery_score: 80, 
  price_stability_score: 80,
  preferred_language: 'EN',  // ADD THIS
});
```

**2.2** In openModal function (around line 70):
```javascript
const openModal = (supplier = null) => {
  setEditingSupplier(supplier);
  if (supplier) {
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      is_oem: supplier.is_oem || false,
      quality_score: supplier.quality_score || 80,
      delivery_score: supplier.delivery_score || 80,
      price_stability_score: supplier.price_stability_score || 80,
      preferred_language: supplier.preferred_language || 'EN',  // ADD THIS
    });
  } else {
    setFormData({
      name: '', 
      contact_person: '', 
      email: '', 
      phone: '', 
      address: '',
      is_oem: false, 
      quality_score: 80, 
      delivery_score: 80, 
      price_stability_score: 80,
      preferred_language: 'EN',  // ADD THIS
    });
  }
  setModalOpen(true);
};
```

**2.3** Add field to form in Modal (after address field, around line 120):
```javascript
<div className="col-span-2 pt-2 border-t">
  <label className="text-sm font-medium">Preferred Communication Language</label>
  <select
    className="w-full p-2 border rounded bg-white"
    value={formData.preferred_language}
    onChange={e => setFormData({...formData, preferred_language: e.target.value})}
  >
    <option value="EN">🇬🇧 English</option>
    <option value="BG">🇧🇬 Български (Bulgarian)</option>
  </select>
</div>
```

---

### STEP 3: Update Component Calls

**Find all** `<EmailTemplateGenerator` calls and add `languageCode` prop:

**Search for:**
```
<EmailTemplateGenerator
```

**Replace with:**
```javascript
<EmailTemplateGenerator
  quoteData={quoteData}
  supplierData={supplierData}
  partData={partData}
  quoteId={quoteId}
  items={selectedItems}
  languageCode={supplierData?.preferred_language || 'EN'}  // ADD THIS
  showCopyOnly={showCopyOnly}
/>
```

**Files where you might find EmailTemplateGenerator calls:**
- `QuoteRequestModal.jsx`
- `ManualQuoteRequestModal.jsx`
- `QuotesDashboard.jsx`
- `EnhancedQuoteCreationFlow.jsx`
- Any quote creation/management component

---

### STEP 4: (Optional) Database Migration

**Only if you want to persist language preference to database**

**Run in Supabase SQL Editor:**

```sql
ALTER TABLE suppliers 
ADD COLUMN preferred_language VARCHAR(2) DEFAULT 'EN';

COMMENT ON COLUMN suppliers.preferred_language IS 
  'Supplier preferred communication language: EN (English) or BG (Bulgarian)';

UPDATE suppliers SET preferred_language = 'EN' WHERE preferred_language IS NULL;
```

---

## ✅ Testing Checklist

After implementation, test:

- [ ] **Create Supplier**
  - [ ] Create new supplier with EN language
  - [ ] Create new supplier with BG language
  - [ ] Language preference is saved
  - [ ] Edit supplier retains language choice

- [ ] **Email Generation - English**
  - [ ] Generate quote for EN supplier
  - [ ] Subject line in English ✓
  - [ ] All sections in English ✓
  - [ ] Copy to clipboard works ✓
  - [ ] Open in Outlook works ✓
  - [ ] Send via Gmail works ✓

- [ ] **Email Generation - Bulgarian**
  - [ ] Generate quote for BG supplier
  - [ ] Subject line in Bulgarian (Cyrillic) ✓
  - [ ] All sections in Bulgarian ✓
  - [ ] Quote ID format correct ✓
  - [ ] Date format correct ✓
  - [ ] Copy to clipboard works ✓
  - [ ] Open in Outlook works ✓
  - [ ] Send via Gmail works ✓

- [ ] **Email Formats**
  - [ ] Professional format (EN & BG) ✓
  - [ ] Casual format (EN & BG) ✓
  - [ ] Technical format (EN & BG) ✓

- [ ] **Multiple Items**
  - [ ] Quote with 1 item (EN) ✓
  - [ ] Quote with 3+ items (EN) ✓
  - [ ] Quote with 1 item (BG) ✓
  - [ ] Quote with 3+ items (BG) ✓

- [ ] **Backwards Compatibility**
  - [ ] Existing suppliers without language pref work (default EN) ✓
  - [ ] Old quotes still generate correctly ✓

---

## 🔍 What Gets Translated

### Email Subject
- "Quote Request" → "Заявка за оферта"
- "Quote Request: 5 items" → "Заявка за оферта: 5 артикула"

### Email Body
- "Dear Supplier" → "Уважаеми доставчик"
- Section headers (QUOTE REQUEST DETAILS → ДЕТАЙЛИ НА ЗАЯВКАТА...)
- All field labels
- All closing text

### Formats
- Professional format ✓
- Casual format ✓
- Technical format ✓

### Date
- English: "January 10, 2025"
- Bulgarian: "10 януари 2025"

---

## 🌟 Quick Reference

**To use the templates:**

```javascript
// Import
import { getTemplate, generateSubject } from './emailTemplates';

// Get template for language
const templateBG = getTemplate('BG');
const templateEN = getTemplate('EN');

// Generate subject
const subject = generateSubject('BG', { 
  itemName: 'Motor',
  quantity: 5,
  quoteId: 'QT-2025-001'
});
// Result: "Заявка за оферта: 5x Motor [QT-2025-001]"

// Use templates
const greeting = templateBG.greeting('ABC Supply'); 
// Result: "Уважаеми ABC Supply,"
```

---

## ⏱️ Time Estimate

- **Step 1 (EmailTemplateGenerator):** 15 minutes
- **Step 2 (Suppliers):** 10 minutes  
- **Step 3 (Component calls):** 15 minutes
- **Step 4 (Database):** 5 minutes (optional)
- **Testing:** 20 minutes

**Total: 45-60 minutes**

---

## ✨ Benefits After Implementation

✅ **Suppliers receive emails in their language**
✅ **Professional & respectful international communication**
✅ **Easy to add more languages (French, German, etc.)**
✅ **All translations in one file (emailTemplates.js)**
✅ **No breaking changes to existing functionality**
✅ **Backwards compatible (defaults to English)**
✅ **Future-proof architecture**

---

## 📄 Documentation

- **Guide:** `MULTILINGUAL_EMAIL_TEMPLATES_GUIDE.md` (this repo)
- **Templates:** `src/components/modules/quotes/emailTemplates.js`
- **Implementation:** This checklist

---

## 🏦 Next Steps

1. ✅ Review `emailTemplates.js` - already created
2. ✅ Read `MULTILINGUAL_EMAIL_TEMPLATES_GUIDE.md` - already created
3. 📝 **Next:** Update `EmailTemplateGenerator.jsx` (Step 1)
4. 📝 **Next:** Update `Suppliers.jsx` (Step 2)
5. 📝 **Next:** Update component calls (Step 3)
6. 📝 **Next:** Test everything (Testing Checklist)

---

## 🙋 Need Help?

**Each file is self-contained:**
- `emailTemplates.js` - Can be used independently
- `MULTILINGUAL_EMAIL_TEMPLATES_GUIDE.md` - Full implementation details
- `MULTILINGUAL_IMPLEMENTATION_CHECKLIST.md` - This file, step-by-step

**All necessary strings are already translated in Bulgarian!**

---

**Status: 🏦 READY FOR IMPLEMENTATION**

🚀 Your system is prepared for international supplier communications!
