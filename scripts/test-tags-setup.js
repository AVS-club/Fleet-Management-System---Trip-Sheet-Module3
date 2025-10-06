// Test script to verify tags system setup
// Run this after applying the database migration

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTagsSetup() {
  console.log('🧪 Testing Vehicle Tags System Setup...\n');

  try {
    // Test 1: Check if tags table exists and is accessible
    console.log('1. Testing tags table access...');
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .limit(1);
    
    if (tagsError) {
      console.error('❌ Tags table error:', tagsError.message);
      return;
    }
    console.log('✅ Tags table accessible');

    // Test 2: Check if vehicle_tags table exists and is accessible
    console.log('2. Testing vehicle_tags table access...');
    const { data: vehicleTags, error: vehicleTagsError } = await supabase
      .from('vehicle_tags')
      .select('*')
      .limit(1);
    
    if (vehicleTagsError) {
      console.error('❌ Vehicle_tags table error:', vehicleTagsError.message);
      return;
    }
    console.log('✅ Vehicle_tags table accessible');

    // Test 3: Check if vehicle_tag_history table exists and is accessible
    console.log('3. Testing vehicle_tag_history table access...');
    const { data: history, error: historyError } = await supabase
      .from('vehicle_tag_history')
      .select('*')
      .limit(1);
    
    if (historyError) {
      console.error('❌ Vehicle_tag_history table error:', historyError.message);
      return;
    }
    console.log('✅ Vehicle_tag_history table accessible');

    // Test 4: Test the get_vehicles_with_tags function
    console.log('4. Testing get_vehicles_with_tags function...');
    const { data: vehiclesWithTags, error: functionError } = await supabase
      .rpc('get_vehicles_with_tags');
    
    if (functionError) {
      console.error('❌ get_vehicles_with_tags function error:', functionError.message);
      return;
    }
    console.log('✅ get_vehicles_with_tags function accessible');

    console.log('\n🎉 All tests passed! Vehicle Tags System is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Create some tags in the admin interface');
    console.log('2. Assign tags to vehicles');
    console.log('3. Test the tag management features');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTagsSetup();
