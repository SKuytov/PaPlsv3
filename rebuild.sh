#!/bin/bash
set -e

echo "🔥 HARD REBUILD - Clearing all caches"

cd /tmp
rm -rf PaPlsv3 2>/dev/null || true

echo "📦 Cloning fresh repository..."
git clone https://github.com/SKuytov/PaPlsv3.git
cd PaPlsv3

echo "🧹 Cleaning cache..."
rm -rf node_modules 2>/dev/null || true
rm -rf .next 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm package-lock.json 2>/dev/null || true
rm -rf .cache 2>/dev/null || true

echo "📥 Installing dependencies..."
npm install --no-cache --legacy-peer-deps

echo "🏗️  Building..."
npm run build

echo "🚀 Deploying..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

echo "✅ HARD REBUILD COMPLETE!"
echo ""
echo "Next: Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "Then test the app"
