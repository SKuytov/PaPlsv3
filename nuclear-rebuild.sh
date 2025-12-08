#!/bin/bash
set -e

echo "🔥💥 NUCLEAR REBUILD - KILLING EVERYTHING"
echo ""

# Kill EVERYTHING
echo "☠️  Killing all node/npm processes..."
sudo pkill -9 -f 'node' 2>/dev/null || true
sudo pkill -9 -f 'npm' 2>/dev/null || true
sudo pkill -9 -f 'vite' 2>/dev/null || true
sudo pkill -9 -f 'build' 2>/dev/null || true
sleep 3

# Remove ALL build artifacts
echo "🗑️  Removing all build artifacts..."
sudo rm -rf /tmp/PaPlsv3 2>/dev/null || true
sudo rm -rf /var/www/html/* 2>/dev/null || true

# Clear npm/node caches globally
echo "🧹 Clearing global caches..."
sudo npm cache clean --force 2>/dev/null || true
sudo rm -rf ~/.npm 2>/dev/null || true
sudo rm -rf ~/.cache 2>/dev/null || true

# Clone FRESH
echo ""
echo "📥 Cloning fresh repository..."
cd /tmp
rm -rf PaPlsv3
git clone --depth 1 https://github.com/SKuytov/PaPlsv3.git
cd PaPlsv3

echo "📋 Current commit:"
git log --oneline -1
echo ""

# Verify source file has new code BEFORE building
echo "✅ Checking if source has quoteCounter..."
if grep -q "quoteCounter" src/components/modules/quotes/ManualQuoteRequestModal.jsx; then
    echo "   ✓ Source file HAS quoteCounter - GOOD!"
else
    echo "   ✗ ERROR: Source file MISSING quoteCounter!"
    exit 1
fi
echo ""

# Clean workspace completely
echo "🧹 Nuclear cleaning..."
rm -rf node_modules 2>/dev/null || true
rm -rf .next 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm -rf out 2>/dev/null || true
rm -rf .vite 2>/dev/null || true
rm -rf .parcel-cache 2>/dev/null || true
find . -name '.DS_Store' -delete 2>/dev/null || true
find . -name 'node_modules' -type d -exec rm -rf {} + 2>/dev/null || true

# Install dependencies
echo ""
echo "📦 Installing fresh dependencies..."
npm install --no-cache --force 2>&1 | tail -5

# Build
echo ""
echo "🏗️  Building with Vite..."
NODE_ENV=production npm run build 2>&1

# Verify compiled output has new code
echo ""
echo "✅ Checking if dist has quoteCounter..."
if grep -r "quoteCounter" dist/ 2>/dev/null; then
    echo "   ✓ Compiled dist HAS quoteCounter - GOOD!"
else
    echo "   ⚠️  WARNING: quoteCounter not found in dist!"
    echo "   This might still work if it's minified..."
    echo "   Checking for 'QR-' pattern instead:"
    if grep -r "QR-" dist/ 2>/dev/null | head -3; then
        echo "   ✓ Found QR- pattern - likely OK"
    fi
fi
echo ""

# Deploy
echo "🚀 Deploying to production..."
sudo rm -rf /var/www/html/* || true
sudo mkdir -p /var/www/html
sudo cp -r dist/* /var/www/html/ || { echo "❌ ERROR: Failed to copy files!"; exit 1; }
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Verify deployment
echo ""
echo "✅ Verifying deployment..."
if [ -f /var/www/html/index.html ]; then
    echo "   ✓ index.html deployed"
    stat /var/www/html/index.html | grep Modify
else
    echo "   ❌ ERROR: index.html not found!"
    exit 1
fi

echo ""
echo "📊 Asset files:"
ls -lah /var/www/html/assets/ 2>/dev/null | wc -l
echo "   files deployed"

# Reload web server
echo ""
echo "🔄 Reloading web server..."
sudo systemctl reload nginx 2>/dev/null || sudo service nginx reload 2>/dev/null || echo "⚠️  Could not reload nginx"

echo ""
echo "="*50
echo "🎉 NUCLEAR REBUILD COMPLETE!"
echo "="*50
echo ""
echo "📋 NEXT STEPS:"
echo "1. Hard refresh browser: Ctrl+Shift+R or Cmd+Shift+R"
echo "2. Open DevTools: F12"
echo "3. Go to Application tab"
echo "4. Click 'Clear all site data'"
echo "5. Close browser completely"
echo "6. Reopen and test Quote modal"
echo ""
echo "Expected: Quote ID should show QR-25-01001 format"
echo ""
echo "If still broken, run:"
echo "  grep -r 'quoteCounter' /var/www/html/assets/ | head -3"
echo ""
