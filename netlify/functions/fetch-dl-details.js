// Netlify Function for DL Details API

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
    const { dl_no, dob } = JSON.parse(event.body);
    
    if (!dl_no || !dob) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'License number and DOB are required'
        })
      };
    }

    // Normalize the DL number - add space after first 4 characters
    let normalizedDL = dl_no.trim().toUpperCase();
    normalizedDL = normalizedDL.replace(/\s+/g, '');
    if (normalizedDL.length > 4) {
      normalizedDL = normalizedDL.substring(0, 4) + ' ' + normalizedDL.substring(4);
    }
    
    // Format the request
    const formData = new URLSearchParams();
    formData.append('dl_no', normalizedDL);
    formData.append('dob', dob);

    // Call the API using native fetch
    const response = await fetch('https://prod.apiclub.in/api/v1/fetch_dl', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'x-api-key': process.env.APICLUB_KEY || 'apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50'
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (data.code === 200 && data.status === 'success') {
      // Map the response data
      const mappedData = {
        license_number: data.response.license_number || dl_no,
        full_name: data.response.holder_name || '',
        father_or_husband_name: data.response.father_or_husband_name || '',
        gender: data.response.gender || '',
        dob: data.response.dob || dob,
        permanent_address: data.response.permanent_address || '',
        permanent_zip: data.response.permanent_zip || '',
        temporary_address: data.response.temporary_address || '',
        temporary_zip: data.response.temporary_zip || '',
        license_issue_date: data.response.issue_date || '',
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
        image: data.response.image || ''
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: mappedData,
          message: 'DL details fetched successfully'
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
          success: false,
          message: 'Invalid DL number or DOB combination',
          error: data.message || 'No records found'
        })
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: data.message || 'Failed to fetch DL details',
          error: data
        })
      };
    }
  } catch (error) {
    console.error('Error in fetch-dl-details function:', error);
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