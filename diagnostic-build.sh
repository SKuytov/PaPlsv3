#!/bin/bash

# DIAGNOSTIC BUILD SCRIPT - Full Error Capture
# Purpose: Build and capture COMPLETE error output (not truncated)

echo "════════════════════════════════════════════════════════════"
echo "🔍 DIAGNOSTIC BUILD - Full Error Capture"
echo "════════════════════════════════════════════════════════════"

cd /opt/partpulse-backend/PaPlsv3

echo "\n📁 Repository Status:"
git log --oneline -5

echo "\n🧹 Cleaning build artifacts..."
rm -rf node_modules package-lock.json dist build

echo "\n📦 Installing dependencies..."
npm install --legacy-peer-deps 2>&1 | tail -20

echo "\n"
echo "════════════════════════════════════════════════════════════"
echo "🔨 Building React App - FULL OUTPUT"
echo "════════════════════════════════════════════════════════════"
echo ""

# Run vite build and capture EVERYTHING (not truncated)
npm run build > /tmp/build-output.log 2>&1
BUILD_EXIT=$?

# Show full output
echo "Full build output:"
cat /tmp/build-output.log

echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 Build Result: EXIT CODE = $BUILD_EXIT"
echo "════════════════════════════════════════════════════════════"

if [ $BUILD_EXIT -eq 0 ]; then
  echo "✅ BUILD SUCCESSFUL!"
  echo "\n📂 dist/ folder contents:"
  ls -lah dist/ 2>/dev/null || echo "dist/ folder not found!"
else
  echo "❌ BUILD FAILED!"
  echo "\n🔴 Error Summary:"
  grep -i "error" /tmp/build-output.log | head -20
  echo ""
  echo "💾 Full log saved to: /tmp/build-output.log"
  echo "View with: cat /tmp/build-output.log"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
