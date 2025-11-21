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

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
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
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Combined Proxy Server is running',
    services: ['RC Details', 'DL Verification'],
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// RC Details Endpoint
app.post('/api/fetch-rc-details', async (req, res) => {
  const { registration_number } = req.body;
  
  if (!registration_number) {
    return res.status(400).json({
      success: false,
      message: 'Registration number is required'
    });
  }

  console.log('🚗 Fetching RC details for:', registration_number);
  
  try {
    const cleanedRegNumber = registration_number.replace(/\s+/g, '').toUpperCase();
    
    const response = await fetch(API_CONFIG.rc_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_CONFIG.key
      },
      body: JSON.stringify({
        vehicleId: cleanedRegNumber
      })
    });
    
    const data = await response.json();
    console.log('📥 RC API Response:', {
      code: data.code,
      status: data.status,
      hasResponse: !!data.response
    });
    
    if (data.code === 200 && data.response) {
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
      console.log('❌ IP not whitelisted for RC API:', req.ip);
      res.status(403).json({
        success: false,
        message: 'IP not whitelisted',
        error: data.message,
        yourIP: req.ip
      });
    } else {
      res.json({
        success: false,
        message: data.message || 'Failed to fetch RC details',
        error: data
      });
    }
  } catch (error) {
    console.error('❌ RC API error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// DL Verification Endpoint
app.post('/api/fetch-dl-details', async (req, res) => {
  const { dl_no, dob } = req.body;
  
  if (!dl_no || !dob) {
    return res.status(400).json({
      success: false,
      message: 'DL number and date of birth are required'
    });
  }

  console.log('🚗 Fetching DL details for:', dl_no);
  
  try {
    // Normalize the DL number - if no space, add space after first 4 characters (state code)
    let normalizedDL = dl_no.trim().toUpperCase();
    
    // Remove all spaces first
    normalizedDL = normalizedDL.replace(/\s+/g, '');
    
    // Add space after state code (first 4 characters) if it's a valid format
    if (normalizedDL.length > 4) {
      normalizedDL = normalizedDL.substring(0, 4) + ' ' + normalizedDL.substring(4);
    }
    
    console.log('📝 Normalized DL number:', normalizedDL);
    
    // Format the request body as form data
    const formData = new URLSearchParams();
    formData.append('dl_no', normalizedDL);
    formData.append('dob', dob); // Format: DD-MM-YYYY
    
    console.log('📤 DL API Request:', {
      url: API_CONFIG.dl_url,
      dl_no: dl_no,
      dob: dob
    });
    
    const response = await fetch(API_CONFIG.dl_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': API_CONFIG.key,
        'X-Request-Id': `dl_${Date.now()}`
      },
      body: formData.toString()
    });
    
    const data = await response.json();
    console.log('📥 DL API Response:', {
      code: data.code,
      status: data.status,
      hasResponse: !!data.response
    });
    
    if (data.code === 200 && data.response) {
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
        vehicle_classes: data.response.vehicle_class ? 
          (Array.isArray(data.response.vehicle_class) ? 
            data.response.vehicle_class : 
            typeof data.response.vehicle_class === 'string' ?
              data.response.vehicle_class.split(',').map(v => v.trim()).filter(v => v) :
              []) : [],
        blood_group: data.response.blood_group || '',
        state: data.response.state || '',
        rto_code: data.response.rto_code || '',
        // Additional fields from API
        permanent_zip: data.response.permanent_zip || '',
        temporary_zip: data.response.temporary_zip || '',
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
      console.log('❌ IP not whitelisted for DL API:', req.ip);
      res.status(403).json({
        success: false,
        message: 'IP not whitelisted',
        error: data.message,
        yourIP: req.ip
      });
    } else if (data.code === 404 || data.code === 422) {
      console.log('⚠️ DL not found or invalid:', dl_no);
      res.json({
        success: false,
        message: 'Invalid DL number or DOB combination',
        error: data.message || 'No records found'
      });
    } else {
      console.log('❌ DL API Error:', data);
      res.json({
        success: false,
        message: data.message || 'Failed to fetch DL details',
        error: data
      });
    }
  } catch (error) {
    console.error('❌ DL API server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Challan endpoint
app.post('/api/fetch-challan-info', async (req, res) => {
  const { vehicleId, chassis, engine_no } = req.body;
  
  if (!vehicleId || !chassis || !engine_no) {
    return res.status(400).json({
      success: false,
      message: 'Vehicle ID, Chassis Number, and Engine Number are all required',
      details: {
        vehicleId: !vehicleId ? 'missing' : 'provided',
        chassis: !chassis ? 'missing' : 'provided',
        engine_no: !engine_no ? 'missing' : 'provided'
      }
    });
  }
  
  console.log('🚔 Fetching Challan info for:', vehicleId);
  
  try {
    // Clean inputs (remove spaces and uppercase)
    const cleanVehicleId = vehicleId?.replace(/\s/g, '').toUpperCase();
    const cleanChassis = chassis?.replace(/\s/g, '').toUpperCase();
    const cleanEngineNo = engine_no?.replace(/\s/g, '').toUpperCase();
    
    // Format the request body as form data
    const formData = new URLSearchParams();
    formData.append('vehicleId', cleanVehicleId);
    formData.append('chassis', cleanChassis);
    formData.append('engine_no', cleanEngineNo);
    
    console.log('📝 Challan API Request:', { cleanVehicleId, cleanChassis, cleanEngineNo });
    
    const response = await fetch(API_CONFIG.challan_url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'x-api-key': API_CONFIG.key,
        'X-Request-Id': crypto.randomUUID(),
        'X-Environment': 'production'
      },
      body: formData.toString()
    });
    
    const data = await response.json();
    console.log('📋 Challan API Response:', data);
    
    if (data.code === 200 && data.status === 'success') {
      console.log('✅ Challan details found');
      
      // Check if response contains mock data
      let hasMockData = false;
      if (data.response?.challans) {
        hasMockData = data.response.challans.some(challan => 
          challan.challan_no?.includes('XXXX') || 
          challan.accused_name?.includes('DUMMY') ||
          challan.date?.includes('XXXX') ||
          challan.offence?.includes('Custom offence')
        );
        
        if (hasMockData) {
          console.warn('⚠️ API returned mock/sample challan data');
        }
      }
      
      res.json({
        success: true,
        status: 'success',
        response: {
          vehicleId: cleanVehicleId,
          total: data.response?.total || 0,
          challans: data.response?.challans || []
        },
        message: hasMockData ? 
          'API returned sample data (API in test mode)' : 
          'Challan details fetched successfully',
        dataSource: hasMockData ? 'mock' : 'api'
      });
    } else if (data.code === 403) {
      console.log('❌ IP not whitelisted for Challan API:', req.ip);
      res.status(403).json({
        success: false,
        message: 'IP not whitelisted',
        error: data.message,
        yourIP: req.ip
      });
    } else if (data.code === 404 || data.code === 422) {
      console.log('⚠️ No challans found for vehicle:', cleanVehicleId);
      res.json({
        success: true,
        status: 'success',
        response: {
          vehicleId: cleanVehicleId,
          total: 0,
          challans: []
        },
        message: 'No challans found for this vehicle'
      });
    } else {
      console.log('❌ Challan API Error:', data);
      res.json({
        success: false,
        message: data.message || 'Failed to fetch challan details',
        error: data
      });
    }
  } catch (error) {
    console.error('❌ Challan API server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
  console.log(`🚀 Combined Proxy Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`\n📋 Endpoints:`);
  console.log(`  RC Details: http://localhost:${PORT}/api/fetch-rc-details`);
  console.log(`  DL Details: http://localhost:${PORT}/api/fetch-dl-details`);
  console.log(`  Challan Info: http://localhost:${PORT}/api/fetch-challan-info`);
  console.log(`\n🔑 API Key: ${API_CONFIG.key.substring(0, 10)}...`);
  console.log(`\n✅ Ready to handle both RC and DL requests!`);
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
