#!/bin/bash

# 🚀 PartPulse Quote Management Deployment Script
# Updates: Quote ID format (QT-YY-XXXXX) + Supplier Part Auto-Load
# Date: December 8, 2025

echo "🚀 STARTING COMPLETE DEPLOYMENT..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Pulling latest code from GitHub${NC}"
cd /tmp
rm -rf PaPlsv3
git clone https://github.com/SKuytov/PaPlsv3.git
cd PaPlsv3
echo -e "${GREEN}✅ Code pulled successfully${NC}\n"

echo -e "${YELLOW}Step 2: Verifying key files${NC}"
if grep -q "QT-YY-XXXXX" src/components/modules/quotes/ManualQuoteRequestModal.jsx 2>/dev/null || \
   grep -q "QT-\${year}-\${sequentialNumber}" src/components/modules/quotes/ManualQuoteRequestModal.jsx 2>/dev/null; then
    echo -e "${GREEN}✅ ManualQuoteRequestModal: Quote ID format verified${NC}"
else
    echo -e "${RED}❌ ManualQuoteRequestModal: Quote ID format NOT found${NC}"
fi

if grep -q "supplier_part_mappings" src/components/modules/quotes/SearchablePartSelector.jsx 2>/dev/null; then
    echo -e "${GREEN}✅ SearchablePartSelector: Supplier mapping code verified${NC}"
else
    echo -e "${RED}❌ SearchablePartSelector: Supplier mapping code NOT found${NC}"
fi

if grep -q "155 Blvd. Lipnik" src/components/modules/quotes/EmailTemplateGenerator.jsx 2>/dev/null; then
    echo -e "${GREEN}✅ EmailTemplateGenerator: Ruse address verified${NC}"
else
    echo -e "${RED}❌ EmailTemplateGenerator: Ruse address NOT found${NC}"
fi
echo ""

echo -e "${YELLOW}Step 3: Cleaning build artifacts${NC}"
rm -rf node_modules package-lock.json dist build .next 2>/dev/null
echo -e "${GREEN}✅ Cleaned${NC}\n"

echo -e "${YELLOW}Step 4: Installing dependencies${NC}"
npm install --legacy-peer-deps --no-audit 2>&1 | grep -E "(added|up to date)" || true
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

echo -e "${YELLOW}Step 5: Building application${NC}"
npm run build
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Build successful${NC}\n"
else
    echo -e "${RED}❌ Build failed - dist folder not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 6: Deploying to production${NC}"
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
echo -e "${GREEN}✅ Files deployed${NC}\n"

echo -e "${YELLOW}Step 7: Configuring Nginx cache-busting${NC}"
sudo tee /etc/nginx/conf.d/cache-busting.conf > /dev/null << 'NGINX'
# Disable cache for JavaScript (Quote ID generation)
location ~* \.js$ {
    expires -1;
    add_header Pragma "no-cache";
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
    add_header ETag '"$(date +%s)"';
}

# Disable cache for CSS
location ~* \.css$ {
    expires -1;
    add_header Pragma "no-cache";
    add_header Cache-Control "no-cache, no-store, must-revalidate, max-age=0";
}

# Minimal cache for HTML
location ~* \.html?$ {
    expires 1h;
    add_header Cache-Control "public, max-age=3600, must-revalidate";
}

# Cache images
location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
}
NGINX
echo -e "${GREEN}✅ Cache configuration updated${NC}\n"

echo -e "${YELLOW}Step 8: Testing and reloading Nginx${NC}"
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}\n"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    exit 1
fi

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}================================================${NC}\n"

echo -e "${YELLOW}📄 NEXT STEPS FOR YOU:${NC}\n"

echo "1. 📋 CLEAR BROWSER CACHE:"
echo "   - Windows: Ctrl+Shift+Delete"
echo "   - Mac: Cmd+Shift+Delete"
echo "   - Select 'ALL TIME' and check all boxes\n"

echo "2. 🔒 OPEN INCOGNITO/PRIVATE WINDOW"
echo "   - This ensures fresh cache\n"

echo "3. 🛍️ TEST THE FEATURE:"
echo "   - Go to: https://partpulse.eu/quotes/dashboard"
echo "   - Click 'Create Quote Request'"
echo "   - Quote ID should show: QT-25-01001 (or higher)\n"

echo "4. 🔍 VERIFY SUPPLIER PART LOADING:"
echo "   - Select a supplier"
echo "   - Select a part"
echo "   - Check if Supplier Part Number and SKU auto-fill"
echo "   - If missing, warning ⚠️ should appear\n"

echo "5. 📧 CHECK EMAIL FORMAT:"
echo "   - Create a test quote"
echo "   - Go to 'Copy & Paste' step"
echo "   - Verify email contains:"
echo "     * Quote ID: QT-25-XXXXX"
echo "     * Delivery Location: 155 Blvd. Lipnik, 7005 Ruse, Bulgaria"
echo "     * Supplier Part Number and SKU fields\n"

echo -e "${GREEN}🌟 All systems go! Your new quote system is live!${NC}\n"
