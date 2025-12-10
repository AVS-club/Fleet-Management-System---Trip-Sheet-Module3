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
    const { dl_no, dob } = await req.json();

    if (!dl_no || !dob) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'DL number and date of birth are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log('🚗 Fetching DL details for:', dl_no);

    // Use API Club credentials from environment
    const apiUrl = (globalThis as any).Deno?.env?.get?.('DL_API_URL') || 'https://prod.apiclub.in/api/v1/fetch_dl';
    const apiKey = (globalThis as any).Deno?.env?.get?.('APICLUB_KEY');
    const apiXid = (globalThis as any).Deno?.env?.get?.('APICLUB_XID');

    console.log('🔐 Credential check:');
    console.log('  - URL:', apiUrl);
    console.log('  - Key present:', !!apiKey);
    console.log('  - XID present:', !!apiXid);

    if (!apiKey || !apiXid) {
      console.error('⚠️ Missing API Club credentials');
      throw new Error('API credentials not configured - need APICLUB_KEY and APICLUB_XID');
    }

    const requestBody = {
      dl_no: dl_no.replace(/\s+/g, '').toUpperCase(),
      dob: dob // Format: DD-MM-YYYY
    };

    console.log('📤 Request body:', requestBody);

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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-signature': hmacSignature,
        'x-id': apiXid
      },
      body: new URLSearchParams(requestBody).toString()
    });

    const responseText = await response.text();
    console.log('📥 API Response Status:', response.status, response.statusText);
    console.log('📝 Response Text:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('❌ API Error - Status:', response.status);
      console.error('❌ API Error - Response:', responseText);
      throw new Error(`External API error: ${response.status} - ${responseText.substring(0, 200)}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ Response parsed successfully');
      console.log('📊 API Response code:', data.code);
    } catch (parseError) {
      console.error('❌ Failed to parse API response:', parseError);
      throw new Error('Invalid API response format');
    }

    if (data.code === 200 && data.response) {
      console.log('✅ Successfully fetched DL details');
      console.log('📋 API Response fields:', Object.keys(data.response));
      console.log('🖼️ Has image:', !!data.response.image);
      console.log('📍 Has address:', !!data.response.permanent_address);

      // Map the response to match driver form fields
      // Handle nested validity objects
      const nonTransportValidity = data.response.non_transport_validity || {};
      const transportValidity = data.response.transport_validity || {};
      
      // Parse RTO name and state from rto_code (format: "RTO,BILASPUR (CHHATTISGARH)")
      const rtoCode = data.response.rto_code || '';
      let rtoName = '';
      let stateName = data.response.state || '';
      
      if (rtoCode) {
        // Extract RTO name (between comma and opening parenthesis)
        const rtoMatch = rtoCode.match(/,\s*([^(]+)/);
        if (rtoMatch) {
          rtoName = rtoMatch[1].trim();
        }
        
        // Extract state (inside parentheses)
        const stateMatch = rtoCode.match(/\(([^)]+)\)/);
        if (stateMatch && !stateName) {
          stateName = stateMatch[1].trim();
        }
      }
      
      const mappedData = {
        full_name: data.response.holder_name || '',
        father_name: data.response.father_or_husband_name || '',
        gender: data.response.gender || '',
        date_of_birth: data.response.dob || '',
        // Try present_address first (more commonly filled), fallback to permanent_address
        permanent_address: data.response.present_address || data.response.permanent_address || '',
        temporary_address: data.response.temporary_address || '',
        license_number: data.response.license_number || dl_no,
        // Extract dates from nested validity objects
        issue_date: data.response.issue_date || nonTransportValidity.from || transportValidity.from || '',
        valid_from: data.response.valid_from || nonTransportValidity.from || transportValidity.from || '',
        valid_upto: data.response.valid_upto || nonTransportValidity.to || transportValidity.to || '',
        vehicle_class: data.response.vehicle_class || [],
        blood_group: data.response.blood_group || '',
        state: stateName,
        rto_code: rtoCode,
        rto: rtoName,  // Parsed RTO name
        image: data.response.image || data.response.photo || ''  // Driver photo from API
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: mappedData,
          rawData: data.response,
          message: 'DL details fetched successfully',
          dataSource: 'api'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else if (data.code === 403) {
      console.log('❌ IP not whitelisted');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'IP not whitelisted',
          error: data.message,
          solution: 'Please whitelist server IP in API Club dashboard'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else if (data.code === 404) {
      console.log('⚠️ DL not found:', requestBody.dl_no);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Driving license details not found',
          error: 'No records found for this DL number'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      console.log('❌ API Error:', data);
      return new Response(
        JSON.stringify({
          success: false,
          message: data.message || 'Failed to fetch DL details',
          error: data
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
  } catch (error) {
    console.error('❌ Server error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Server error',
        error: error.message,
        debug: {
          timestamp: new Date().toISOString(),
          functionVersion: '1.0'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

