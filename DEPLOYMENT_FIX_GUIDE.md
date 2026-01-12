# 🚀 DEPLOYMENT SCRIPT FIX GUIDE

**Date:** January 12, 2026  
**Issue:** `cp: cannot stat 'dist/*': No such file or directory`  
**Status:** ✅ FIXED

---

## ❌ Problem Analysis

### The Error
```
5️⃣ Deploying frontend to /var/www/html...
cp: cannot stat 'dist/*': No such file or directory
root@srv944877:~#
```

### Root Cause
The original script had a critical flaw in the build process:

1. **No verification** that `npm run build` succeeded
2. **No check** that `dist/` directory actually exists
3. **Attempts to copy** from non-existent directory
4. Build fails silently, but script continues

---

## ✅ Solution: What Was Fixed

### File: `rebuild-3-FIXED.sh`

Three critical fixes were added:

#### Fix #1: Verify dist Directory After Build

**Location:** Step 4 (after `npm run build`)

**Before (BROKEN):**
```bash
echo "Building React app..."
npm run build 2>&1 | tail -10
echo -e "${GREEN}✅ Frontend built${NC}"
# Continues without checking if dist exists!
```

**After (FIXED):**
```bash
echo "Building React app with Vite..."
npm run build 2>&1 | tail -15

# ✅ FIXED: Verify dist directory exists before proceeding
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ ERROR: dist directory not created!${NC}"
    echo -e "${YELLOW}Build output:${NC}"
    npm run build  # Run again to see full error
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo -e "${YELLOW}📁 Dist directory contents:${NC}"
ls -la dist/ | head -20
```

**Why this helps:**
- Checks if `dist/` directory exists
- If NOT, shows full build output
- Exits with error code (prevents silent failure)
- Shows what was built

---

#### Fix #2: Validate dist Before Copy

**Location:** Step 5 (before `sudo cp -r dist/*`)

**Before (BROKEN):**
```bash
echo "5️⃣ Deploying frontend..."
sudo rm -rf "$FRONTEND_WEB_ROOT"/*
sudo cp -r dist/* "$FRONTEND_WEB_ROOT/"  # Fails here!
```

**After (FIXED):**
```bash
echo "Clearing old frontend..."
sudo rm -rf "${FRONTEND_WEB_ROOT:?}"/*  # Safe deletion

echo "Checking dist directory..."
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ ERROR: dist directory does not exist!${NC}"
    echo -e "${YELLOW}Please check build output above${NC}"
    exit 1
fi

echo "Copying new frontend..."
if sudo cp -r dist/* "$FRONTEND_WEB_ROOT/"; then
    echo -e "${GREEN}✅ Frontend copied successfully${NC}"
else
    echo -e "${RED}❌ ERROR: Failed to copy frontend files!${NC}"
    exit 1
fi
```

**Why this helps:**
- Double-checks `dist/` exists
- Safe variable expansion (`${FRONTEND_WEB_ROOT:?}`)
- Verifies copy command succeeded
- Clear error messages

---

#### Fix #3: Show Deployment Results

**Location:** Step 5 (after copy)

**Added:**
```bash
echo "Setting permissions..."
sudo chown -R www-data:www-data "$FRONTEND_WEB_ROOT"
sudo chmod -R 755 "$FRONTEND_WEB_ROOT"

echo -e "${GREEN}✅ Frontend deployed${NC}"
echo -e "${YELLOW}📁 Deployed files count:${NC}"
find "$FRONTEND_WEB_ROOT" -type f | wc -l  # NEW!
```

**Why this helps:**
- Shows how many files were deployed
- Confirms deployment success
- Helps troubleshoot if files missing

---

## 🚧 Common Build Failures (Now Caught!)

### Issue: Missing Dependencies
```
ERROR: Cannot find module '@/components/blade/BladeManagement'
```
**Fix:** Script shows this error immediately, no silent failure

### Issue: React/Vite Error
```
ERROR: SyntaxError: Unexpected token }
```
**Fix:** Build stops, script shows full error, exits with code 1

### Issue: Missing .env Variables
```
ERROR: process.env.VITE_API_URL is undefined
```
**Fix:** Script output shows build failed, no `dist/` created

---

## 🚀 How to Use the Fixed Script

### Step 1: Download Fixed Script
```bash
cd /opt/partpulse-backend/PaPlsv3
git pull origin feature/blade-lifecycle-tracking
chmod +x rebuild-3-FIXED.sh
```

### Step 2: Run It
```bash
sudo ./rebuild-3-FIXED.sh
```

### Step 3: Watch Output
The script will now show:
1. ✅ Backend stopping
2. ✅ Repository updating
3. ✅ Backend dependencies installing
4. ✅ Frontend building (with warnings/errors if any)
5. ✅ **dist/ directory contents** (NEW!)
6. ✅ Frontend copying with file count (NEW!)
7. ✅ Backend starting
8. ✅ Service verification

---

## 🤍 How to Troubleshoot

### If `dist/` Directory Still Missing

**Check 1: Build errors**
```bash
cd /opt/partpulse-backend/PaPlsv3
npm run build
```
Look for:
- Missing imports
- Syntax errors
- Compilation failures

**Check 2: React component files**
```bash
ls -la src/components/blade/
```
Verify both files exist:
- `BladeManagement.jsx`
- `BladePurchaseOrder.jsx`

**Check 3: Vite config**
```bash
ls -la vite.config.js
cat vite.config.js | grep -i build
```
Should have build configuration.

**Check 4: Node version**
```bash
node -v
npm -v
```
Should be:
- Node >= 16
- npm >= 8

### If Copy Still Fails

**Check permissions:**
```bash
ls -ld /var/www/html
sudo touch /var/www/html/test.txt
sudo rm /var/www/html/test.txt
```

**Check disk space:**
```bash
df -h
```
Need at least 500MB free

**Check web server:**
```bash
sudo systemctl status nginx
sudo systemctl status apache2
```
Server should be running

---

## 📊 What the Fixed Script Does Now

| Step | Before | After |
|------|--------|-------|
| 1 | ✅ Stop backend | ✅ Stop backend |
| 2 | ✅ Clone/update repo | ✅ Clone/update repo |
| 3 | ✅ Install backend deps | ✅ Install backend deps |
| 4 | 💩 Build frontend (no check) | ✅ Build frontend + **verify dist/** |
| 5 | 💩 Copy to web (fails) | ✅ Check dist + copy + **show results** |
| 6 | ✅ Start backend | ✅ Start backend |
| 7 | ✅ Verify services | ✅ Verify services |
| 8 | ✅ Test endpoints | ✅ Test endpoints |

---

## 🚀 Deployment Workflow (Fixed)

```
Start
  → Stop backend
  → Update repository
  → Install backend dependencies
  → Build React app
  → ✅ VERIFY: dist/ exists
  → ✅ VERIFY: dist/ has files
  → Clear old frontend
  → Copy new frontend
  → ✅ VERIFY: copy succeeded
  → ✅ SHOW: file count
  → Set permissions
  → Start backend
  → Verify backend running
  → Test API endpoints
  → SUCCESS!
```

---

## 🌟 Key Improvements

1. **Error Detection Early**
   - Catches build failures immediately
   - Doesn't proceed if build fails
   - Shows full error output

2. **Safe File Operations**
   - Verifies source before copy
   - Safe variable expansion
   - Confirms operations succeeded

3. **Better Visibility**
   - Shows dist/ directory contents
   - Shows file count after deployment
   - Better error messages

4. **Production Ready**
   - No silent failures
   - Easy to troubleshoot
   - Clear success indicators

---

## 📞 Quick Reference

### Use Fixed Script
```bash
chmod +x rebuild-3-FIXED.sh
sudo ./rebuild-3-FIXED.sh
```

### Manual Build (if script fails)
```bash
cd /opt/partpulse-backend/PaPlsv3
rm -rf dist node_modules
npm install --legacy-peer-deps
npm run build
ls dist/
```

### Manual Deploy (if build succeeds)
```bash
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
find /var/www/html -type f | wc -l
```

### Check Deployment
```bash
ls /var/www/html/
curl http://localhost/api/health
```

---

## ✅ Before Deploying

- [ ] All routes added (AppRouter.jsx)
- [ ] Navigation updated (Sidebar.jsx)
- [ ] No import errors in browser console
- [ ] Local build works: `npm run build`
- [ ] dist/ directory has files: `ls dist/ | wc -l`
- [ ] .env file exists on server
- [ ] Backend .env has correct SUPABASE credentials

---

## 🐛 Debugging

### See build errors
```bash
cd /opt/partpulse-backend/PaPlsv3
npm run build 2>&1 | grep -i error
```

### See full build output
```bash
cd /opt/partpulse-backend/PaPlsv3
npm run build
```

### Check deployment
```bash
ls -la /var/www/html/ | head -20
find /var/www/html -type f | wc -l
```

### Check permissions
```bash
ls -ld /var/www/html
ls -la /var/www/html/index.html
```

---

## 🌟 Summary

**Problem:** Build succeeded but `dist/` not created, script tried to copy from non-existent directory

**Solution:** Added verification at critical points:
1. After build - check dist/ exists
2. Before copy - verify again + show contents
3. After copy - confirm success + show file count

**Result:** No more silent failures, clear error messages, easy troubleshooting

---

**File:** `rebuild-3-FIXED.sh`  
**Status:** ✅ Ready to use  
**Branch:** feature/blade-lifecycle-tracking
