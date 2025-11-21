#!/bin/bash

# Quick deployment script for your whitelisted server
# Usage: ./quick-deploy.sh YOUR_SERVER_IP

SERVER_IP=$1

if [ -z "$SERVER_IP" ]; then
    echo "Usage: ./quick-deploy.sh YOUR_SERVER_IP"
    echo "Example: ./quick-deploy.sh 192.168.1.100"
    exit 1
fi

echo "🚀 Deploying to server: $SERVER_IP"

# Copy the proxy server to your server
echo "📦 Copying proxy server..."
scp combined-proxy-server.js root@$SERVER_IP:/root/api-proxy/

# SSH and setup
echo "🔧 Setting up on server..."
ssh root@$SERVER_IP << 'ENDSSH'
cd /root/api-proxy

# Check if package.json exists, if not create it
if [ ! -f package.json ]; then
    npm init -y
    npm install express cors node-fetch dotenv
fi

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Restart the proxy
pm2 stop api-proxy 2>/dev/null || true
pm2 start combined-proxy-server.js --name api-proxy
pm2 save

echo "✅ Proxy server is running!"
ENDSSH

echo "✅ Deployment complete!"
echo ""
echo "📝 Now update your .env.production file with:"
echo "VITE_RC_PROXY_URL=http://$SERVER_IP:3001/api/fetch-rc-details"
echo "VITE_DL_PROXY_URL=http://$SERVER_IP:3001/api/fetch-dl-details"
echo "VITE_CHALLAN_PROXY_URL=http://$SERVER_IP:3001/api/fetch-challan-info"
