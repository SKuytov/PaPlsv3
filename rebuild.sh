#!/bin/bash
set -e

echo "🔥 NUCLEAR REBUILD v2 - Complete cache clearing and rebuild"
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

# Checkout feature branch
echo "🌿 Checking out feature/multi-user-roles-extended-technician..."
git fetch origin feature/multi-user-roles-extended-technician:feature/multi-user-roles-extended-technician || echo "⚠️  Could not fetch feature branch"
git checkout feature/multi-user-roles-extended-technician || echo "⚠️  Could not checkout feature branch"
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

# Lint check
echo ""
echo "🔍 Running syntax check..."
if npm run lint 2>&1 | head -50; then
  echo "✅ Lint passed"
else
  echo "⚠️  Lint issues found (check above)"
fi

# Build with full output
echo ""
echo "🏗️  Building with Vite..."
echo "="*50

if NODE_ENV=production npm run build; then
  echo "="*50
  echo "✅ Build successful"
else
  echo "="*50
  echo "❌ BUILD FAILED - See errors above"
  exit 1
fi

echo ""

# Check build output
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
  echo "✅ Build files created:"
  ls -lah dist/ | head -15
  echo ""
  echo "📊 Total build size: $(du -sh dist/ | cut -f1)"
else
  echo "❌ dist folder is empty or missing - BUILD FAILED"
  exit 1
fi

echo ""

# Deploy
echo "🚀 Deploying to production..."
sudo rm -rf /var/www/html/* || true
sudo mkdir -p /var/www/html

if sudo cp -r dist/* /var/www/html/; then
  echo "✅ Files copied successfully"
else
  echo "❌ ERROR: Failed to copy files!"
  exit 1
fi

sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Verify deployment
echo ""
echo "📂 Deployed files:"
sudo ls -lah /var/www/html/ | head -15

echo ""
echo "✅ Key files check:"
sudo test -f /var/www/html/index.html && echo "  ✓ index.html" || echo "  ✗ index.html MISSING"
sudo test -f /var/www/html/vite.svg && echo "  ✓ vite.svg" || echo "  ✗ vite.svg MISSING"

# Clear web server cache
echo ""
echo "🧹 Clearing web server cache..."
if sudo systemctl reload nginx; then
  echo "✅ Nginx reloaded"
elif sudo service nginx reload; then
  echo "✅ Nginx reloaded"
else
  echo "⚠️  Nginx not found"
fi

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "📋 Next steps:"
echo "1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "2. Test in browser: http://localhost"
echo "3. Open DevTools → Application → Clear all site data"
echo ""
echo "⚡ Diagnostics:"
echo "   curl http://localhost/index.html | head -20"
echo "   sudo tail -20 /var/log/nginx/error.log"
echo ""
