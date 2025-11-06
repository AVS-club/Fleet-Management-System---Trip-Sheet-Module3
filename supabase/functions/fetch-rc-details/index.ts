import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock RC details data for demonstration
// In production, this would connect to actual VAHAN API or government portal
const mockRCData: Record<string, any> = {
  'MH12AB1234': {
    registration_number: 'MH12AB1234',
    maker: 'TATA MOTORS',
    model: 'LPT 3118',
    vehicle_type: 'truck',
    chassis_number: 'MA3ERLF1S00123456',
    engine_number: 'G12B1234567',
    fuel_type: 'Diesel',
    color: 'White',
    body_type: 'Goods Carrier',
    manufacturing_year: '2019',
    registration_date: '2019-03-15',
    fitness_upto: '2025-03-14',
    insurance_validity: '2025-03-31',
    permit_upto: '2025-03-14',
    puc_validity: '2025-01-31',
    tax_validity: '2025-03-31',
    owner_name: 'AUTO VITAL SOLUTION PVT LTD',
    owner_address: 'Mumbai, Maharashtra',
    rto_code: 'MH12',
    rto_name: 'Pune RTO',
    state: 'Maharashtra',
    seating_capacity: 2,
    gvw: '31000',
    unladen_weight: '7200',
    norms_type: 'BS VI',
    financer: 'HDFC BANK',
    hypothecation: true
  },
  'TN09BZ5678': {
    registration_number: 'TN09BZ5678',
    maker: 'ASHOK LEYLAND',
    model: 'BOSS 1213',
    vehicle_type: 'truck',
    chassis_number: 'MB1NXMBAAHW123456',
    engine_number: 'H4CRDI1234567',
    fuel_type: 'Diesel',
    color: 'Yellow',
    body_type: 'Goods Carrier',
    manufacturing_year: '2020',
    registration_date: '2020-06-20',
    fitness_upto: '2026-06-19',
    insurance_validity: '2025-06-30',
    permit_upto: '2025-06-19',
    puc_validity: '2025-04-30',
    tax_validity: '2025-06-30',
    owner_name: 'CHENNAI LOGISTICS',
    owner_address: 'Chennai, Tamil Nadu',
    rto_code: 'TN09',
    rto_name: 'Chennai RTO',
    state: 'Tamil Nadu',
    seating_capacity: 2,
    gvw: '12000',
    unladen_weight: '4200',
    norms_type: 'BS VI',
    financer: 'ICICI BANK',
    hypothecation: true
  }
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

    // Clean the registration number (remove spaces and convert to uppercase)
    const cleanedNumber = registration_number.replace(/\s/g, '').toUpperCase();

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if we have mock data for this registration number
    const rcData = mockRCData[cleanedNumber];

    if (!rcData) {
      // Generate mock data for any registration number
      const stateCode = cleanedNumber.substring(0, 2);
      const rtoCode = cleanedNumber.substring(2, 4);
      
      const generatedData = {
        registration_number: cleanedNumber,
        maker: 'TATA MOTORS',
        model: 'PRIMA LX 3125.K',
        vehicle_type: 'truck',
        chassis_number: `CHN${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        engine_number: `ENG${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        fuel_type: 'Diesel',
        color: 'White',
        body_type: 'Goods Carrier',
        manufacturing_year: '2021',
        registration_date: '2021-04-10',
        fitness_upto: '2027-04-09',
        insurance_validity: '2025-04-30',
        permit_upto: '2026-04-09',
        puc_validity: '2025-02-28',
        tax_validity: '2025-04-30',
        owner_name: 'FLEET OWNER',
        owner_address: 'India',
        rto_code: `${stateCode}${rtoCode}`,
        rto_name: `${stateCode} RTO`,
        state: getStateName(stateCode),
        seating_capacity: 2,
        gvw: '25000',
        unladen_weight: '8500',
        norms_type: 'BS VI',
        financer: null,
        hypothecation: false
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: generatedData,
          message: 'RC details fetched successfully (simulated)'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: rcData,
        message: 'RC details fetched successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in fetch-rc-details:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to fetch RC details',
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function getStateName(stateCode: string): string {
  const states: Record<string, string> = {
    'AN': 'Andaman and Nicobar Islands',
    'AP': 'Andhra Pradesh',
    'AR': 'Arunachal Pradesh',
    'AS': 'Assam',
    'BR': 'Bihar',
    'CH': 'Chandigarh',
    'CG': 'Chhattisgarh',
    'DD': 'Daman and Diu',
    'DL': 'Delhi',
    'GA': 'Goa',
    'GJ': 'Gujarat',
    'HR': 'Haryana',
    'HP': 'Himachal Pradesh',
    'JK': 'Jammu and Kashmir',
    'JH': 'Jharkhand',
    'KA': 'Karnataka',
    'KL': 'Kerala',
    'LD': 'Lakshadweep',
    'MP': 'Madhya Pradesh',
    'MH': 'Maharashtra',
    'MN': 'Manipur',
    'ML': 'Meghalaya',
    'MZ': 'Mizoram',
    'NL': 'Nagaland',
    'OD': 'Odisha',
    'PY': 'Puducherry',
    'PB': 'Punjab',
    'RJ': 'Rajasthan',
    'SK': 'Sikkim',
    'TN': 'Tamil Nadu',
    'TS': 'Telangana',
    'TR': 'Tripura',
    'UP': 'Uttar Pradesh',
    'UK': 'Uttarakhand',
    'WB': 'West Bengal'
  };
  
  return states[stateCode] || 'Unknown';
}