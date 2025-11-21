// Netlify Function for Challan Info API
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { vehicleId, chassis, engine_no } = JSON.parse(event.body);
    
    if (!vehicleId || !chassis || !engine_no) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Vehicle ID, Chassis Number, and Engine Number are all required',
          details: {
            vehicleId: !vehicleId ? 'missing' : 'provided',
            chassis: !chassis ? 'missing' : 'provided',
            engine_no: !engine_no ? 'missing' : 'provided'
          }
        })
      };
    }

    // Clean inputs
    const cleanVehicleId = vehicleId?.replace(/\s/g, '').toUpperCase();
    const cleanChassis = chassis?.replace(/\s/g, '').toUpperCase();
    const cleanEngineNo = engine_no?.replace(/\s/g, '').toUpperCase();
    
    // Format the request
    const formData = new URLSearchParams();
    formData.append('vehicleId', cleanVehicleId);
    formData.append('chassis', cleanChassis);
    formData.append('engine_no', cleanEngineNo);

    // Call the API
    const response = await fetch('https://prod.apiclub.in/api/v1/challan_info_v2', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'x-api-key': process.env.APICLUB_KEY || 'apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50',
        'X-Request-Id': crypto.randomUUID(),
        'X-Environment': 'production'
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (data.code === 200 && data.status === 'success') {
      // Check if response contains mock data
      let hasMockData = false;
      if (data.response?.challans) {
        hasMockData = data.response.challans.some(challan => 
          challan.challan_no?.includes('XXXX') || 
          challan.accused_name?.includes('DUMMY') ||
          challan.date?.includes('XXXX') ||
          challan.offence?.includes('Custom offence')
        );
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
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
        })
      };
    } else if (data.code === 403) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'API key issue or IP not whitelisted',
          error: data.message
        })
      };
    } else if (data.code === 404 || data.code === 422) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'success',
          response: {
            vehicleId: cleanVehicleId,
            total: 0,
            challans: []
          },
          message: 'No challans found for this vehicle'
        })
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: data.message || 'Failed to fetch challan details',
          error: data
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message
      })
    };
  }
};
