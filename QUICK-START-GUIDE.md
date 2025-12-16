# ⚡ QUICK START GUIDE - 15 MINUTES TO LIVE CATALOGUE

**Date:** December 16, 2025  
**Time Estimate:** 15-30 minutes  
**Goal:** Get your first machine catalogue live with sample data

---

## 🎯 THE PLAN

```
Step 1 (5 min):  Deploy code & run migrations
Step 2 (5 min):  Create sample machine
Step 3 (3 min):  Populate sample data (CSV import)
Step 4 (2 min):  Verify everything works
Step 5 (∞):      Enjoy your world-class catalogue! 🎉
```

---

## 📋 PRE-REQUISITES

- ✅ Supabase project set up
- ✅ React app deployed
- ✅ Admin user created
- ✅ Spare parts already exist in database

---

## 🚀 STEP 1: DEPLOY CODE (5 min)

### 1a. Pull Latest Code

```bash
git pull origin main
```

### 1b. Run Database Migrations ⚠️ IMPORTANT

**Copy ALL the SQL from:** `DATABASE-MIGRATION-FIXED.sql`

👉 **Go to:** Supabase dashboard → SQL Editor

👉 **Paste the entire content** from `DATABASE-MIGRATION-FIXED.sql` and run it

**Key points:**
- ✅ Tables created in correct order (machine_assemblies → machine_sub_assemblies → assembly_parts)
- ✅ All foreign key constraints work correctly
- ✅ Indexes added for performance
- ✅ RLS policies enabled

✅ **Done!** Tables created without errors

### 1c. Deploy App

```bash
npm run build
npm run deploy
```

✅ **Done!** Code deployed

---

## 🎮 STEP 2: CREATE SAMPLE MACHINE (5 min)

### 2a. Add to Existing Machine or Create New

**Option A: Use existing machine** (fastest)

1. Open your app → Machines section
2. Find a machine (e.g., "CNC Milling VMC-1060")
3. Note its UUID

**Option B: Create new machine**

```sql
INSERT INTO machines (name, machine_code, type, status)
VALUES (
  'CNC Milling Machine VMC-1060',
  'VMC-1060',
  'Vertical Machining Center',
  'Active'
) RETURNING id;
```

✅ **Note the machine UUID** (you'll need it next)

---

## 📊 STEP 3: POPULATE SAMPLE DATA (3 min)

### Option A: CSV IMPORT (Fastest & Easiest)

**3a. Create CSV file** (`sample-assembly.csv`):

```csv
Assembly,Sub-Assembly,Part Number,Part Name,Quantity,Notes
Main Spindle System,,MOTOR-15K-3PH,Main Drive Motor 15kW,1,Primary motor
Main Spindle System,Bearings,NSK-7010,High-Speed Spindle Bearing,2,Premium grade
Main Spindle System,Bearings,ZKL-6010,Ceramic Ball Bearing,2,Low friction
Main Spindle System,Cooling,PUMP-3HP-CEN,Cooling Pump Centrifugal,1,Main pump
Hydraulic System,,VALVE-HY-32,Hydraulic Pressure Valve,2,32cc relief
Motion Control System,Electronics,CTRL-ARM-STM32,CNC Control Board,1,Main controller
```

**3b. Import in App:**

1. Open Machines Catalogue
2. Select your machine
3. Click "Import Assemblies"
4. Upload CSV file
5. ✅ Wait for success message

---

## ✅ STEP 4: VERIFY IT WORKS (2 min)

### Test the Catalogue

1. Open your app
2. Click "Machines Catalogue" in sidebar
3. Select your machine
4. Explore 4 tabs:
   - ✅ Assemblies → See tree
   - ✅ BOM → See all parts
   - ✅ Diagram → See placeholder
   - ✅ Specs → See details
5. 🎉 It works!

---

## 🆘 TROUBLESHOOTING

### Error: "column sub_assembly_id does not exist"

✅ **Solution:** Use `DATABASE-MIGRATION-FIXED.sql` instead of the inline SQL

✅ The corrected version creates tables in proper order

### Other SQL errors

✅ Clear all old tables first:

```sql
DROP TABLE IF EXISTS assembly_parts CASCADE;
DROP TABLE IF EXISTS machine_sub_assemblies CASCADE;
DROP TABLE IF EXISTS machine_assemblies CASCADE;
```

Then run `DATABASE-MIGRATION-FIXED.sql`

---

## 🎊 YOU'RE LIVE!

**Status: ✅ PRODUCTION READY**

Deploy in 15 minutes! 🚀

---

## 📚 Documentation Files

- 📄 **DATABASE-MIGRATION-FIXED.sql** - Use this SQL (fixes constraint errors)
- 📄 **SAMPLE-DATA-GUIDE.md** - Complete sample data
- 📄 **WORLD-CLASS-CATALOGUE.md** - Feature overview
- 📄 **IMPROVEMENTS-IMPLEMENTATION.md** - Future enhancements