#!/bin/bash
set -e

echo "🔥 NUCLEAR REBUILD - Complete cache clearing and rebuild"
echo ""

# Kill any running processes
echo "🛑 Stopping any running processes..."
sudo pkill -f 'vite' || true
sudo pkill -f 'node' || true
sleep 2

# Clean server files
echo "🧹 Clearing server files..."
sudo rm -rf /var/www/html/* 2>/dev/null || true
sudo rm -rf /tmp/PaPlsv3 2>/dev/null || true

# Clone fresh
echo "📦 Cloning fresh repository..."
cd /tmp
git clone --depth 1 https://github.com/SKuytov/PaPlsv3.git
cd PaPlsv3

echo "📋 Current commit:"
git log --oneline -1
echo ""

# Clean everything
echo "🧹 Cleaning all build artifacts and cache..."
rm -rf node_modules 2>/dev/null || true
rm -rf .next 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm -rf out 2>/dev/null || true
rm package-lock.json 2>/dev/null || true
rm yarn.lock 2>/dev/null || true
rm -rf .cache 2>/dev/null || true
rm -rf .vite 2>/dev/null || true

# Clear npm cache globally
echo "🗑️  Clearing npm global cache..."
npm cache clean --force

# Install fresh
echo "📥 Installing dependencies (fresh)..."
npm install --no-cache --legacy-peer-deps 2>&1 | tail -20

# Build
echo ""
echo "🏗️  Building with Vite..."
NODE_ENV=production npm run build 2>&1 | tail -30

# Check build output
echo ""
echo "✅ Build files:"
ls -lah dist/ 2>/dev/null || echo "No dist folder found!"
echo ""

# Deploy
echo "🚀 Deploying to production..."
sudo rm -rf /var/www/html/* || true
sudo mkdir -p /var/www/html
sudo cp -r dist/* /var/www/html/ || echo "ERROR: Failed to copy files!"
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Verify deployment
echo ""
echo "📂 Deployed files:"
sudo ls -lah /var/www/html/ | head -20

# Clear web server cache
echo ""
echo "🧹 Clearing web server cache..."
sudo systemctl reload nginx || sudo service nginx reload || echo "No nginx found, trying other servers..."

echo ""
echo "============================================"
echo "✅ NUCLEAR REBUILD COMPLETE!"
echo "============================================"
echo ""
echo "📋 Next steps:"
echo "1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "2. Check developer tools → Network tab → disable cache"
echo "3. Open DevTools → Application → Clear all site data"
echo "4. Test the Quote modal - should see QR-25-XXXXX format"
echo ""
echo "If still not working:"
echo "   Check: curl http://localhost/index.html | grep 'quoteCounter'"
echo "   Check logs: sudo tail -f /var/log/nginx/error.log"
echo ""
