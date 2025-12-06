#!/bin/bash

echo "📋 Server Diagnostic Report"
echo "============================"
echo ""

echo "1️⃣  CURRENT LOCATION & USER"
echo "   Location: $(pwd)"
echo "   User: $(whoami)"
echo "   Home: $HOME"
echo ""

echo "2️⃣  CHECKING /root DIRECTORY"
echo "   Contents of /root:"
ls -lh /root/ 2>/dev/null | head -15
echo ""

echo "3️⃣  CHECKING /var/www DIRECTORY"
echo "   Contents of /var/www:"
ls -lh /var/www/ 2>/dev/null
echo ""

echo "4️⃣  CHECKING /home DIRECTORY"
echo "   Contents of /home:"
ls -lh /home/ 2>/dev/null
echo ""

echo "5️⃣  CHECKING /opt DIRECTORY"
echo "   Contents of /opt:"
ls -lh /opt/ 2>/dev/null
echo ""

echo "6️⃣  LOOKING FOR dist/ DIRECTORIES (built applications)"
echo "   Finding dist folders:"
find / -maxdepth 3 -type d -name "dist" 2>/dev/null
echo ""

echo "7️⃣  LOOKING FOR node_modules (Node.js projects)"
echo "   Finding node_modules:"
find / -maxdepth 3 -type d -name "node_modules" 2>/dev/null | head -5
echo ""

echo "8️⃣  CHECKING NGINX CONFIGURATION"
echo "   Nginx sites-available:"
ls -lh /etc/nginx/sites-available/ 2>/dev/null
echo ""

echo "9️⃣  CHECKING WEB SERVER DIRECTORY"
echo "   /var/www/html contents:"
ls -lh /var/www/html/ 2>/dev/null | head -10
echo ""

echo "🔟 RUNNING PROCESSES"
echo "   Node processes:"
ps aux | grep node | grep -v grep
echo ""
echo "   Nginx status:"
ps aux | grep nginx | grep -v grep
echo ""

echo "📝 SUMMARY FOR ADMIN"
echo "==================="
echo "Run these commands to find your app:"
echo ""
echo "$ find / -name 'vite.config.js' 2>/dev/null"
echo "$ find / -name 'package.json' -type f 2>/dev/null | head -10"
echo "$ ls -la /usr/share/nginx/html/ 2>/dev/null"
echo ""
echo "Then share the output above ↑"
