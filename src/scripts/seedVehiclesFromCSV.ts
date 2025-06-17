import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { parse } from 'papaparse';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Map vehicle type from CSV format (e.g., '4W') to database enum value
function mapVehicleType(csvType: string): 'truck' | 'tempo' | 'trailer' {
  const type = csvType.trim().toUpperCase();
  if (type === '3W') return 'tempo';
  if (type === '4W') return 'pickup';
  // 6W, 8W, 10W, 12W, 14W, 16W all map to truck
  return 'truck';
}

// Map fuel type from CSV to database enum value
function mapFuelType(csvFuelType: string): 'diesel' | 'petrol' | 'cng' {
  const type = csvFuelType.trim().toLowerCase();
  if (type === 'petrol') return 'petrol';
  if (type === 'cng') return 'cng';
  // Default to diesel
  return 'diesel';
}

async function seedVehiclesFromCSV() {
  console.log('Starting vehicle import from CSV data...');
  
  // The CSV data provided in the prompt
  const csvData = `vehicle_number,chassis_number,engine_number,make,model,year,vehicle_type,fuel_type,tyre_size,number_of_tyres,registration_date,rc_expiry_date,current_odometer,status,insurance_policy_number,insurer_name,insurance_start_date,insurance_expiry_date,premium_amount,idv_amount,fitness_certificate_number,fitness_issue_date,fitness_expiry_date,fitness_cost,tax_receipt_number,tax_amount,tax_period,tax_scope,tax_expiry_date,permit_number,issuing_state,permit_type,permit_issue_date,permit_expiry_date,permit_cost,puc_certificate_number,puc_issue_date,puc_expiry_date,puc_cost,service_reminder_enabled,service_reminder_contact,service_reminder_days_before,service_reminder_km_before
GJ06LM1134,CHS627748J,ENG231633K,Tata,Tata Ace,2023,4W,Diesel,215/75 R15,4,2023-06-19,2033-06-16,209855,Active,POL2542923,ICICI Lombard,2025-01-30,2026-01-30,29834,711870,FC3886849,2023-06-19,2025-06-18,1247,TR5375080,9569,Monthly,State,2026-04-30,PER1702892,GJ,State,2023-06-19,2024-06-18,19597,PUC5317834,2025-01-30,2026-01-30,470,True,Auto Alert,14,5000
UP32XR7596,CHS741265M,ENG183919T,Piaggio,Piaggio Ape,2025,3W,Diesel,215/75 R15,3,2025-05-29,2035-05-27,261795,Active,POL5431082,ICICI Lombard,2024-12-29,2025-12-29,38876,1196114,FC7997566,2025-05-29,2027-05-29,1307,TR6949749,4223,Quarterly,National,2026-03-29,PER9104863,UP,National,2025-05-29,2030-05-28,13081,PUC2215116,2024-12-29,2025-12-29,716,True,Auto Alert,14,5000
KA01PD1093,CHS456036X,ENG260228I,Tata,Tata 1109,2024,6W,Diesel,215/75 R15,6,2024-06-20,2034-06-18,54852,Active,POL9017435,New India Assurance,2025-04-01,2026-04-01,35734,1597700,FC5114163,2024-06-20,2026-06-20,2159,TR2202422,3691,Quarterly,State,2026-06-30,PER3037819,KA,State,2024-06-20,2029-06-19,16551,PUC8166535,2025-04-01,2026-04-01,232,True,Auto Alert,14,5000
UP32XR3405,CHS634193S,ENG636943O,BharatBenz,BharatBenz 3123R,2023,12W,Diesel,215/75 R15,12,2023-09-27,2033-09-24,228971,Active,POL8385051,HDFC Ergo,2025-05-10,2026-05-10,36865,642249,FC8262001,2023-09-27,2025-09-26,2269,TR7560759,11737,Annually,National,2026-08-08,PER2965027,UP,National,2023-09-27,2024-09-26,19787,PUC6991668,2025-05-10,2026-05-10,584,True,Auto Alert,14,5000
RJ14KT8422,CHS313208S,ENG870893O,Mahindra,Mahindra Jeeto,2024,4W,Diesel,215/75 R15,4,2024-03-17,2034-03-15,82873,Active,POL6819250,ICICI Lombard,2024-10-18,2025-10-18,44015,1635363,FC2368673,2024-03-17,2026-03-17,1488,TR4632218,8606,Monthly,National,2026-01-16,PER9069291,RJ,National,2024-03-17,2025-03-17,5815,PUC4473048,2024-10-18,2025-10-18,206,True,Auto Alert,14,5000
GJ06LM6072,CHS716859H,ENG161347K,Tata,Tata Ace,2024,4W,Diesel,215/75 R15,4,2024-10-24,2034-10-22,269840,Active,POL8785018,New India Assurance,2024-09-11,2025-09-11,25877,1852255,FC3262599,2024-10-24,2026-10-24,2812,TR8459622,4696,Monthly,State,2025-12-10,PER7847093,GJ,State,2024-10-24,2029-10-23,4666,PUC5533190,2024-09-11,2025-09-11,422,True,Auto Alert,14,5000
RJ14KT3832,CHS631476F,ENG384514Z,Mahindra,Mahindra Jeeto,2024,4W,Diesel,215/75 R15,4,2024-03-01,2034-02-27,139132,Active,POL2950104,HDFC Ergo,2024-10-06,2025-10-06,28129,437206,FC8750141,2024-03-01,2026-03-01,1012,TR8063288,7328,Monthly,State,2026-01-04,PER5967310,RJ,State,2024-03-01,2029-02-28,14867,PUC1098134,2024-10-06,2025-10-06,247,True,Auto Alert,14,5000
RJ14KT2019,CHS415673E,ENG258573J,Tata,Tata 1109,2023,6W,Diesel,215/75 R15,6,2023-06-01,2033-05-29,109978,Active,POL1495891,New India Assurance,2025-05-18,2026-05-18,43831,1144164,FC6804277,2023-06-01,2025-05-31,1400,TR7225804,5866,Monthly,National,2026-08-16,PER8813501,RJ,National,2023-06-01,2028-05-30,4152,PUC2573001,2025-05-18,2026-05-18,559,True,Auto Alert,14,5000
MP09BC1158,CHS287625M,ENG397000V,Tata,Tata 1109,2022,6W,Diesel,215/75 R15,6,2022-06-09,2032-06-06,129188,Active,POL6323635,ICICI Lombard,2025-01-14,2026-01-14,26082,684977,FC6122947,2022-06-09,2024-06-08,2505,TR5307373,11464,Monthly,State,2026-04-14,PER7203205,MP,State,2022-06-09,2023-06-09,5373,PUC6355073,2025-01-14,2026-01-14,587,True,Auto Alert,14,5000
CG04NB5969,CHS288673T,ENG702243R,Tata,Tata 1109,2022,6W,Diesel,215/75 R15,6,2022-04-14,2032-04-11,297013,Active,POL6590223,HDFC Ergo,2025-01-29,2026-01-29,25570,1956343,FC6914322,2022-04-14,2024-04-13,1772,TR5654813,3812,Monthly,National,2026-02-28,PER2450916,CG,National,2022-04-14,2027-04-13,12988,PUC3716185,2025-01-29,2026-01-29,428,True,Auto Alert,14,5000
TN22TS2880,CHS593546C,ENG236340L,Tata,Tata 1109,2024,6W,Diesel,215/75 R15,6,2024-08-25,2034-08-23,112230,Active,POL8433330,ICICI Lombard,2025-06-08,2026-06-08,29918,1142414,FC6537133,2024-08-25,2026-08-25,2695,TR9949131,7091,Quarterly,National,2026-07-08,PER2013979,TN,National,2024-08-25,2029-08-24,16054,PUC7961180,2025-06-08,2026-06-08,223,True,Auto Alert,14,5000
RJ14KT9079,CHS284470I,ENG489465U,Tata,Tata 1109,2025,6W,Diesel,215/75 R15,6,2025-06-25,2035-06-23,225321,Active,POL8205708,HDFC Ergo,2024-12-27,2025-12-27,33774,815963,FC9928437,2025-06-25,2027-06-25,2712,TR6733471,9729,Monthly,State,2026-03-27,PER6768323,RJ,State,2025-06-25,2026-06-25,4649,PUC8379833,2024-12-27,2025-12-27,591,True,Auto Alert,14,5000
RJ14KT1069,CHS217262W,ENG144747U,Eicher,Eicher Pro 2059,2023,6W,Diesel,215/75 R15,6,2023-12-20,2033-12-17,143596,Active,POL5584658,HDFC Ergo,2024-08-19,2025-08-19,19720,1210982,FC3435705,2023-12-20,2025-12-19,1906,TR6414304,3407,Quarterly,National,2025-11-17,PER7650570,RJ,National,2023-12-20,2024-12-19,16836,PUC8383689,2024-08-19,2025-08-19,672,True,Auto Alert,14,5000
MH12AV6795,CHS627854T,ENG347687J,Mahindra,Mahindra Jeeto,2023,4W,Diesel,215/75 R15,4,2023-12-29,2033-12-26,70184,Active,POL3287496,ICICI Lombard,2024-09-12,2025-09-12,37026,1186483,FC4064227,2023-12-29,2025-12-28,1820,TR7579853,5091,Monthly,National,2025-10-12,PER8253293,MH,National,2023-12-29,2028-12-27,12077,PUC8256015,2024-09-12,2025-09-12,304,True,Auto Alert,14,5000
RJ14KT5647,CHS364601P,ENG402992G,Tata,Tata LPT 2518,2021,10W,Diesel,215/75 R15,10,2021-06-28,2031-06-26,47171,Active,POL9114126,New India Assurance,2024-11-09,2025-11-09,10260,1871326,FC5910282,2021-06-28,2023-06-28,1496,TR8238415,4288,Annually,State,2026-02-07,PER5023102,RJ,State,2021-06-28,2026-06-27,4157,PUC2972609,2024-11-09,2025-11-09,645,True,Auto Alert,14,5000
KA01PD9064,CHS690789C,ENG265361S,BharatBenz,BharatBenz 3123R,2025,12W,Diesel,215/75 R15,12,2025-01-24,2035-01-22,154064,Active,POL4458035,New India Assurance,2025-05-08,2026-05-08,28114,1894932,FC3841949,2025-01-24,2027-01-24,2122,TR5055432,3757,Quarterly,State,2026-06-07,PER2265451,KA,State,2025-01-24,2030-01-23,5525,PUC9012933,2025-05-08,2026-05-08,452,True,Auto Alert,14,5000
RJ14KT8164,CHS621363B,ENG491165K,Tata,Tata LPT 2518,2021,10W,Diesel,215/75 R15,10,2021-11-19,2031-11-17,96189,Active,POL7066809,ICICI Lombard,2024-08-20,2025-08-20,33668,1324488,FC6046086,2021-11-19,2023-11-19,2142,TR5963637,10810,Quarterly,National,2025-09-19,PER6553261,RJ,National,2021-11-19,2022-11-19,13178,PUC9949680,2024-08-20,2025-08-20,733,True,Auto Alert,14,5000
CG04NB2187,CHS740171G,ENG227140T,Eicher,Eicher Pro 2059,2025,6W,Diesel,215/75 R15,6,2025-08-20,2035-08-18,192806,Active,POL6809520,New India Assurance,2024-10-27,2025-10-27,36649,988656,FC6232503,2025-08-20,2027-08-20,2692,TR7674258,10216,Quarterly,State,2025-11-26,PER9610785,CG,State,2025-08-20,2026-08-20,7593,PUC5365383,2024-10-27,2025-10-27,529,True,Auto Alert,14,5000
GJ06LM6958,CHS374805W,ENG324111B,Tata,Tata LPT 2518,2024,10W,Diesel,215/75 R15,10,2024-04-28,2034-04-26,193594,Active,POL9337605,HDFC Ergo,2025-05-26,2026-05-26,29377,1500754,FC4229640,2024-04-28,2026-04-28,2563,TR9047441,3997,Annually,State,2027-05-26,PER5531029,GJ,State,2024-04-28,2025-04-28,8300,PUC7612433,2025-05-26,2026-05-26,774,True,Auto Alert,14,5000
MH12AV1260,CHS232717L,ENG125448L,Ashok Leyland,Ashok Leyland 1618,2023,8W,Diesel,215/75 R15,8,2023-07-06,2033-07-03,147449,Active,POL1935252,ICICI Lombard,2024-07-12,2025-07-12,32642,1853908,FC3642870,2023-07-06,2025-07-05,1480,TR4254720,10435,Quarterly,State,2025-08-11,PER1924524,MH,State,2023-07-06,2028-07-04,19913,PUC6981534,2024-07-12,2025-07-12,649,True,Auto Alert,14,5000
UP32XR4945,CHS715759N,ENG161193U,BharatBenz,BharatBenz 3123R,2025,12W,Diesel,215/75 R15,12,2025-04-09,2035-04-07,291381,Active,POL6181630,New India Assurance,2025-06-04,2026-06-04,39781,1858364,FC4840400,2025-04-09,2027-04-09,1969,TR7824786,7941,Quarterly,National,2027-06-04,PER1364169,UP,National,2025-04-09,2030-04-08,5086,PUC9504058,2025-06-04,2026-06-04,710,True,Auto Alert,14,5000
RJ14KT5317,CHS616527G,ENG125760G,Tata,Tata Ace,2021,4W,Diesel,215/75 R15,4,2021-02-07,2031-02-05,239831,Active,POL1723394,New India Assurance,2024-12-04,2025-12-04,11767,1582985,FC4326742,2021-02-07,2023-02-07,1705,TR6146888,5583,Monthly,State,2026-12-04,PER9962476,RJ,State,2021-02-07,2022-02-07,8468,PUC1009830,2024-12-04,2025-12-04,557,True,Auto Alert,14,5000
GJ06LM3755,CHS997746E,ENG849091P,Tata,Tata 1109,2025,6W,Diesel,215/75 R15,6,2025-08-13,2035-08-11,229058,Active,POL6721407,ICICI Lombard,2024-07-04,2025-07-04,41714,1848642,FC4784554,2025-08-13,2027-08-13,1897,TR5695054,9370,Quarterly,State,2025-08-03,PER6402239,GJ,State,2025-08-13,2030-08-12,19951,PUC9173506,2024-07-04,2025-07-04,330,True,Auto Alert,14,5000
MP09BC7621,CHS104663S,ENG653803Z,AMW,AMW 4923,2025,14W,Diesel,215/75 R15,14,2025-06-18,2035-06-16,274777,Active,POL9069479,ICICI Lombard,2024-08-31,2025-08-31,40760,1266209,FC6637815,2025-06-18,2027-06-18,1014,TR4530751,8195,Quarterly,National,2025-11-29,PER4658031,MP,National,2025-06-18,2026-06-18,17391,PUC7328745,2024-08-31,2025-08-31,482,True,Auto Alert,14,5000
GJ06LM3378,CHS672243O,ENG727383C,Tata,Tata 1109,2024,6W,Diesel,215/75 R15,6,2024-02-14,2034-02-11,145371,Active,POL8569638,HDFC Ergo,2024-10-29,2025-10-29,32683,1838886,FC6865709,2024-02-14,2026-02-13,1609,TR2704084,7688,Quarterly,National,2026-01-27,PER1004797,GJ,National,2024-02-14,2029-02-12,4553,PUC8040982,2024-10-29,2025-10-29,378,True,Auto Alert,14,5000
KA01PD2106,CHS226072G,ENG540419T,Tata,Tata 1109,2022,6W,Diesel,215/75 R15,6,2022-11-11,2032-11-08,203544,Active,POL8639428,New India Assurance,2024-07-18,2025-07-18,9287,1317450,FC7389508,2022-11-11,2024-11-10,2304,TR2485602,4208,Monthly,State,2026-07-18,PER4692681,KA,State,2022-11-11,2027-11-10,7871,PUC9283715,2024-07-18,2025-07-18,418,True,Auto Alert,14,5000
CG04NB4751,CHS900466F,ENG759137W,Tata,Tata 1109,2024,6W,Diesel,215/75 R15,6,2024-07-23,2034-07-21,113354,Active,POL6935710,ICICI Lombard,2025-05-01,2026-05-01,34226,1095445,FC7293876,2024-07-23,2026-07-23,2241,TR3801453,4562,Monthly,State,2026-05-31,PER3729180,CG,State,2024-07-23,2029-07-22,12858,PUC7552257,2025-05-01,2026-05-01,603,True,Auto Alert,14,5000
RJ14KT1612,CHS690263H,ENG489825D,Ashok Leyland,Ashok Leyland 1618,2023,8W,Diesel,215/75 R15,8,2023-09-27,2033-09-24,24232,Active,POL2799653,HDFC Ergo,2025-04-19,2026-04-19,34663,1422840,FC9743218,2023-09-27,2025-09-26,2473,TR2271000,11376,Annually,State,2027-04-19,PER6773144,RJ,State,2023-09-27,2024-09-26,8882,PUC5735899,2025-04-19,2026-04-19,398,True,Auto Alert,14,5000
KA01PD3800,CHS513065T,ENG153361N,Volvo,Volvo FM,2022,16W,Diesel,215/75 R15,16,2022-04-11,2032-04-08,141980,Active,POL5562046,ICICI Lombard,2025-01-23,2026-01-23,12792,1581748,FC1112418,2022-04-11,2024-04-10,2166,TR4017998,8389,Monthly,State,2026-02-22,PER2722771,KA,State,2022-04-11,2027-04-10,11084,PUC9152530,2025-01-23,2026-01-23,282,True,Auto Alert,14,5000
UP32XR2635,CHS888633E,ENG644600W,Tata,Tata 1109,2021,6W,Diesel,215/75 R15,6,2021-06-26,2031-06-24,211246,Active,POL1679237,ICICI Lombard,2025-06-11,2026-06-11,25471,1701667,FC1200303,2021-06-26,2023-06-26,2892,TR3954532,10251,Annually,National,2026-09-09,PER7139252,UP,National,2021-06-26,2026-06-25,4220,PUC9842810,2025-06-11,2026-06-11,364,True,Auto Alert,14,5000`;
  
  // Parse the CSV data
  const { data } = parse(csvData, { header: true, skipEmptyLines: true });
  console.log(`Found ${data.length} vehicles in CSV`);

  // Map CSV data to database schema
  const mappedVehicles = data.map((row: any) => {
    return {
      registration_number: row.vehicle_number,
      chassis_number: row.chassis_number,
      engine_number: row.engine_number,
      make: row.make,
      model: row.model,
      year: parseInt(row.year),
      type: mapVehicleType(row.vehicle_type),
      fuel_type: mapFuelType(row.fuel_type),
      tyre_size: row.tyre_size,
      number_of_tyres: parseInt(row.number_of_tyres),
      registration_date: row.registration_date,
      rc_expiry_date: row.rc_expiry_date,
      current_odometer: parseInt(row.current_odometer),
      status: row.status.toLowerCase(),
      
      // Insurance details
      policy_number: row.insurance_policy_number,
      insurer_name: row.insurer_name,
      insurance_start_date: row.insurance_start_date,
      insurance_expiry_date: row.insurance_expiry_date,
      insurance_premium_amount: parseFloat(row.premium_amount),
      insurance_idv: parseFloat(row.idv_amount),
      insurance_document: false, // No document files in CSV
      
      // Fitness certificate
      fitness_certificate_number: row.fitness_certificate_number,
      fitness_issue_date: row.fitness_issue_date,
      fitness_expiry_date: row.fitness_expiry_date,
      fitness_cost: parseFloat(row.fitness_cost),
      fitness_document: false, // No document files in CSV
      
      // Tax details
      tax_receipt_number: row.tax_receipt_number,
      tax_amount: parseFloat(row.tax_amount),
      tax_period: row.tax_period.toLowerCase(),
      tax_scope: row.tax_scope,
      tax_receipt_document: false, // No document files in CSV
      
      // Permit details
      permit_number: row.permit_number,
      permit_issuing_state: row.issuing_state,
      permit_type: row.permit_type.toLowerCase(),
      permit_issue_date: row.permit_issue_date,
      permit_expiry_date: row.permit_expiry_date,
      permit_cost: parseFloat(row.permit_cost),
      permit_document: false, // No document files in CSV
      
      // PUC details
      puc_certificate_number: row.puc_certificate_number,
      puc_issue_date: row.puc_issue_date,
      puc_expiry_date: row.puc_expiry_date,
      puc_cost: parseFloat(row.puc_cost),
      puc_document: false, // No document files in CSV
      
      // Service reminder
      remind_service: row.service_reminder_enabled === "True",
      service_reminder_days_before: parseInt(row.service_reminder_days_before),
      service_reminder_km: parseInt(row.service_reminder_km_before),
      
      // Default values
      rc_copy: false,
      other_documents: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // Insert the mapped vehicles in batches
  const BATCH_SIZE = 5; // Adjust based on your needs
  
  for (let i = 0; i < mappedVehicles.length; i += BATCH_SIZE) {
    const batch = mappedVehicles.slice(i, i + BATCH_SIZE);
    
    console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(mappedVehicles.length/BATCH_SIZE)}`);
    
    const { data: insertedData, error } = await supabase
      .from('vehicles')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`Error inserting batch ${i/BATCH_SIZE + 1}:`, error);
    } else {
      console.log(`Successfully inserted ${insertedData?.length || 0} vehicles in batch ${Math.floor(i/BATCH_SIZE) + 1}`);
    }
    
    // Small delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('Vehicle import completed!');
  console.log(`Attempted to insert ${mappedVehicles.length} vehicles.`);
}

// Run the seed function
seedVehiclesFromCSV()
  .then(() => {
    console.log('Seed script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });