#!/bin/bash
set -e

echo "🔍 BLADE TRACKING BUILD DIAGNOSTIC"
echo "================================="
echo ""

echo "📍 Project location:"
echo "Working dir: $(pwd)"
echo ""

echo "📋 Git status:"
git log --oneline -1
git branch -vv
echo ""

echo "📦 Checking Node and npm versions:"
node --version
npm --version
echo ""

echo "🧹 Cleaning old build artifacts..."
rm -rf dist/ .vite/ .next/ 2>/dev/null || true
echo "✓ Cleaned"
echo ""

echo "🔍 Checking for syntax errors in new files:"
echo "Checking BladeTracking.jsx..."
if node -c "src/pages/BladeTracking.jsx" 2>&1; then
  echo "  ✓ BladeTracking.jsx is syntactically valid"
else
  echo "  ✗ ERROR in BladeTracking.jsx"
  node -c "src/pages/BladeTracking.jsx"
fi
echo ""

echo "Checking AppRouter.jsx..."
if node -c "src/components/AppRouter.jsx" 2>&1; then
  echo "  ✓ AppRouter.jsx is syntactically valid"
else
  echo "  ✗ ERROR in AppRouter.jsx"
  node -c "src/components/AppRouter.jsx"
fi
echo ""

echo "Checking Sidebar.jsx..."
if node -c "src/components/layout/Sidebar.jsx" 2>&1; then
  echo "  ✓ Sidebar.jsx is syntactically valid"
else
  echo "  ✗ ERROR in Sidebar.jsx"
  node -c "src/components/layout/Sidebar.jsx"
fi
echo ""

echo "📦 Installing dependencies (if needed)..."
if [ ! -d "node_modules" ]; then
  echo "Installing npm packages..."
  npm install --legacy-peer-deps || echo "⚠️  npm install had issues"
else
  echo "✓ node_modules already exists"
fi
echo ""

echo "🏗️  RUNNING BUILD - THIS IS THE KEY OUTPUT:"
echo "========================================="
echo ""

# Run build with full output
NODE_ENV=production npm run build 2>&1 | tee build-output.log

echo ""
echo "========================================="
echo ""

if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
  echo "✅ BUILD SUCCESSFUL!"
  echo ""
  echo "📂 Build output:"
  ls -lah dist/
  echo ""
  echo "📊 Build size: $(du -sh dist/ | cut -f1)"
  echo ""
  echo "📁 File count in dist/:"
  find dist -type f | wc -l
  echo ""
else
  echo "❌ BUILD FAILED - dist/ is empty or missing"
  echo ""
  echo "📋 Last 50 lines of build output:"
  tail -50 build-output.log
  exit 1
fi

echo ""
echo "✅ Diagnostic complete! See build-output.log for full details."
