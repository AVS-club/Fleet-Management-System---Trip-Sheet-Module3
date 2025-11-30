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

// Driver License API Configuration
const DL_API_CONFIG = {
  url: process.env.DL_API_URL || 'https://prod.apiclub.in/api/v1/fetch_dl',  // Changed to PROD!
  key: process.env.DL_API_KEY || process.env.APICLUB_KEY || API_CONFIG.key,
  xid: process.env.APICLUB_XID || API_CONFIG.xid
};

// Challan API Configuration
const CHALLAN_API_CONFIG = {
  url: process.env.CHALLAN_API_URL || 'https://prod.apiclub.in/api/v1/challan_info_v2',
  key: process.env.CHALLAN_API_KEY || process.env.APICLUB_KEY || API_CONFIG.key,
  xid: process.env.APICLUB_XID || API_CONFIG.xid
};

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

// Main proxy endpoint for DL details
app.post('/api/fetch-dl-details', async (req, res) => {
  const { dl_no, dob } = req.body;
  
  // Optional: Add authentication
  const authToken = req.headers['x-auth-token'];
  if (process.env.PROXY_AUTH_TOKEN && authToken !== process.env.PROXY_AUTH_TOKEN) {
    console.log('❌ Unauthorized DL request attempt');
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
    
    console.log('📤 DL API Request:', {
      url: DL_API_CONFIG.url,
      dl_no: requestBody.dl_no
    });
    
    // ========================================
    // HMAC Signature Authentication
    // ========================================
    // Step 1: Convert JSON to Base64
    const jsonString = JSON.stringify(requestBody);
    const base64Payload = Buffer.from(jsonString).toString('base64');
    console.log('🔐 Base64 Payload generated for DL');
    
    // Step 2: Generate HMAC-SHA256 signature
    const hmacSignature = crypto
      .createHmac('sha256', DL_API_CONFIG.key)
      .update(base64Payload)
      .digest('hex');
    
    console.log('✅ HMAC Signature generated for DL');
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
    console.log('📥 DL API Response:', {
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
        rto_code: data.response.rto_code || '',
        image: data.response.image || ''
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
      console.log('❌ IP not whitelisted for DL:', req.ip);
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
      console.log('❌ DL API Error:', data);
      res.json({
        success: false,
        message: data.message || 'Failed to fetch DL details',
        error: data
      });
    }
  } catch (error) {
    console.error('❌ DL Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Main proxy endpoint for Challan Info
app.post('/api/fetch-challan-info', async (req, res) => {
  const { vehicleId, chassis, engine_no } = req.body;
  
  // Optional: Add authentication
  const authToken = req.headers['x-auth-token'];
  if (process.env.PROXY_AUTH_TOKEN && authToken !== process.env.PROXY_AUTH_TOKEN) {
    console.log('❌ Unauthorized Challan request attempt');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
  
  if (!vehicleId || !chassis || !engine_no) {
    return res.status(400).json({
      status: 'error',
      message: 'Vehicle ID, Chassis, and Engine Number are required'
    });
  }

  console.log('🚨 Fetching Challan info for:', vehicleId);
  
  try {
    // Clean inputs
    const cleanVehicleId = vehicleId.replace(/\s+/g, '').toUpperCase();
    const cleanChassis = chassis.replace(/\s+/g, '').toUpperCase();
    const cleanEngineNo = engine_no.replace(/\s+/g, '').toUpperCase();
    
    // Build form data for challan API (uses form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('vehicleId', cleanVehicleId);
    formData.append('chassis', cleanChassis);
    formData.append('engine_no', cleanEngineNo);
    
    console.log('📤 Challan API Request:', {
      url: CHALLAN_API_CONFIG.url,
      vehicleId: cleanVehicleId
    });
    
    // ========================================
    // HMAC Signature Authentication
    // ========================================
    // For Challan, we sign the JSON representation even though API uses form-urlencoded
    const requestBodyJson = {
      vehicleId: cleanVehicleId,
      chassis: cleanChassis,
      engine_no: cleanEngineNo
    };
    
    // Step 1: Convert JSON to Base64
    const jsonString = JSON.stringify(requestBodyJson);
    const base64Payload = Buffer.from(jsonString).toString('base64');
    console.log('🔐 Base64 Payload generated for Challan');
    
    // Step 2: Generate HMAC-SHA256 signature
    const hmacSignature = crypto
      .createHmac('sha256', CHALLAN_API_CONFIG.key)
      .update(base64Payload)
      .digest('hex');
    
    console.log('✅ HMAC Signature generated for Challan');
    console.log('  - Headers: x-signature, x-id, content-type');
    
    const response = await fetch(CHALLAN_API_CONFIG.url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'x-signature': hmacSignature,
        'x-id': CHALLAN_API_CONFIG.xid
      },
      body: formData.toString()
    });
    
    const data = await response.json();
    console.log('📥 Challan API Response:', {
      code: data.code,
      status: data.status,
      total: data.response?.total || 0
    });
    
    if (data.status === 'success' && data.response) {
      console.log(`✅ Successfully fetched challan info - ${data.response.total} challan(s)`);
      res.json(data);
    } else if (data.code === 403) {
      console.log('❌ IP not whitelisted for Challan:', req.ip);
      res.status(403).json({
        status: 'error',
        message: 'IP not whitelisted',
        error: data.message
      });
    } else {
      console.log('❌ Challan API Error:', data);
      res.json({
        status: 'error',
        message: data.message || 'Failed to fetch challan info',
        error: data
      });
    }
  } catch (error) {
    console.error('❌ Challan Server error:', error);
    res.status(500).json({
      status: 'error',
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
  console.log(`🚀 Multi-API Proxy Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   🚗 RC Details: http://localhost:${PORT}/api/fetch-rc-details`);
  console.log(`   🪪 DL Details: http://localhost:${PORT}/api/fetch-dl-details`);
  console.log(`   🚨 Challan Info: http://localhost:${PORT}/api/fetch-challan-info`);
  console.log(`\n🔐 Authentication:`);
  console.log(`   🔑 API Key: ${API_CONFIG.key.substring(0, 10)}...`);
  console.log(`   🆔 X-ID: ${API_CONFIG.xid ? API_CONFIG.xid.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`   🔒 Method: HMAC-SHA256 Signature`);
  console.log(`\n📡 API URLs:`);
  console.log(`   RC: ${API_CONFIG.url}`);
  console.log(`   DL: ${DL_API_CONFIG.url}`);
  console.log(`   Challan: ${CHALLAN_API_CONFIG.url}`);
  console.log(`\n✅ Ready to handle RC, DL & Challan requests!`);
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
