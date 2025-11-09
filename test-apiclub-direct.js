// Direct test of API Club credentials
// This tests the API without going through the Edge Function

async function testAPIClubDirect() {
  // These should match your APICLUB_URL, APICLUB_KEY, APICLUB_XID from Supabase secrets
  // You'll need to replace these with the actual values from your Supabase dashboard

  const apiUrl = 'YOUR_APICLUB_URL_HERE'; // e.g., 'https://api.apiclub.in/api/v1/vehicle-rc'
  const apiKey = 'YOUR_APICLUB_KEY_HERE';
  const apiXid = 'YOUR_APICLUB_XID_HERE';

  console.log('\n=== TESTING API CLUB DIRECTLY ===');
  console.log('API URL:', apiUrl);
  console.log('Has API Key:', apiKey ? '✅ Yes' : '❌ No');
  console.log('Has XID:', apiXid ? '✅ Yes' : '❌ No');

  if (apiUrl.includes('YOUR_') || apiKey.includes('YOUR_') || apiXid.includes('YOUR_')) {
    console.log('\n⚠️  ERROR: Please update this script with your actual API Club credentials');
    console.log('Get them from: https://supabase.com/dashboard/project/oosrmuqfcqtojflruhww/settings/functions');
    return;
  }

  console.log('\n=== REQUEST DETAILS ===');
  const requestBody = {
    vehicleNumber: 'CG04NC4622'
  };
  console.log('Request Body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'secretKey': apiKey,
        'clientId': apiXid
      },
      body: JSON.stringify(requestBody)
    });

    console.log('\n=== RESPONSE ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('\n=== RAW RESPONSE ===');
    console.log(responseText);

    try {
      const data = JSON.parse(responseText);
      console.log('\n=== PARSED JSON ===');
      console.log(JSON.stringify(data, null, 2));

      if (data.code) {
        console.log('\n=== API RESPONSE CODE ===');
        console.log('Code:', data.code);
        console.log('Message:', data.message || 'No message');
      }

      if (data.data) {
        console.log('\n=== VEHICLE DATA RECEIVED ===');
        console.log('Fields:', Object.keys(data.data));
      }
    } catch (e) {
      console.log('\n⚠️  Response is not valid JSON');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Full error:', error);
  }
}

testAPIClubDirect();
