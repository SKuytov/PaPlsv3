#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 PaPlsv3 Project Finder${NC}"
echo -e "${BLUE}=========================${NC}"
echo ""

# Function to check if directory is a Node.js project
check_project() {
    local dir=$1
    if [ -f "$dir/package.json" ] && [ -d "$dir/src" ]; then
        echo -e "${GREEN}✓ Found PaPlsv3 project at: $dir${NC}"
        echo "  Contents: $(ls -la "$dir" | wc -l) items"
        echo "  Backend exists: $([ -d "$dir/backend" ] && echo 'YES' || echo 'NO')"
        echo "  Src exists: $([ -d "$dir/src" ] && echo 'YES' || echo 'NO')"
        echo "  Dist exists: $([ -d "$dir/dist" ] && echo 'YES' || echo 'NO')"
        echo ""
    fi
}

echo -e "${YELLOW}Searching in common locations...${NC}"
echo ""

# Search in common locations
for location in /home /opt /var/www /usr/local /root /srv /tmp; do
    if [ -d "$location" ]; then
        # Direct subdirectories
        for dir in "$location"/*; do
            [ -d "$dir" ] && check_project "$dir"
        done
        
        # 2 levels deep
        for dir in "$location"/*/*; do
            [ -d "$dir" ] && check_project "$dir"
        done
    fi
done

echo -e "${YELLOW}Searching for all package.json files...${NC}"
echo ""
echo "Running: find / -maxdepth 4 -name 'package.json' 2>/dev/null"
echo ""

find / -maxdepth 4 -name 'package.json' 2>/dev/null | while read file; do
    dir=$(dirname "$file")
    if [ -d "$dir/src" ] || [ -d "$dir/backend" ]; then
        name=$(grep -o '"name": "[^"]*"' "$file" | cut -d'"' -f4)
        echo -e "${GREEN}📁 $dir${NC}"
        echo "   Package: $name"
    fi
done

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. Copy the path shown above"
echo "2. Run: cd /path/to/paplsv3"
echo "3. Run: ls -la (verify you see package.json)"
echo "4. Run: npm install"
echo "5. Run: node backend/server.js"
echo ""
