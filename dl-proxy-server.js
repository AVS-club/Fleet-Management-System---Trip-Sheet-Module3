// Express server to proxy Driving License API calls
// This bypasses IP whitelisting issues for driver verification

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.DL_PROXY_PORT || 3002;

// API Configuration
const DL_API_CONFIG = {
  url: process.env.DL_API_URL || 'https://prod.apiclub.in/api/v1/fetch_dl',  // Changed to PROD!
  key: process.env.DL_API_KEY || 'apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50', // Same API key works for DL
  xid: process.env.APICLUB_XID || process.env.DL_API_XID || '' // X-ID for HMAC authentication
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://oosrmuqfcqtojflruhww.supabase.co',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
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

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'DL Proxy Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main proxy endpoint for DL details
app.post('/api/fetch-dl-details', async (req, res) => {
  const { dl_no, dob } = req.body;
  
  // Optional: Add authentication
  const authToken = req.headers['x-auth-token'];
  if (process.env.PROXY_AUTH_TOKEN && authToken !== process.env.PROXY_AUTH_TOKEN) {
    console.log('❌ Unauthorized request attempt');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
  
  if (!dl_no || !dob) {
    return res.status(400).json({
      success: false,
      message: 'DL number and date of birth are required'
    });
  }

  console.log('🚗 Fetching DL details for:', dl_no);
  
  try {
    // Format the request as per API documentation
    const requestBody = {
      dl_no: dl_no.replace(/\s+/g, '').toUpperCase(),
      dob: dob // Format: DD-MM-YYYY
    };
    
    console.log('📤 API Request:', {
      url: DL_API_CONFIG.url,
      dl_no: requestBody.dl_no
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
      .createHmac('sha256', DL_API_CONFIG.key)
      .update(base64Payload)
      .digest('hex');
    
    console.log('✅ HMAC Signature generated');
    console.log('  - Headers: x-signature, x-id, Content-Type');
    
    const response = await fetch(DL_API_CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-signature': hmacSignature,
        'x-id': DL_API_CONFIG.xid
      },
      body: new URLSearchParams(requestBody).toString()
    });
    
    const data = await response.json();
    console.log('📥 API Response:', {
      code: data.code,
      status: data.status,
      hasResponse: !!data.response
    });
    
    if (data.code === 200 && data.response) {
      // Success - return the data
      console.log('✅ Successfully fetched DL details');
      
      // Map the response to match our driver form fields
      const mappedData = {
        full_name: data.response.holder_name || '',
        father_name: data.response.father_or_husband_name || '',
        gender: data.response.gender || '',
        date_of_birth: data.response.dob || '',
        permanent_address: data.response.permanent_address || '',
        temporary_address: data.response.temporary_address || '',
        license_number: data.response.license_number || dl_no,
        issue_date: data.response.issue_date || '',
        valid_from: data.response.valid_from || '',
        valid_upto: data.response.valid_upto || '',
        vehicle_class: data.response.vehicle_class || [],
        blood_group: data.response.blood_group || '',
        state: data.response.state || '',
        rto_code: data.response.rto_code || ''
      };
      
      res.json({
        success: true,
        data: mappedData,
        rawData: data.response,
        message: 'DL details fetched successfully',
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
      // DL not found
      console.log('⚠️ DL not found:', requestBody.dl_no);
      res.json({
        success: false,
        message: 'Driving license details not found',
        error: 'No records found for this DL number'
      });
    } else {
      // Other API errors
      console.log('❌ API Error:', data);
      res.json({
        success: false,
        message: data.message || 'Failed to fetch DL details',
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
  console.log(`🚗 DL Proxy Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔗 DL Endpoint: http://localhost:${PORT}/api/fetch-dl-details`);
  console.log(`📋 API URL: ${DL_API_CONFIG.url}`);
  console.log(`🔑 API Key: ${DL_API_CONFIG.key.substring(0, 10)}...`);
  console.log(`🆔 X-ID: ${DL_API_CONFIG.xid ? DL_API_CONFIG.xid.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`🔐 Auth Method: HMAC-SHA256 Signature`);
  console.log(`\n✅ Ready to handle DL verification requests!`);
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
