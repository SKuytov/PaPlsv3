#!/bin/bash

set -e

echo "════════════════════════════════════════════════════════════"
echo "🚀 COMPLETE REBUILD - Frontend & Backend + RFID Fix"
echo "════════════════════════════════════════════════════════════"
echo ""

# Configuration
BACKEND_DIR="/opt/partpulse-backend"
FRONTEND_WEB_ROOT="/var/www/html"
LOG_FILE="/var/log/backend.log"
BRANCH="feature/blade-lifecycle-tracking" # ✅ FIXED: Use feature branch
BACKEND_PORT="3000" # ✅ FIXED: Use port 3000, not 5000

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================================
# 1. Stop Backend
# ============================================================

echo -e "${YELLOW}1️⃣ Stopping backend...${NC}"
pkill -f "node.*server.js" || echo "No backend running"
sleep 2

# ============================================================
# 2. Prepare Backend Directory
# ============================================================

echo -e "${YELLOW}2️⃣ Preparing backend directory...${NC}"
mkdir -p "$BACKEND_DIR"

if [ ! -d "$BACKEND_DIR/PaPlsv3/.git" ]; then
    echo "Cloning repository..."
    cd "$BACKEND_DIR"
    git clone https://github.com/SKuytov/PaPlsv3.git
else
    echo "Updating existing repository..."
    cd "$BACKEND_DIR/PaPlsv3"
    git fetch origin
    git reset --hard origin/$BRANCH
fi

# ============================================================
# 3. Backend Setup
# ============================================================

echo -e "${YELLOW}3️⃣ Setting up backend...${NC}"
cd "$BACKEND_DIR/PaPlsv3/backend"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}⚠️ Create it with your Supabase credentials:${NC}"
    echo ""
    echo "cat > /opt/partpulse-backend/PaPlsv3/backend/.env << 'EOF'"
    echo "SUPABASE_URL=https://your-project.supabase.co"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "PORT=3000"
    echo "NODE_ENV=production"
    echo "FRONTEND_URL=https://partpulse.eu"
    echo "EOF"
    echo ""
    exit 1
fi

echo "Installing backend dependencies..."
rm -rf node_modules package-lock.json
npm install 2>&1 | tail -3
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# ============================================================
# 4. Frontend Setup
# ============================================================

echo ""
echo -e "${YELLOW}4️⃣ Building frontend (CLEAN BUILD)...${NC}"
cd "$BACKEND_DIR/PaPlsv3"

echo "Cleaning frontend dependencies & build artifacts..."
rm -rf node_modules package-lock.json dist build .next .vite

echo "Installing frontend dependencies..."
npm install --legacy-peer-deps 2>&1 | tail -3

echo "Building React app..."
echo "🔧 Running: npm run build"
echo "This will show the FULL build output (not just the last 10 lines):"
echo "---"

# Run build and capture output - SHOW FULL OUTPUT
BUILD_OUTPUT=$(npm run build 2>&1)
BUILD_STATUS=$?

echo "$BUILD_OUTPUT"
echo "---"

# Check if build was successful
if [ $BUILD_STATUS -ne 0 ] || [ ! -d "dist" ]; then
    echo ""
    echo -e "${RED}❌ BUILD FAILED!${NC}"
    echo "Full build output shown above ^"
    echo ""
    echo -e "${YELLOW}Debugging info:${NC}"
    echo "Build exit code: $BUILD_STATUS"
    echo "Checking for dist directory:"
    ls -la | grep dist || echo "  dist/ DOES NOT EXIST"
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo "  1. Check for import errors in components"
    echo "  2. Check for missing dependencies"
    echo "  3. Run: npm install --legacy-peer-deps"
    echo "  4. Check vite.config.js for config errors"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo "📁 Dist directory contents:"
ls -lah "$BACKEND_DIR/PaPlsv3/dist" | head -30

# ============================================================
# 5. Deploy Frontend
# ============================================================

echo ""
echo -e "${YELLOW}5️⃣ Deploying frontend to $FRONTEND_WEB_ROOT...${NC}"

if [ ! -d "$BACKEND_DIR/PaPlsv3/dist" ]; then
    echo -e "${RED}❌ ERROR: dist directory does not exist!${NC}"
    exit 1
fi

echo "Removing old files from $FRONTEND_WEB_ROOT..."
sudo rm -rf "$FRONTEND_WEB_ROOT"/*

echo "Copying dist/* to $FRONTEND_WEB_ROOT..."
echo "Source: $BACKEND_DIR/PaPlsv3/dist/"
echo "Destination: $FRONTEND_WEB_ROOT/"
sudo cp -v dist/* "$FRONTEND_WEB_ROOT/" 2>&1 | head -20

echo ""
echo "Verifying files were copied:"
sudo ls -lah "$FRONTEND_WEB_ROOT" | head -20

echo ""
sudo chown -R www-data:www-data "$FRONTEND_WEB_ROOT"
sudo chmod -R 755 "$FRONTEND_WEB_ROOT"

echo -e "${GREEN}✅ Frontend deployed${NC}"

# ============================================================
# 6. Start Backend
# ============================================================

echo ""
echo -e "${YELLOW}6️⃣ Starting backend on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR/PaPlsv3/backend"

nohup node server.js > "$LOG_FILE" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# ============================================================
# 7. Verify Services
# ============================================================

echo ""
echo -e "${YELLOW}7️⃣ Verifying services...${NC}"
if lsof -i :$BACKEND_PORT > /dev/null; then
    echo -e "${GREEN}✅ Backend running on port $BACKEND_PORT${NC}"
else
    echo -e "${RED}❌ Backend failed to start!${NC}"
    echo "Check logs: tail -50 $LOG_FILE"
    exit 1
fi

# ============================================================
# 8. Test Endpoints
# ============================================================

echo ""
echo -e "${YELLOW}8️⃣ Testing endpoints...${NC}"
echo "Health check:"
curl -s http://localhost:$BACKEND_PORT/api/health | jq .services 2>/dev/null || curl -s http://localhost:$BACKEND_PORT/api/health
echo ""

echo "RFID endpoint test:"
curl -s -X POST http://localhost:$BACKEND_PORT/api/auth/rfid-login \
  -H "Content-Type: application/json" \
  -d '{"rfid_card_id": "test"}' | head -c 150
echo ""

# ============================================================
# Summary
# ============================================================

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ REBUILD COMPLETE!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

echo -e "${GREEN}📊 Service Status:${NC}"
echo " ✅ Backend: Running on port $BACKEND_PORT"
echo " ✅ Frontend: $FRONTEND_WEB_ROOT"
echo " 📄 Logs: $LOG_FILE"
echo " 🌳 Branch: $BRANCH"
echo ""

echo -e "${GREEN}🔗 URLs:${NC}"
echo " App: https://partpulse.eu"
echo " RFID Login: https://partpulse.eu/technician-login"
echo " API Health: http://localhost:$BACKEND_PORT/api/health"
echo " Backend Logs: tail -f $LOG_FILE"
echo ""

echo -e "${GREEN}🧪 Quick Test:${NC}"
echo " curl -X POST http://localhost:$BACKEND_PORT/api/auth/rfid-login \\"
echo " -H 'Content-Type: application/json' \\"
echo " -d '{\"rfid_card_id\": \"0007879653\"}'"
echo ""

echo -e "${YELLOW}👉 Browser (Clear cache FIRST):${NC}"
echo " 1. Ctrl+Shift+Delete → Clear ALL time"
echo " 2. Ctrl+Shift+R (hard refresh)"
echo " 3. Go to: https://partpulse.eu/technician-login"
echo " 4. Manual entry: 0007879653"
echo " 5. F12 → Console → Filter: 'MaintenanceScanner' and 'performed_by'"
echo " 6. Scan item and make transaction"
echo " 7. Check database if performed_by is populated"
echo ""

echo -e "${GREEN}✨ Everything should work now!${NC}"
echo ""
