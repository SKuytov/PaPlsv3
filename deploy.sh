#!/bin/bash

################################################################################
# PAPLS V3 - BULGARIAN LOCALIZATION DEPLOYMENT SCRIPT
# For: Ubuntu VPS Hosting (Hostinger)
# Created: December 23, 2025
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="${1:-/var/www/papls}"
BRANCH="${2:-main}"
NODE_ENV="${3:-production}"

################################################################################
# FUNCTIONS
################################################################################

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

################################################################################
# PRE-DEPLOYMENT CHECKS
################################################################################

print_header "PRE-DEPLOYMENT CHECKS"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
fi
print_success "Project directory found: $PROJECT_DIR"

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
fi
print_success "Git is installed"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
fi
NODE_VERSION=$(node -v)
print_success "Node.js is installed: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
fi
NPM_VERSION=$(npm -v)
print_success "npm is installed: $NPM_VERSION"

################################################################################
# DEPLOYMENT STEPS
################################################################################

print_header "PULLING LATEST CODE"

cd "$PROJECT_DIR" || print_error "Cannot change to project directory"
print_info "Current directory: $(pwd)"

# Fetch latest changes
print_info "Fetching latest changes from remote..."
git fetch origin || print_error "Failed to fetch from origin"
print_success "Fetched latest changes"

# Checkout target branch
print_info "Checking out branch: $BRANCH"
git checkout "$BRANCH" || print_error "Failed to checkout $BRANCH"
print_success "Switched to $BRANCH"

# Pull latest code
print_info "Pulling latest code..."
git pull origin "$BRANCH" || print_error "Failed to pull from origin/$BRANCH"
print_success "Code pulled successfully"

# Show current commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
print_info "Current commit: $CURRENT_COMMIT"

################################################################################
# DEPENDENCIES & BUILD
################################################################################

print_header "INSTALLING DEPENDENCIES"

print_info "Installing npm dependencies..."
npm install || print_error "Failed to install npm dependencies"
print_success "Dependencies installed"

print_header "BUILDING APPLICATION"

print_info "Building application for $NODE_ENV environment..."
NODE_ENV="$NODE_ENV" npm run build || print_error "Build failed"
print_success "Build completed successfully"

# Verify build output
if [ ! -d "dist" ]; then
    print_error "Build directory (dist/) not found"
fi
DIST_SIZE=$(du -sh dist/ | cut -f1)
print_success "Build artifacts created: $DIST_SIZE"

################################################################################
# APPLICATION RESTART
################################################################################

print_header "RESTARTING APPLICATION"

# Check if PM2 is being used
if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q papls; then
    print_info "Using PM2 for process management..."
    pm2 restart papls || print_error "Failed to restart PM2 process"
    print_success "PM2 process restarted"
    
    # Save PM2 config
    pm2 save || print_warning "Could not save PM2 configuration"
elif command -v systemctl &> /dev/null; then
    print_info "Using systemd for process management..."
    sudo systemctl restart papls || print_error "Failed to restart systemd service"
    print_success "systemd service restarted"
else
    print_warning "Could not detect process manager (PM2 or systemd)"
    print_info "Manual restart required"
fi

################################################################################
# POST-DEPLOYMENT VERIFICATION
################################################################################

print_header "POST-DEPLOYMENT VERIFICATION"

# Wait a moment for the app to start
sleep 3

# Check if app is responding
print_info "Checking application health..."
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    print_success "Application is responding on port 3000"
else
    print_warning "Could not reach application on port 3000"
    print_info "Application may still be starting. Please check manually."
fi

# Show current status
print_info "Checking process status..."
if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q papls; then
    pm2 status papls
elif command -v systemctl &> /dev/null; then
    systemctl status papls --no-pager | head -10
fi

################################################################################
# DEPLOYMENT SUMMARY
################################################################################

print_header "DEPLOYMENT COMPLETE ✓"

echo ""
echo "Deployment Summary:"
echo "  Project: $PROJECT_DIR"
echo "  Branch: $BRANCH"
echo "  Environment: $NODE_ENV"
echo "  Commit: $CURRENT_COMMIT"
echo "  Build Size: $DIST_SIZE"
echo "  Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

echo "Next Steps:"
echo "  1. Verify the application at: https://your-domain.com"
echo "  2. Test language switcher in top navigation"
echo "  3. Switch between English and Bulgarian"
echo "  4. Check that translations are working"
echo ""

print_success "Deployment finished successfully!"

################################################################################
# NOTES
################################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "IMPORTANT NOTES:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Configuration:"
echo "   - Project directory: $PROJECT_DIR"
echo "   - Branch: $BRANCH"
echo "   - Environment: $NODE_ENV"
echo ""
echo "2. Check Logs:"
echo "   - PM2: pm2 logs papls"
echo "   - systemd: journalctl -u papls -f"
echo ""
echo "3. Verify Translation:"
echo "   - Open browser DevTools"
echo "   - Check localStorage for 'appLanguage'"
echo "   - Should show 'en' or 'bg'"
echo ""
echo "4. Rollback (if needed):"
echo "   git reset --hard HEAD~1"
echo "   npm run build"
echo "   systemctl restart papls"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

exit 0
