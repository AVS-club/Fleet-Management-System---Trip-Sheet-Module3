import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://oosrmuqfcqtojflruhww.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc3JtdXFmY3F0b2pmbHJ1aHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxODkyNjUsImV4cCI6MjA2Mzc2NTI2NX0.-TH-8tVoA4WOkco_I2WDQlchjZga4FvwiLZevw0jjCE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDriverDatabase() {
  console.log('🔍 Checking drivers in database...\n');

  try {
    // First, check if we can query the table at all
    console.log('   Checking table access...');

    const { count, error: countError } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error checking table:', countError);
      console.log('\n💡 This is likely due to RLS (Row Level Security) policies.');
      console.log('   The script needs to be run with service role key or authenticated user.');
      return;
    }

    console.log(`   Total drivers in table: ${count}\n`);

    // Get all drivers with their photo URLs
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id, name, driver_photo_url, license_number')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching drivers:', error);
      return;
    }

    if (!drivers || drivers.length === 0) {
      console.log('⚠️  No drivers found in database');
      return;
    }

    console.log(`✅ Found ${drivers.length} drivers in database:\n`);

    let withPhoto = 0;
    let withDataUrl = 0;
    let withStoragePath = 0;
    let withNull = 0;

    drivers.forEach((driver, index) => {
      const photoUrl = driver.driver_photo_url;
      let photoStatus = '❌ NULL/Empty';

      if (photoUrl) {
        if (photoUrl.startsWith('data:')) {
          photoStatus = '📊 Data URL (base64)';
          withDataUrl++;
        } else if (photoUrl.startsWith('http')) {
          photoStatus = '🌐 Full URL';
          withPhoto++;
        } else {
          photoStatus = `📁 Storage path: ${photoUrl}`;
          withStoragePath++;
        }
        withPhoto++;
      } else {
        withNull++;
      }

      console.log(`${index + 1}. ${driver.name} (${driver.license_number || 'No license'})`);
      console.log(`   Photo: ${photoStatus}`);
      if (photoUrl && photoUrl.length > 100) {
        console.log(`   Length: ${photoUrl.length} chars (${photoUrl.startsWith('data:') ? 'truncated' : 'full'})`);
      }
      console.log('');
    });

    console.log('📊 Summary:');
    console.log(`   Total drivers: ${drivers.length}`);
    console.log(`   With photos: ${withPhoto}`);
    console.log(`   - Data URLs: ${withDataUrl}`);
    console.log(`   - Storage paths: ${withStoragePath}`);
    console.log(`   Without photos: ${withNull}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDriverDatabase();
