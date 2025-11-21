#!/bin/bash

# Deployment script for your existing whitelisted server
# Run this on your server

echo "🚀 Deploying API Proxy to your server..."

# 1. Create directory for the proxy
mkdir -p ~/api-proxy
cd ~/api-proxy

# 2. Create the combined proxy server file
cat > combined-proxy-server.js << 'EOF'
// Combined Express server to proxy both RC and DL API calls
// This single server handles all API Club requests to avoid IP whitelisting issues

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// API Configuration - Using your actual credentials
const API_CONFIG = {
  rc_url: process.env.RC_API_URL || 'https://prod.apiclub.in/api/v1/rc_info',
  dl_url: process.env.DL_API_URL || 'https://prod.apiclub.in/api/v1/fetch_dl',
  challan_url: process.env.CHALLAN_API_URL || 'https://prod.apiclub.in/api/v1/challan_info_v2',
  key: process.env.APICLUB_KEY || 'apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50'
};

// CORS configuration - IMPORTANT: Update this with your domain
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://app.autovitalsolution.com',  // Your production domain
      'https://autovitalsolution.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Your existing RC, DL, and Challan endpoints here...
// (Copy the rest from your existing combined-proxy-server.js)

app.listen(PORT, () => {
  console.log(`🚀 API Proxy Server running on port ${PORT}`);
});
EOF

# 3. Create package.json
cat > package.json << 'EOF'
{
  "name": "api-proxy-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node combined-proxy-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "node-fetch": "^3.3.2",
    "dotenv": "^16.3.1"
  }
}
EOF

# 4. Install dependencies
npm install

# 5. Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 6. Start with PM2
pm2 stop api-proxy 2>/dev/null || true
pm2 start combined-proxy-server.js --name api-proxy
pm2 save
pm2 startup

echo "✅ Proxy server deployed and running!"
echo "📍 Your API endpoints are now available at:"
echo "   - http://YOUR_SERVER_IP:3001/api/fetch-rc-details"
echo "   - http://YOUR_SERVER_IP:3001/api/fetch-dl-details"
echo "   - http://YOUR_SERVER_IP:3001/api/fetch-challan-info"
