# ⚡ QUICKSTART - Get Running in 30 Minutes

**🎯 Goal**: Deploy Quote Requests & Supplier Invoices to production TODAY  
**⏱️ Time**: ~30 minutes for experienced developers  
**💫 Target**: Hostinger VPS KVM4 Ubuntu + Supabase

---

## 📍 YOU ARE HERE

You've just pulled the `feature/multi-user-roles-extended-technician` branch which contains:

✅ 2 new backend routes (quote-requests, supplier-invoices)  
✅ 2 database migration files  
✅ 3 React pages and components  
✅ 1 custom hook for invoices  
✅ Complete documentation  

---

## ⚡ STEP-BY-STEP EXECUTION

### ✋ STEP 0: Prerequisites Check (2 min)

```bash
# In your terminal, verify:
node --version        # Should be 18+
npm --version         # Should be 9+
git branch           # Should show: feature/multi-user-roles-extended-technician
```

If branch is wrong:
```bash
git checkout feature/multi-user-roles-extended-technician
git pull origin feature/multi-user-roles-extended-technician
```

---

### 🗄️ STEP 1: Create Database Tables (5 min)

**Go to**: https://supabase.com → Your Project → SQL Editor

**Copy ENTIRE content** from this file:
```
database/migrations/001_create_quote_requests.sql
```

- Paste in SQL Editor
- Click "Run"
- ✅ Should say "Success"

**Repeat for**:
```
database/migrations/002_create_supplier_invoices.sql
```

**Verify** in Supabase:
- Go to "Table Editor"
- You should see: `quote_requests` and `supplier_invoices` tables

---

### 🖥️ STEP 2: Update Backend (3 min)

**In your VPS SSH session**:

```bash
cd /path/to/PaPlsv3
git pull origin feature/multi-user-roles-extended-technician

cd backend
npm install

# VERIFY: Check these files exist
ls routes/quoteRequestsRoutes.js
ls routes/supplierInvoicesRoutes.js
```

**Check** `backend/server.js` contains:
```javascript
import quoteRequestsRoutes from './routes/quoteRequestsRoutes.js';
import supplierInvoicesRoutes from './routes/supplierInvoicesRoutes.js';

app.use('/api', quoteRequestsRoutes);
app.use('/api', supplierInvoicesRoutes);
```

If missing, they're already added. Just verify.

**Restart backend**:
```bash
pm2 restart PaPlsv3
pm2 logs PaPlsv3 --lines 50
```

Look for:
```
✅ Backend server running on HTTPS port 5000
```

---

### 🎨 STEP 3: Update Frontend (3 min)

**Check** `src/App.jsx` has these routes:

```jsx
import QuoteRequests from './pages/QuoteRequests';
import SupplierInvoices from './pages/SupplierInvoices';

// Inside your <Routes> component:
<Route path="/quote-requests" element={<QuoteRequests />} />
<Route path="/supplier-invoices" element={<SupplierInvoices />} />
```

If NOT there, add them.

**Build**:
```bash
cd /path/to/PaPlsv3
npm run build
```

Should complete without errors.

**Deploy** (choose one):

*Option A: Vercel/Netlify auto-deploy*
```bash
git add -A
git commit -m "feat: Deploy supplier invoices system"
git push origin feature/multi-user-roles-extended-technician
```

*Option B: Manual VPS deployment*
```bash
rsync -avz dist/ user@partpulse.eu:/var/www/html/
```

---

### 🧪 STEP 4: Test Everything (5 min)

**Open browser**: https://partpulse.eu

**Test 1: Quote Requests**
1. Go to: `/quote-requests`
2. Click "New Request"
3. Fill:
   - Title: "Test Quote"
   - Description: "Testing system"
   - Budget: 1000
   - Priority: Normal
4. Click "Create Request"
5. ✅ Should appear in list

**Test 2: Supplier Invoices**
1. Go to: `/supplier-invoices`
2. Click "New Invoice"
3. Fill:
   - Invoice #: "INV-2024-0001"
   - Amount: 500
   - Received Date: Today
   - Due Date: 30 days out
4. Click "Log Invoice"
5. ✅ Should appear with status "Pending"
6. Click "Send"
7. ✅ Status changes to "Sent to Accounting"

**Test 3: No Errors**
1. Open browser console: F12
2. ✅ No red errors
3. Check backend logs: `pm2 logs PaPlsv3`
4. ✅ No error messages

---

## ✅ SUCCESS CHECKLIST

- [ ] Tables created in Supabase
- [ ] Backend routes updated and restarted
- [ ] Frontend code added to App.jsx
- [ ] Frontend built successfully
- [ ] Frontend deployed
- [ ] Can create quote request
- [ ] Can see quote request in list
- [ ] Can create supplier invoice
- [ ] Can see invoice in list
- [ ] Can send invoice to accounting
- [ ] No console errors
- [ ] No backend errors

---

## ⚠️ IF SOMETHING BREAKS

### Issue: "Table doesn't exist" error
**Solution**: 
1. Go to Supabase SQL Editor
2. Run `SELECT * FROM public.quote_requests;`
3. If fails, re-run the migration SQL

### Issue: 404 on endpoints
**Solution**:
1. Restart backend: `pm2 restart PaPlsv3`
2. Wait 5 seconds
3. Try again

### Issue: Frontend shows blank pages
**Solution**:
1. Hard refresh: Ctrl+Shift+R
2. Clear cache: Ctrl+Shift+Del
3. Check console: F12 → See errors?

### Issue: "Authorization failed"
**Solution**:
1. Log out and back in
2. Token might have expired
3. Refresh page

---

## 📚 DETAILED DOCS

After you get it working, read:

1. **DEPLOYMENT_GUIDE.md** - Full deployment instructions
2. **IMPLEMENTATION_GUIDE.md** - Technical details  
3. **FEATURES_IMPLEMENTED.md** - Complete feature list
4. **README.md** - General project info

---

## 🎯 EXACTLY WHAT CHANGED

### Backend Files Added
```
✅ backend/routes/quoteRequestsRoutes.js (5 API endpoints)
✅ backend/routes/supplierInvoicesRoutes.js (7 API endpoints)
✅ database/migrations/001_create_quote_requests.sql
✅ database/migrations/002_create_supplier_invoices.sql
```

### Frontend Files Added
```
✅ src/pages/QuoteRequests.jsx (full CRUD page)
✅ src/pages/SupplierInvoices.jsx (full CRUD page)
✅ src/components/CreateSupplierInvoiceForm.jsx (modal form)
✅ src/hooks/useSupplierInvoices.js (API hook)
```

### Backend Files Modified
```
✨ backend/server.js (added route imports & registration)
```

### Frontend Files to Modify
```
⚠️ src/App.jsx (add 2 new routes)
```

---

## 🚀 YOU'RE DONE!

If all tests pass, you're production-ready. 

**Celebrate! 🎉**

Your WMS/CMMS system now has:
- ✅ Full quote request management
- ✅ Supplier invoice tracking
- ✅ Accounting integration
- ✅ Production-grade error handling
- ✅ Database-level security (RLS)

---

## ❓ Questions?

Check:
1. Errors in browser console (F12)
2. Backend logs: `pm2 logs PaPlsv3`
3. Supabase SQL errors
4. DEPLOYMENT_GUIDE.md troubleshooting section

---

**Deployed**: January 10, 2026  
**Status**: 🟢 Ready for Production  
**Next Review**: After 1 week of production use
