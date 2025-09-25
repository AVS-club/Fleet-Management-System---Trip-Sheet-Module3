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
      amount: number;
      state: string;
      area: string;
      offence: string;
      offence_list: Array<{
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

    // Call the Challan Information API
    const formData = new URLSearchParams();
    formData.append('vehicleId', vehicleId);
    formData.append('chassis', chassis);        // Required field
    formData.append('engine_no', engine_no);    // Required field

    console.log('Making API call with data:', { vehicleId, chassis, engine_no });
    
    const response = await fetch('https://uat.apiclub.in/api/v1/challan_info_v2', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'x-api-key': 'apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50',
        'X-Request-Id': crypto.randomUUID()
      },
      body: formData.toString()
    });

    console.log('API Response Status:', response.status);
    const responseText = await response.text();
    console.log('API Response Text:', responseText);
    
    const data = JSON.parse(responseText) as ChallanResponse;
    
    // Debug: Log the actual API response
    console.log('Challan API Parsed Response:', data);

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
            .reduce((sum, c) => sum + c.amount, 0)
        })
        .eq('registration_number', vehicleId);

      // Store challan details in separate table
      if (data.response.challans.length > 0) {
        const challansToInsert = data.response.challans.map(challan => ({
          vehicle_id: vehicleId,
          challan_no: challan.challan_no,
          date: challan.date,
          amount: challan.amount,
          status: challan.challan_status,
          offence: challan.offence,
          state: challan.state,
          area: challan.area,
          accused_name: challan.accused_name,
          offence_details: { offence_list: challan.offence_list }
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
