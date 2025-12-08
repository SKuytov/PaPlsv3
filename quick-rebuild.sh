#!/bin/bash
set -e

echo "🚀 QUICK REBUILD"
echo ""

# Kill processes
echo "Stopping processes..."
pkill -9 -f node || true
pkill -9 -f npm || true
sleep 2

# Clean
echo "Cleaning..."
cd /tmp
rm -rf PaPlsv3

# Clone
echo "Cloning..."
git clone --depth 1 https://github.com/SKuytov/PaPlsv3.git
cd PaPlsv3
echo "Commit: $(git log --oneline -1)"

# Verify source
echo "Checking source file..."
if grep -q "let quoteCounter = 1000" src/components/modules/quotes/ManualQuoteRequestModal.jsx; then
    echo "✅ Source has quoteCounter"
else
    echo "❌ ERROR: Source missing quoteCounter"
    exit 1
fi

# Clean build dirs
echo "Removing old builds..."
rm -rf node_modules dist .vite build out 2>/dev/null || true

# Install
echo "Installing dependencies..."
npm install --no-cache --legacy-peer-deps > /dev/null 2>&1
echo "✅ Dependencies installed"

# Build
echo "Building..."
NODE_ENV=production npm run build
echo "✅ Build complete"

# Deploy
echo "Deploying to production..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
echo "✅ Deployed"

# Verify
echo ""
echo "Checking compiled output..."
if grep -r "quoteCounter\|QR-" /var/www/html/assets/*.js 2>/dev/null | head -1; then
    echo "✅ Code is in compiled output"
else
    echo "⚠️  Code not found in output (might be minified)"
fi

echo ""
echo "🎉 REBUILD COMPLETE!"
echo ""
echo "Next:"
echo "1. Hard refresh: Ctrl+Shift+R"
echo "2. Clear DevTools cache"
echo "3. Test Quote modal"
echo ""
