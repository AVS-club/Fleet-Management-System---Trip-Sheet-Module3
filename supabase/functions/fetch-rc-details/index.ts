// @ts-expect-error Remote import for Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { registration_number, skipTestData = false } = await req.json();

    if (!registration_number) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Registration number is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('🚗 Fetching RC details for:', registration_number);
    console.log('📋 Skip test data:', skipTestData);
    const cleanedNumber = registration_number.replace(/\s+/g, '').toUpperCase();

    // Remove all test data - always use real API
    // If you need test data for development, use a separate test environment

    try {
      console.log('🌐 Making API call to API Club...');
      console.log('🔍 Vehicle number (cleaned):', cleanedNumber);

      // Use API Club credentials from environment
      const apiUrl = (globalThis as any).Deno?.env?.get?.('APICLUB_URL');
      const apiKey = (globalThis as any).Deno?.env?.get?.('APICLUB_KEY');
      const apiXid = (globalThis as any).Deno?.env?.get?.('APICLUB_XID');

      console.log('🔐 Credential check:');
      console.log('  - URL present:', !!apiUrl);
      console.log('  - Key present:', !!apiKey);
      console.log('  - XID present:', !!apiXid);

      if (!apiUrl || !apiKey || !apiXid) {
        console.error('⚠️ Missing API Club credentials in environment');
        console.error('  - APICLUB_URL:', apiUrl ? 'Present' : 'MISSING');
        console.error('  - APICLUB_KEY:', apiKey ? 'Present' : 'MISSING');
        console.error('  - APICLUB_XID:', apiXid ? 'Present' : 'MISSING');
        throw new Error('API credentials not configured - need URL, KEY, and XID for HMAC authentication');
      }

      console.log('📍 API URL:', apiUrl);
      console.log('🔑 Using configured API Club credentials');

      const requestBody = {
        vehicleId: cleanedNumber  // API expects 'vehicleId' not 'vehicleNumber'
      };
      
      console.log('📤 Request details:');
      console.log('  - Method: POST');
      console.log('  - Body:', JSON.stringify(requestBody));
      
      // ========================================
      // HMAC Signature Authentication
      // ========================================
      // Step 1: Convert JSON to Base64
      const jsonString = JSON.stringify(requestBody);
      const base64Payload = btoa(jsonString);
      console.log('🔐 Base64 Payload generated');
      
      // Step 2: Generate HMAC-SHA256 signature
      const encoder = new TextEncoder();
      const keyData = encoder.encode(apiKey);
      const messageData = encoder.encode(base64Payload);
      
      // Import the key for HMAC
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      // Generate the signature
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        messageData
      );
      
      // Convert signature to hex string
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const hmacSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('✅ HMAC Signature generated');
      console.log('  - Headers: x-signature, x-id, Content-Type');
      
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': hmacSignature,
          'x-id': apiXid || ''
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await apiResponse.text();
      console.log('📥 API Response Status:', apiResponse.status, apiResponse.statusText);
      console.log('📄 Response Headers:', Object.fromEntries(apiResponse.headers.entries()));
      console.log('📝 Response Text (first 500 chars):', responseText.substring(0, 500));

      if (!apiResponse.ok) {
        console.error('❌ API Error - Status:', apiResponse.status);
        console.error('❌ API Error - Response:', responseText);
        throw new Error(`External API error: ${apiResponse.status} - ${responseText.substring(0, 200)}`);
      }

      let apiData;
      try {
        apiData = JSON.parse(responseText);
        console.log('✅ Response parsed successfully');
      } catch (parseError) {
        console.error('❌ Failed to parse API response as JSON:', parseError);
        throw new Error('Invalid API response format');
      }

      console.log('📊 API Response structure:');
      console.log('  - Has code:', 'code' in apiData);
      console.log('  - Code value:', apiData.code);
      console.log('  - Has data:', 'data' in apiData);
      console.log('  - Has message:', 'message' in apiData);
      console.log('  - Message:', apiData.message);

      if (apiData.code !== 200) {
        console.error('⚠️ API returned non-success code:', apiData.code);
        console.error('⚠️ Full response:', JSON.stringify(apiData, null, 2));
        throw new Error(apiData.message || 'Vehicle not found in database');
      }

      // Check if we have the response data
      if (!apiData.response) {
        console.error('⚠️ No response field in API data:', apiData);
        throw new Error('Invalid API response structure');
      }
      
      console.log('✅ Vehicle data received');
      console.log('📋 Available fields:', Object.keys(apiData.response));
      console.log('🔍 Sample data (first 5 fields):', Object.entries(apiData.response).slice(0, 5));

      // The API returns data in the 'response' field with exact field names
      const vehicleResponse = apiData.response || {};
      
      const transformedData = {
        response: {
          // Direct mapping - API returns these exact field names
          brand_name: vehicleResponse.brand_name || '',
          brand_model: vehicleResponse.brand_model || '',
          fuel_type: vehicleResponse.fuel_type || 'Diesel',
          class: vehicleResponse.class || '',
          chassis_number: vehicleResponse.chassis_number || '',
          engine_number: vehicleResponse.engine_number || '',
          color: vehicleResponse.color || '',
          cubic_capacity: vehicleResponse.cubic_capacity || '',
          cylinders: vehicleResponse.cylinders || '',
          gross_weight: vehicleResponse.gross_weight || '',
          seating_capacity: vehicleResponse.seating_capacity || '',
          norms: vehicleResponse.norms || '',
          owner_name: vehicleResponse.owner_name || '',
          registration_date: vehicleResponse.registration_date || '',
          rc_status: vehicleResponse.rc_status || '',
          financer: vehicleResponse.financer || '',
          noc_details: vehicleResponse.noc_details || '',
          insurance_policy: vehicleResponse.insurance_policy || '',
          insurance_company: vehicleResponse.insurance_company || '',
          insurance_expiry: vehicleResponse.insurance_expiry || '',
          tax_upto: vehicleResponse.tax_upto || '',
          tax_paid_upto: vehicleResponse.tax_paid_upto || '',
          permit_number: vehicleResponse.permit_number || '',
          permit_type: vehicleResponse.permit_type || '',
          permit_issue_date: vehicleResponse.permit_issue_date || '',
          permit_valid_upto: vehicleResponse.permit_valid_upto || '',
          permit_valid_from: vehicleResponse.permit_valid_from || '',
          national_permit_number: vehicleResponse.national_permit_number || '',
          national_permit_upto: vehicleResponse.national_permit_upto || '',
          pucc_number: vehicleResponse.pucc_number || '',
          pucc_upto: vehicleResponse.pucc_upto || '',
          father_name: vehicleResponse.father_name || '',
          present_address: vehicleResponse.present_address || '',
          permanent_address: vehicleResponse.permanent_address || '',
          owner_count: vehicleResponse.owner_count || '',
          is_financed: vehicleResponse.is_financed || '',
          // Note: fitness_upto is not in the API response
          fitness_upto: ''
        }
      };

      console.log('✅ Transformation complete, returning real API data');
      
      return new Response(
        JSON.stringify({
          success: true,
          data: transformedData,
          message: 'RC details fetched successfully',
          dataSource: 'api'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (apiError) {
      console.error('🔥 API Call Failed:', apiError);
      console.error('📋 Error details:', {
        message: apiError.message,
        stack: apiError.stack,
        name: apiError.name
      });

      // Return error instead of dummy data
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Unable to fetch RC details from external API',
          error: apiError.message,
          dataSource: 'none'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200  // Keep 200 to avoid CORS issues, but success: false indicates failure
        }
      );
    }
  } catch (error) {
    console.error('💥 Fatal Error in fetch-rc-details:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to fetch RC details',
        error: error.message,
        debug: {
          timestamp: new Date().toISOString(),
          functionVersion: '2.0'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});