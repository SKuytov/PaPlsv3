#!/bin/bash

echo "════════════════════════════════════════════════════════════"
echo "🔍 FIXING NGINX PERMISSIONS"
echo "════════════════════════════════════════════════════════════"
echo ""

WEB_ROOT="/var/www/html"

echo "1️⃣ Current permissions:"
ls -ld "$WEB_ROOT"
echo ""

echo "2️⃣ Files in web root:"
ls -la "$WEB_ROOT" | head -20
echo ""

echo "3️⃣ Checking nginx user:"
grep user /etc/nginx/nginx.conf | grep -v '#' | head -1
echo ""

echo "4️⃣ Fixing ownership:"
sudo chown -R www-data:www-data "$WEB_ROOT"
echo "✅ Changed owner to www-data:www-data"
echo ""

echo "5️⃣ Fixing directory permissions (755):"
sudo find "$WEB_ROOT" -type d -exec chmod 755 {} \;
echo "✅ Set all directories to 755"
echo ""

echo "6️⃣ Fixing file permissions (644):"
sudo find "$WEB_ROOT" -type f -exec chmod 644 {} \;
echo "✅ Set all files to 644"
echo ""

echo "7️⃣ Checking index.html exists:"
if [ -f "$WEB_ROOT/index.html" ]; then
    echo "✅ index.html EXISTS"
    echo "First 5 lines:"
    head -5 "$WEB_ROOT/index.html"
else
    echo "❌ index.html NOT FOUND!"
    echo "Files in $WEB_ROOT:"
    ls -la "$WEB_ROOT"
fi
echo ""

echo "8️⃣ Testing nginx configuration:"
sudo nginx -t
echo ""

echo "9️⃣ Reloading nginx:"
sudo systemctl reload nginx
echo "✅ Nginx reloaded"
echo ""

echo "10️⃣ Checking nginx status:"
sudo systemctl status nginx | grep -E 'Active|Main PID'
echo ""

echo "🌟 Done! Try accessing the website now."
echo ""
