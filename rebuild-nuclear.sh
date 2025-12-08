#!/bin/bash
set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🔥 NUCLEAR REBUILD - TOTAL SYSTEM RESET                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# STEP 1: Kill all processes
echo "[1/12] 🛑 Killing all Node/Vite processes..."
sudo pkill -9 -f 'node' || true
sudo pkill -9 -f 'vite' || true
sudo pkill -9 -f 'npm' || true
echo "✅ Done"
echo ""

# STEP 2: Remove server files
echo "[2/12] 🗑️  Removing old deployment..."
sudo rm -rf /var/www/html/* || true
sudo rm -rf /var/www/html/.* || true
echo "✅ Done"
echo ""

# STEP 3: Clean temp directory
echo "[3/12] 🧹 Cleaning /tmp..."
rm -rf /tmp/PaPlsv3 || true
rm -rf /tmp/rebuild* || true
echo "✅ Done"
echo ""

# STEP 4: Clone fresh
echo "[4/12] 📥 Cloning repository..."
cd /tmp
git clone --depth 1 https://github.com/SKuytov/PaPlsv3.git 2>&1 | tail -5
cd /tmp/PaPlsv3
echo ""
echo "📋 Current commit:"
git log --oneline -1
echo ""

# STEP 5: Verify source file has new code
echo "[5/12] ✔️  Verifying source code has new quote ID logic..."
if grep -q "quoteCounter = 1000" src/components/modules/quotes/ManualQuoteRequestModal.jsx; then
    echo "✅ Source file HAS the new quote counter code!"
else
    echo "❌ ERROR: Source file DOES NOT have new quote counter code!"
    echo "Commit may not be on main branch!"
    exit 1
fi
echo ""

# STEP 6: Clean everything
echo "[6/12] 🧹 Deep cleaning node_modules and cache..."
rm -rf node_modules .next dist build out .cache .vite coverage 2>/dev/null || true
rm -f package-lock.json yarn.lock 2>/dev/null || true
echo "✅ Done"
echo ""

# STEP 7: Clear npm cache
echo "[7/12] 🗑️  Clearing npm global cache..."
npm cache clean --force 2>&1 | tail -3
echo "✅ Done"
echo ""

# STEP 8: Install dependencies
echo "[8/12] 📦 Installing fresh dependencies..."
npm install --no-cache --legacy-peer-deps 2>&1 | grep -E "added|up to date" | tail -1
echo "✅ Done"
echo ""

# STEP 9: Build
echo "[9/12] 🏗️  Building with Vite..."
NODE_ENV=production npm run build 2>&1 | tail -20
echo ""

# STEP 10: Verify build
echo "[10/12] ✔️  Verifying build output..."
if [ ! -d "dist" ]; then
    echo "❌ ERROR: Build failed - dist directory not found!"
    exit 1
fi
echo "✅ Build successful"
echo ""

echo "📂 Build files:"
ls -lh dist/ | head -15
echo ""

# STEP 11: Deploy
echo "[11/12] 🚀 Deploying to /var/www/html..."
sudo rm -rf /var/www/html/* || true
sudo mkdir -p /var/www/html
sudo cp -r dist/* /var/www/html/ || {
    echo "❌ ERROR: Failed to copy files!"
    exit 1
}
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
echo "✅ Deployed"
echo ""

# STEP 12: Verify deployment and reload nginx
echo "[12/12] ✔️  Finalizing..."
echo "📂 Deployed files:"
sudo ls -lh /var/www/html/ | head -20
echo ""

# Clear web server cache and reload
echo "Reloading nginx..."
sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || echo "⚠️  Could not reload nginx"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ NUCLEAR REBUILD COMPLETE!                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔍 NEXT STEPS:"
echo "  1. HARD REFRESH browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "  2. Open DevTools (F12) → Application → Clear All Site Data"
echo "  3. Close browser completely and reopen"
echo "  4. Go to Quotes Dashboard"
echo "  5. Click 'Create Quote Request'"
echo "  6. Verify Quote ID shows: QR-25-01001 (NOT QR-MIWX3M7L...)"
echo ""
echo "📝 TEST VERIFICATION:"
echo "   Expected: QR-25-01001, QR-25-01002, etc."
echo "   NOT: QR-MIWX3M7L-41D7FA or other hash format"
echo ""
echo "⚠️  If STILL not working:"
echo "   $ curl http://localhost/index.html 2>/dev/null | grep -o 'quoteCounter' | head -1"
echo "   (should find 'quoteCounter')"
echo ""
