import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChallanRequest {
  vehicleId: string;
  chassis: string;    // Required field
  engine_no: string;  // Required field
}

interface ChallanResponse {
  code: number;
  status: string;
  message: string;
  response?: {
    vehicleId: string;
    total: number;
    challans: Array<{
      challan_no: string;
      date: string;
      accused_name: string;
      challan_status: string;
      amount: number | string;  // Can be number or empty string
      state: string;
      area: string;
      offence: string;
      offences: Array<{  // Changed from offence_list to offences
        offence_name: string;
      }>;
    }>;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { vehicleId, chassis, engine_no } = await req.json() as ChallanRequest;

    // Validate all three fields are present
    if (!vehicleId || !chassis || !engine_no) {
      return new Response(
        JSON.stringify({ 
          error: 'Vehicle ID, Chassis Number, and Engine Number are all required',
          details: {
            vehicleId: !vehicleId ? 'missing' : 'provided',
            chassis: !chassis ? 'missing' : 'provided',
            engine_no: !engine_no ? 'missing' : 'provided'
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Clean inputs (remove spaces and uppercase)
    const cleanVehicleId = vehicleId?.replace(/\s/g, '').toUpperCase();
    const cleanChassis = chassis?.replace(/\s/g, '').toUpperCase();
    const cleanEngineNo = engine_no?.replace(/\s/g, '').toUpperCase();

    // Get API credentials from environment
    const apiKey = (globalThis as any).Deno?.env?.get?.('CHALLAN_API_KEY') || (globalThis as any).Deno?.env?.get?.('APICLUB_KEY');
    const apiXid = (globalThis as any).Deno?.env?.get?.('CHALLAN_API_XID') || (globalThis as any).Deno?.env?.get?.('APICLUB_XID');
    const apiUrl = (globalThis as any).Deno?.env?.get?.('CHALLAN_API_URL') || 'https://prod.apiclub.in/api/v1/challan_info_v2';

    console.log('🔐 Credential check:');
    console.log('  - API URL:', apiUrl);
    console.log('  - API Key present:', !!apiKey);
    console.log('  - X-ID present:', !!apiXid);

    if (!apiKey || !apiXid) {
      console.error('⚠️ Missing API credentials');
      throw new Error('API credentials not configured - need KEY and XID for HMAC authentication');
    }

    // Call the Challan Information API with JSON (matching RC API pattern)
    const requestBody = {
      vehicleId: cleanVehicleId,
      chassis: cleanChassis,
      engine_no: cleanEngineNo
    };

    console.log('Making API call with cleaned data:', { 
      original: { vehicleId, chassis, engine_no },
      cleaned: requestBody
    });
    
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
    
    // Changed to JSON like RC API (instead of form-urlencoded)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': hmacSignature,
        'x-id': apiXid,
        'X-Request-Id': crypto.randomUUID(),
        'X-Environment': 'production'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('API Response Status:', response.status);
    const responseText = await response.text();
    console.log('API Response Text:', responseText);
    
    const data = JSON.parse(responseText) as ChallanResponse;
    
    // Debug: Log the actual API response
    console.log('Challan API Parsed Response:', data);
    
    // Check if response contains mock data
    if (data.response?.challans) {
      const hasMockData = data.response.challans.some(challan => 
        challan.challan_no.includes('XXXX') || 
        challan.accused_name.includes('DUMMY') ||
        challan.date.includes('XXXX') ||
        challan.offence.includes('Custom offence')
      );
      
      if (hasMockData) {
        console.warn('⚠️ API returned mock/sample data instead of real challan information');
        console.warn('This might be due to:');
        console.warn('1. API key not having access to real data');
        console.warn('2. API in test/demo mode');
        console.warn('3. Invalid vehicle data provided');
        console.warn('4. Production API configuration issue');
      }
    }

    // Store challan info in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (data.status === 'success' && data.response?.challans) {
      // Update vehicle with last challan check timestamp
      await supabase
        .from('vehicles')
        .update({ 
          challan_last_checked: new Date().toISOString(),
          total_challans: data.response.total,
          pending_challan_amount: data.response.challans
            .filter(c => c.challan_status !== 'Paid')
            .reduce((sum, c) => {
              const amount = typeof c.amount === 'string' ? parseFloat(c.amount) || 0 : c.amount;
              return sum + amount;
            }, 0)
        })
        .eq('registration_number', cleanVehicleId);

      // Store challan details in separate table
      if (data.response.challans.length > 0) {
        const challansToInsert = data.response.challans.map(challan => ({
          vehicle_id: cleanVehicleId,
          challan_no: challan.challan_no,
          date: challan.date,
          amount: challan.amount,
          status: challan.challan_status,
          offence: challan.offence,
          state: challan.state,
          area: challan.area,
          accused_name: challan.accused_name,
          offence_details: { offences: challan.offences }
        }));

        await supabase
          .from('vehicle_challans')
          .upsert(challansToInsert, { onConflict: 'vehicle_id,challan_no' });
      }
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Challan API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
