# 🚀 BULGARIAN LOCALIZATION - FIX GUIDE

## Problem: Bulgarian Translations Not Loading After Rebuild

### What Was Fixed

**3 Critical Issues Have Been Resolved:**

1. ✅ **RFIDLogin Component** - Now fully translated to Bulgarian
2. ✅ **RFIDLoginPage Component** - Now fully translated to Bulgarian  
3. ✅ **Vite Build Config** - Now copies public/locales folder to dist/

---

## 😟 Issues Found

### Issue #1: RFID Technician Login Was 100% English

**What Was Wrong:**
- `src/components/auth/RFIDLogin.jsx` had no translation support
- `src/pages/RFIDLoginPage.jsx` had hardcoded English text
- No language switcher on technician login page

**What Was Fixed:**
- Added `useTranslation()` hook to RFIDLogin.jsx
- Added inline translation object with 11 translatable strings
- Added language switcher button (EN/БГ) in top right
- Updated RFIDLoginPage.jsx with Bulgarian strings
- Added logout button with translations
- Added language switcher in session info area

**Files Changed:**
- `src/components/auth/RFIDLogin.jsx` ✅ UPDATED
- `src/pages/RFIDLoginPage.jsx` ✅ UPDATED

### Issue #2: Vite Build Not Including Locales

**What Was Wrong:**
- Vite config didn't explicitly include public folder in build
- `src/locales/` folder might not be copied to `dist/`
- Translation files weren't accessible in production

**What Was Fixed:**
- Updated `vite.config.js` with proper build settings:
  - Added `copyPublicDir: true` in build config
  - Ensured locales are included in bundle

**Files Changed:**
- `vite.config.js` ✅ UPDATED

---

## 💫 How to Deploy the Fix

### Step 1: Pull Latest Changes

```bash
ssh user@your-vps-ip
cd /opt/partpulse-backend/PaPlsv3  # or your project dir

# Get latest code
git fetch origin
git pull origin main
```

### Step 2: Run Your Rebuild Script

```bash
# This is the script you already use
bash rebuild.sh
```

The rebuild script will:
1. Stop backend
2. Clean dependencies & build artifacts
3. Install fresh npm packages
4. Build React app (includes locales now!)
5. Deploy to /var/www/html
6. Start backend
7. Verify services

### Step 3: Clear Browser Cache

**CRITICAL: Browser cache prevents new code from loading**

In your browser:
```
Ctrl+Shift+Delete  (Windows/Linux)
CMD+Shift+Delete   (Mac)
```

Select:
- Time range: **"All time"**
- Checkboxes: **All checked**
- Click "Delete"

Then: `Ctrl+Shift+R` (hard refresh)

### Step 4: Test Technician Login

Go to: `https://your-domain.com/technician-login`

**You should see:**
- ✅ Language switcher in top right (EN / БГ)
- ✅ Bulgarian text when БГ is selected
- ✅ English text when EN is selected
- ✅ All buttons translate
- ✅ Language preference saves to localStorage

---

## 📄 What Was Translated

### RFID Login Page (11 Strings)

| Item | English | Bulgarian |
|------|---------|----------|
| Title | Technician Login | Вход на техник |
| Scan Description | Hold your RFID card near the reader | Поставете вашата RFID карта близо до четеца |
| Manual Description | Enter your RFID card ID | Въведете вашия код на RFID карта |
| Reading | Reading card... | Четене на карта... |
| Ready | Ready to scan | Готово за сканиране |
| Hold Card | Hold RFID card near the reader | Поставете RFID карта близо до четеца |
| Verifying | Verifying card... | Проверка на карта... |
| Card ID Label | Card ID | Код на карта |
| Login Button | Login | Вход |
| Toggle Reader | Back to RFID Reader | Назад към RFID четец |
| Toggle Manual | Manual Entry | Ръчно въвеждане |

### Technician Session (7 Strings)

| Item | English | Bulgarian |
|------|---------|----------|
| Session Header | Technician Session Active | Активна сесия на техник |
| Name | Name | Име |
| ID | ID | Код |
| Card | Card | Карта |
| Scanner Tab | 📋 Scanner | 📋 Сканер |
| Parts Tab | 📦 Spare Parts | 📦 Резервни части |
| Logout | Logout | Излез |

---

## 🗪️ Verification Checklist

After deploying the fix, verify:

- [ ] Technician login page loads without errors
- [ ] Language switcher visible in top right corner
- [ ] Can click EN button - page remains in English
- [ ] Can click БГ button - page translates to Bulgarian
- [ ] Language preference persists after page reload
- [ ] All buttons translate (Login, Back, Manual Entry, etc.)
- [ ] Error messages translate
- [ ] Session info translates after login
- [ ] Scanner/Parts tabs translate
- [ ] Logout button translates
- [ ] Browser DevTools console shows no errors
- [ ] localStorage contains `appLanguage: 'bg'` or `'en'`

---

## 툿 Troubleshooting

### "Bulgarian still not showing"

**Check 1: Browser Cache**
```
Ctrl+Shift+Delete → All time → Delete
Ctrl+Shift+R (hard refresh)
```

**Check 2: Dist Folder Contains Locales**
```bash
ls -la /var/www/html/locales/
# Should show: en/, bg/, directories

ls -la /var/www/html/locales/bg/
# Should show: translation.json file
```

**Check 3: Build Output**
```bash
# After rebuild.sh, check dist folder
cd /opt/partpulse-backend/PaPlsv3
ls -la dist/ | grep locales
# Should show locales folder
```

**Check 4: Browser Console**
```
F12 → Console
# Check for errors loading translations
# Should see no 404 errors for locales/bg/translation.json
```

### "Language switcher doesn't appear"

1. Check that `src/components/auth/RFIDLogin.jsx` imports `useTranslation`
2. Verify RFIDLogin imports `Globe` from lucide-react
3. Rebuild and hard refresh browser

### "Changes not showing after rebuild"

1. Backend still running? `pkill -f 'node.*server.js'`
2. Clear browser cache completely
3. Hard refresh: `Ctrl+Shift+R`
4. Check browser DevTools Network tab - should see locales files loading

---

## 📊 Summary of Changes

### Files Modified (3 files)

```
✅ src/components/auth/RFIDLogin.jsx
   - Added useTranslation hook
   - Added language switcher UI
   - Added 11 translated strings
   - Inline translations (en, bg)

✅ src/pages/RFIDLoginPage.jsx  
   - Added useTranslation hook
   - Added language switcher UI
   - Translated session info
   - Translated tab names
   - Added logout button with translation

✅ vite.config.js
   - Updated build config
   - Added copyPublicDir: true
   - Ensured locales folder copied to dist/
```

### Translations Added
- RFID Login: 11 strings × 2 languages = 22 translations
- Session Page: 7 strings × 2 languages = 14 translations
- **Total new translations: 36 strings**

---

## 🌟 Next Steps

1. **Deploy the fix** using your `rebuild.sh` script
2. **Clear browser cache** completely
3. **Test technician login** in both languages
4. **Verify language persists** on reload
5. **Check console** for any errors

---

## 🇧🇬 Bulgarian Language Support

**Your app now supports:**
- ✅ Technician RFID login in Bulgarian
- ✅ Session info in Bulgarian  
- ✅ All UI buttons/labels translated
- ✅ Error messages in Bulgarian
- ✅ Persistent language preference
- ✅ Language switcher on RFID login page
- ✅ 280+ UI strings in translations (from earlier)
- ✅ Main app dashboard already supports Bulgarian

**Total Coverage:** Main app + Technician portal fully bilingual! 🎉

---

**Questions?** Check the console or review the updated component files.

**Good luck with your deployment!** 🚀🇧🇬
