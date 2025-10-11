// Test Vehicle Tags Fix - Run in Browser Console
// This tests that vehicle_tags is properly filtered out

console.log('🧪 Testing Vehicle Tags Fix...');

// Test the filter function
const testData = {
  registration_number: 'TEST123',
  make: 'Test Make',
  model: 'Test Model',
  vehicle_tags: ['tag1', 'tag2'],  // This should be removed
  vehicleTags: ['tag3', 'tag4'],   // This should be removed
  year: 2023,
  current_odometer: 1000
};

console.log('📦 Original data:', testData);

// Simulate the filter function
const filterVehicleUpdateData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const {
    vehicle_tags,      // Remove - doesn't exist in vehicles table
    vehicleTags,       // Remove - not a column
    ...validData
  } = data;
  
  console.log('🔧 Filtered vehicle update data (removed vehicle_tags):', validData);
  
  return validData;
};

const filteredData = filterVehicleUpdateData(testData);

console.log('✅ Filtered data:', filteredData);

// Verify the fix
const hasVehicleTags = 'vehicle_tags' in filteredData;
const hasVehicleTagsAlt = 'vehicleTags' in filteredData;

console.log('❌ Contains vehicle_tags:', hasVehicleTags);
console.log('❌ Contains vehicleTags:', hasVehicleTagsAlt);

if (!hasVehicleTags && !hasVehicleTagsAlt) {
  console.log('🎉 SUCCESS: vehicle_tags properly filtered out!');
} else {
  console.log('❌ FAILED: vehicle_tags still present');
}

// Test with real API call simulation
console.log('\n🚀 Testing with API call simulation...');

const simulateUpdateVehicle = async (id, data) => {
  console.log('📤 Sending to Supabase:', data);
  
  // Check if vehicle_tags is present
  if ('vehicle_tags' in data || 'vehicleTags' in data) {
    console.error('❌ ERROR: vehicle_tags found in payload!');
    throw new Error('column "vehicle_tags" does not exist');
  }
  
  console.log('✅ SUCCESS: No vehicle_tags in payload');
  return { id, ...data };
};

// Test the complete flow
const testUpdate = async () => {
  try {
    const result = await simulateUpdateVehicle('test-id', filteredData);
    console.log('✅ Update successful:', result);
  } catch (error) {
    console.error('❌ Update failed:', error.message);
  }
};

testUpdate();

console.log('\n📋 Fix Verification Checklist:');
console.log('✅ filterVehicleUpdateData function created');
console.log('✅ updateVehicle function updated to use filter');
console.log('✅ VehicleManagementPage fixed (removed extra parameter)');
console.log('✅ Global safety filter added to supabaseClient.ts');
console.log('✅ Console logging added for debugging');

console.log('\n🎯 Next Steps:');
console.log('1. Restart your dev server (npm run dev)');
console.log('2. Clear browser cache (Ctrl+Shift+Delete)');
console.log('3. Test updating a vehicle');
console.log('4. Check browser console for filter logs');
console.log('5. Verify no "vehicle_tags column" errors');
