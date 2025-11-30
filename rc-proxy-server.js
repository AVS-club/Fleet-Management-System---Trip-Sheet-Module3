// Production-ready Express server to proxy RC API calls
// This bypasses IP whitelisting issues by using a single server IP

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// API Configuration - Using your actual credentials
const API_CONFIG = {
  url: process.env.APICLUB_URL || 'https://prod.apiclub.in/api/v1/rc_info',
  key: process.env.APICLUB_KEY || 'apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50',
  xid: process.env.APICLUB_XID || '' // X-ID for HMAC authentication
};

// CORS configuration - add your production domains here
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://oosrmuqfcqtojflruhww.supabase.co',
      // Add your production domain here
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RC Proxy Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main proxy endpoint for RC details
app.post('/api/fetch-rc-details', async (req, res) => {
  const { registration_number } = req.body;
  
  // Optional: Add authentication
  const authToken = req.headers['x-auth-token'];
  if (process.env.PROXY_AUTH_TOKEN && authToken !== process.env.PROXY_AUTH_TOKEN) {
    console.log('❌ Unauthorized request attempt');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
  
  if (!registration_number) {
    return res.status(400).json({
      success: false,
      message: 'Registration number is required'
    });
  }

  console.log('🚗 Fetching RC details for:', registration_number);
  
  try {
    // Clean and format the registration number
    const cleanedRegNumber = registration_number.replace(/\s+/g, '').toUpperCase();
    
    const requestBody = {
      vehicleId: cleanedRegNumber
    };
    
    console.log('📤 API Request:', {
      url: API_CONFIG.url,
      vehicleId: cleanedRegNumber
    });
    
    // ========================================
    // HMAC Signature Authentication
    // ========================================
    // Step 1: Convert JSON to Base64
    const jsonString = JSON.stringify(requestBody);
    const base64Payload = Buffer.from(jsonString).toString('base64');
    console.log('🔐 Base64 Payload generated');
    
    // Step 2: Generate HMAC-SHA256 signature
    const hmacSignature = crypto
      .createHmac('sha256', API_CONFIG.key)
      .update(base64Payload)
      .digest('hex');
    
    console.log('✅ HMAC Signature generated');
    console.log('  - Headers: x-signature, x-id, Content-Type');
    
    const response = await fetch(API_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': hmacSignature,
        'x-id': API_CONFIG.xid
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    console.log('📥 API Response:', {
      code: data.code,
      status: data.status,
      hasResponse: !!data.response
    });
    
    if (data.code === 200 && data.response) {
      // Success - return the data in the format your frontend expects
      console.log('✅ Successfully fetched RC details');
      res.json({
        success: true,
        data: {
          response: data.response
        },
        message: 'RC details fetched successfully',
        dataSource: 'api'
      });
    } else if (data.code === 403) {
      // IP not whitelisted
      console.log('❌ IP not whitelisted:', req.ip);
      res.status(403).json({
        success: false,
        message: 'IP not whitelisted',
        error: data.message,
        yourIP: req.ip,
        solution: 'Please whitelist this server IP in API Club dashboard'
      });
    } else if (data.code === 404) {
      // Vehicle not found
      console.log('⚠️ Vehicle not found:', cleanedRegNumber);
      res.json({
        success: false,
        message: 'Vehicle details not found',
        error: 'No records found for this registration number'
      });
    } else {
      // Other API errors
      console.log('❌ API Error:', data);
      res.json({
        success: false,
        message: data.message || 'Failed to fetch RC details',
        error: data
      });
    }
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 RC Proxy Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔗 RC Endpoint: http://localhost:${PORT}/api/fetch-rc-details`);
  console.log(`📋 API URL: ${API_CONFIG.url}`);
  console.log(`🔑 API Key: ${API_CONFIG.key.substring(0, 10)}...`);
  console.log(`🆔 X-ID: ${API_CONFIG.xid ? API_CONFIG.xid.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`🔐 Auth Method: HMAC-SHA256 Signature`);
  console.log(`\n✅ Ready to handle requests!`);
  console.log(`${'='.repeat(60)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
