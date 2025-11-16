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
    const { registration_number } = await req.json();

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
    const cleanedNumber = registration_number.replace(/\s+/g, '').toUpperCase();

    const testVehicles: Record<string, Record<string, string | number>> = {
      CG04NJ9406: {
        brand_name: 'TATA MOTORS',
        brand_model: 'INTRA V30',
        vehicle_age: 0,
        fuel_type: 'Diesel',
        class: 'GOODS CARRIER',
        chassis_number: 'MAT456ERLF1S00789',
        engine_number: 'G12B789456',
        owner_name: 'SHREE DURGA ENT',
        registration_date: '2025-01-01',
        insurance_expiry: '2026-01-15',
        tax_upto: 'LTT',
        permit_valid_upto: '2030-01-14',
        pucc_upto: '2025-07-31',
        fitness_upto: '2027-01-14',
        color: 'White',
        seating_capacity: '2',
        gross_weight: '3490'
      },
      CG04AB1234: {
        brand_name: 'TATA MOTORS',
        brand_model: 'YODHA 1700',
        vehicle_age: 2,
        fuel_type: 'Diesel',
        class: 'GOODS CARRIER',
        chassis_number: 'MAT789ERLF1S00123',
        engine_number: 'H4CR123456',
        owner_name: 'TEST OWNER',
        registration_date: '2023-03-15',
        insurance_expiry: '2025-03-14',
        tax_upto: '2025-03-31',
        permit_valid_upto: '2028-03-14',
        pucc_upto: '2025-02-28',
        fitness_upto: '2025-03-14'
      },
      CG04NC4622: {
        brand_name: 'MAHINDRA',
        brand_model: 'BOLERO PICKUP',
        vehicle_age: 3,
        fuel_type: 'Diesel',
        class: 'GOODS CARRIER',
        chassis_number: 'MA1TA2G2S00000000',
        engine_number: 'M2DICR000000',
        owner_name: 'VEHICLE OWNER',
        registration_date: '2022-06-10',
        insurance_expiry: '2025-06-09',
        tax_upto: '2025-06-30',
        permit_valid_upto: '2027-06-09',
        pucc_upto: '2025-05-31',
        fitness_upto: '2025-06-09',
        color: 'White',
        seating_capacity: '3',
        gross_weight: '2500'
      }
    };

    if (testVehicles[cleanedNumber]) {
      console.log('✅ Using test data for:', cleanedNumber);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            response: testVehicles[cleanedNumber]
          },
          message: 'RC details fetched successfully (test mode)'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    try {
      console.log('🌐 Making API call to API Club...');

      // Use API Club credentials from environment
      const apiUrl = (globalThis as any).Deno?.env?.get?.('APICLUB_URL');
      const apiKey = (globalThis as any).Deno?.env?.get?.('APICLUB_KEY');
      const apiXid = (globalThis as any).Deno?.env?.get?.('APICLUB_XID');

      if (!apiUrl || !apiKey || !apiXid) {
        console.error('⚠️ Missing API Club credentials in environment');
        throw new Error('API credentials not configured');
      }

      console.log('📍 API URL:', apiUrl);
      console.log('🔑 Using configured API Club credentials');

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'secretKey': apiKey,
          'clientId': apiXid
        },
        body: JSON.stringify({
          vehicleNumber: cleanedNumber
        })
      });

      const responseText = await apiResponse.text();
      console.log('📥 API Response Status:', apiResponse.status);

      if (!apiResponse.ok) {
        console.error('❌ API Error:', responseText);
        throw new Error(`External API error: ${apiResponse.status}`);
      }

      const apiData = JSON.parse(responseText);
      console.log('📊 API Response Code:', apiData.code);

      if (apiData.code !== 100) {
        console.error('⚠️ API returned non-success code:', apiData);
        throw new Error(apiData.message || 'Vehicle not found in database');
      }

      const vehicleData = apiData.data || {};
      console.log('✅ Vehicle data received, fields:', Object.keys(vehicleData));

      const transformedData = {
        response: {
          brand_name: vehicleData.maker || vehicleData.makerModel || '',
          brand_model: vehicleData.model || vehicleData.vehicleModel || '',
          vehicle_age: vehicleData.vehicleAge || 0,
          fuel_type: vehicleData.fuelType || 'Diesel',
          class: vehicleData.vehicleClass || '',
          chassis_number: vehicleData.chassisNumber || '',
          engine_number: vehicleData.engineNumber || '',
          color: vehicleData.color || vehicleData.vehicleColor || '',
          cubic_capacity: vehicleData.vehicleCubicCapacity || '',
          cylinders: vehicleData.vehicleCylindersNo || '',
          gross_weight: vehicleData.vehicleGrossWeight || '',
          seating_capacity: vehicleData.vehicleSeatingCapacity || '',
          norms: vehicleData.normsType || '',
          owner_name: vehicleData.ownerName || '',
          registration_date: vehicleData.registrationDate || '',
          rc_status: vehicleData.rcStatus || '',
          financer: vehicleData.financer || '',
          noc_details: vehicleData.nocDetails || '',
          insurance_policy: vehicleData.insurancePolicyNumber || '',
          insurance_company: vehicleData.insuranceCompany || '',
          insurance_expiry: vehicleData.insuranceUpto || '',
          tax_upto: vehicleData.taxUpto || vehicleData.taxPaidUpto || '',
          tax_paid_upto: vehicleData.taxPaidUpto || '',
          permit_number: vehicleData.permitNumber || '',
          permit_type: vehicleData.permitType || '',
          permit_issue_date: vehicleData.permitIssueDate || '',
          permit_valid_upto: vehicleData.permitValidUpto || '',
          national_permit_number: vehicleData.nationalPermitNumber || '',
          national_permit_upto: vehicleData.nationalPermitUpto || '',
          pucc_number: vehicleData.pucNumber || '',
          pucc_upto: vehicleData.pucUpto || '',
          fitness_upto: vehicleData.fitnessUpto || '',
          rc_expiry: vehicleData.rcExpiryDate || ''
        }
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: transformedData,
          message: 'RC details fetched successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (apiError) {
      console.error('🔥 API Call Failed:', apiError);

      console.log('📦 Using fallback data generation for:', cleanedNumber);

      const fallbackData = {
        response: {
          brand_name: 'TATA MOTORS',
          brand_model: 'COMMERCIAL VEHICLE',
          vehicle_age: 1,
          fuel_type: 'Diesel',
          class: 'GOODS CARRIER',
          chassis_number: `CHN${Date.now()}`,
          engine_number: `ENG${Date.now()}`,
          owner_name: 'VEHICLE OWNER',
          registration_date: '2024-01-01',
          insurance_expiry: '2025-12-31',
          tax_upto: '2025-12-31',
          permit_valid_upto: '2029-12-31',
          pucc_upto: '2025-06-30',
          fitness_upto: '2026-12-31',
          color: 'White',
          seating_capacity: '2',
          gross_weight: '3500'
        }
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: fallbackData,
          message: 'RC details fetched (fallback mode - API unavailable)',
          warning: 'Using fallback data. Please verify and update manually.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
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