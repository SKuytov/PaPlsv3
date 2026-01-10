#!/bin/bash
set -e

echo "🔍 BUILD DIAGNOSTIC - Finding compilation errors"
echo ""

cd /tmp/PaPlsv3 || exit 1

# Clean
echo "🧹 Cleaning build cache..."
rm -rf node_modules dist .vite 2>/dev/null || true
rm package-lock.json 2>/dev/null || true
npm cache clean --force

# Install
echo "📥 Installing dependencies..."
npm install --legacy-peer-deps

echo ""
echo "🔨 Running build with FULL output..."
echo "================================"

# Build with full output to see errors
NODE_ENV=production npm run build 2>&1

echo ""
echo "================================"
echo "Build complete. Checking dist folder..."
echo ""

if [ -d "dist" ]; then
  echo "✅ dist folder exists"
  ls -lah dist/ | head -20
else
  echo "❌ dist folder NOT created - BUILD FAILED"
  echo ""
  echo "Common causes:"
  echo "1. Syntax errors in source files"
  echo "2. Missing dependencies"
  echo "3. Import path issues"
  echo "4. JSX/React compilation errors"
  exit 1
fi
