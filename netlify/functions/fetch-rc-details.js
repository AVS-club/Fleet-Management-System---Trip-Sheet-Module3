// Netlify Function for RC Details API
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
    const { registration_number } = JSON.parse(event.body);
    
    if (!registration_number) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Registration number is required'
        })
      };
    }

    // Clean the registration number
    const cleanedNumber = registration_number.replace(/\s+/g, '').toUpperCase();
    
    // Call the API
    const response = await fetch('https://prod.apiclub.in/api/v1/rc_info', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'x-api-key': process.env.APICLUB_KEY || 'apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50'
      },
      body: `vehicleId=${cleanedNumber}`
    });

    const data = await response.json();

    if (data.code === 200 && data.status === 'success') {
      // Map the response data
      const mappedData = {
        registration_number: data.response.license_plate || registration_number,
        owner_name: data.response.owner_name || '',
        father_name: data.response.father_name || '',
        present_address: data.response.present_address || '',
        permanent_address: data.response.permanent_address || '',
        mobile_number: data.response.mobile_number || '',
        vehicle_category: data.response.vehicle_category || '',
        vehicle_class: data.response.class || '',
        fuel_type: data.response.fuel_type || '',
        vehicle_type: data.response.body_type || '',
        make: data.response.brand_name || '',
        model: data.response.brand_model || '',
        color: data.response.color || '',
        chassis_number: data.response.chassis_number || '',
        engine_number: data.response.engine_number || '',
        manufacturing_year: parseInt(data.response.manufacturing_year) || null,
        registration_date: data.response.registration_date || '',
        fitness_certificate_expiry_date: data.response.fitness_upto || '',
        insurance_expiry_date: data.response.insurance_expiry || '',
        insurance_company: data.response.insurance_company || '',
        insurance_policy_number: data.response.insurance_policy || '',
        puc_expiry_date: data.response.pucc_upto || '',
        puc_certificate_number: data.response.pucc_number || '',
        permit_number: data.response.permit_number || '',
        permit_expiry_date: data.response.permit_valid_upto || '',
        permit_type: data.response.permit_type || '',
        rc_status: data.response.rc_status || '',
        emission_norms: data.response.norms || '',
        tax_valid_upto: data.response.tax_upto || '',
        national_permit_number: data.response.national_permit_number || '',
        national_permit_expiry_date: data.response.national_permit_upto || '',
        state_permit_number: data.response.state_permit_number || '',
        cubic_capacity: parseFloat(data.response.cubic_capacity) || null,
        gross_vehicle_weight: parseFloat(data.response.gross_weight) || null,
        unladen_weight: parseFloat(data.response.unladen_weight) || null,
        seating_capacity: parseInt(data.response.seating_capacity) || null,
        owner_count: parseInt(data.response.owner_count) || null,
        financer: data.response.financer || '',
        tyre_size: data.response.tyre_size || '',
        number_of_tyres: parseInt(data.response.number_of_tyres) || null
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: mappedData,
          message: 'RC details fetched successfully'
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
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: data.message || 'Failed to fetch RC details',
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
