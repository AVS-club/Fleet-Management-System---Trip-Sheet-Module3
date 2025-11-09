// Test the Edge Function with second test vehicle
async function testRCFetch() {
  const response = await fetch(
    'https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/fetch-rc-details',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc3JtdXFmY3F0b2pmbHJ1aHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxODkyNjUsImV4cCI6MjA2Mzc2NTI2NX0.-TH-8tVoA4WOkco_I2WDQlchjZga4FvwiLZevw0jjCE'
      },
      body: JSON.stringify({
        registration_number: 'CG04AB1234'
      })
    }
  );

  const data = await response.json();
  console.log('\n=== TEST RESULT (CG04AB1234) ===');
  console.log('Status:', response.status);
  console.log('Success:', data.success);
  console.log('Message:', data.message);
  if (data.data?.response) {
    console.log('\n=== VEHICLE DATA ===');
    console.log('Registration:', 'CG04AB1234');
    console.log('Brand:', data.data.response.brand_name);
    console.log('Model:', data.data.response.brand_model);
    console.log('Owner:', data.data.response.owner_name);
    console.log('Fuel Type:', data.data.response.fuel_type);
    console.log('Registration Date:', data.data.response.registration_date);
    console.log('Insurance Expiry:', data.data.response.insurance_expiry);
  }
  console.log('\n=== FULL RESPONSE ===');
  console.log(JSON.stringify(data, null, 2));
}

testRCFetch();
