#!/bin/bash

echo "════════════════════════════════════════════════════════════"
echo "🔍 DIAGNOSING BUILD ISSUE"
echo "════════════════════════════════════════════════════════════"
echo ""

cd /opt/partpulse-backend/PaPlsv3

echo "1️⃣ Checking Node and npm versions:"
node --version
npm --version
echo ""

echo "2️⃣ Checking if vite is installed:"
ls -la node_modules/.bin/vite 2>/dev/null || echo "❌ vite NOT FOUND"
echo ""

echo "3️⃣ Checking package.json build script:"
grep '"build"' package.json
echo ""

echo "4️⃣ Running npm run build with verbose output:"
echo "Running: npm run build -- --debug"
npm run build 2>&1
echo ""
echo "Exit code: $?"
echo ""

echo "5️⃣ Checking if dist folder exists:"
ls -la dist 2>/dev/null || echo "❌ dist folder DOES NOT EXIST"
echo ""

echo "6️⃣ Trying vite build directly:"
echo "Running: npx vite build"
npx vite build 2>&1
echo ""
echo "Exit code: $?"
echo ""

echo "7️⃣ Checking node_modules size:"
du -sh node_modules
echo ""

echo "8️⃣ Checking available disk space:"
df -h /
echo ""

echo "9️⃣ Checking memory:"
free -h
echo ""

echo "Done!"
