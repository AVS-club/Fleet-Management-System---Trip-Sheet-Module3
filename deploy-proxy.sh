#!/bin/bash

echo "========================================="
echo "RC Proxy Server Deployment Script"
echo "========================================="

# Check if running on a server or locally
read -p "Are you deploying to production? (y/n): " IS_PROD

if [ "$IS_PROD" = "y" ]; then
    echo "Setting up for production..."
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install PM2 globally if not present
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    # Create environment file
    cat > .env << EOF
PORT=3001
APICLUB_URL=https://prod.apiclub.in/api/v1/rc_info
APICLUB_KEY=apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50
NODE_ENV=production
EOF
    
    # Install dependencies
    echo "Installing dependencies..."
    npm install express cors node-fetch dotenv
    
    # Start with PM2
    echo "Starting server with PM2..."
    pm2 start rc-proxy-server.js --name rc-proxy
    pm2 save
    pm2 startup
    
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me)
    
    echo ""
    echo "========================================="
    echo "✅ Deployment Complete!"
    echo "========================================="
    echo "Server IP: $SERVER_IP"
    echo ""
    echo "IMPORTANT: Add this IP to API Club whitelist:"
    echo "$SERVER_IP"
    echo ""
    echo "Your proxy endpoint:"
    echo "http://$SERVER_IP:3001/api/fetch-rc-details"
    echo ""
    echo "PM2 Commands:"
    echo "  pm2 logs rc-proxy    - View logs"
    echo "  pm2 restart rc-proxy - Restart server"
    echo "  pm2 stop rc-proxy    - Stop server"
    echo "========================================="
    
else
    echo "Setting up for local development..."
    
    # Install dependencies
    echo "Installing dependencies..."
    npm install express cors node-fetch dotenv
    
    # Start server
    echo "Starting local server..."
    node rc-proxy-server.js
fi
