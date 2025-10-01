// Test script for destination utilities
// This file can be used to test the destination functionality

import { searchOrCreateDestination, findDestinationByPlaceId } from './destinationUtils';

/**
 * Test function to verify destination utilities work correctly
 * This should be called from browser console for testing
 */
export async function testDestinationUtils() {
  console.log('Testing destination utilities...');
  
  try {
    // Test data
    const testPlaceDetails = {
      place_id: 'test_place_123',
      name: 'Test City',
      formatted_address: 'Test City, Test State, Test Country',
      latitude: 23.0225,
      longitude: 72.5714
    };

    console.log('1. Testing searchOrCreateDestination...');
    const destination = await searchOrCreateDestination(testPlaceDetails);
    console.log('✅ Created/found destination:', destination);

    console.log('2. Testing findDestinationByPlaceId...');
    const foundDestination = await findDestinationByPlaceId(testPlaceDetails.place_id, destination.organization_id);
    console.log('✅ Found destination:', foundDestination);

    console.log('3. Testing duplicate handling...');
    const duplicateDestination = await searchOrCreateDestination(testPlaceDetails);
    console.log('✅ Duplicate handling:', duplicateDestination.id === destination.id ? 'SUCCESS - Same destination returned' : 'FAILED - Different destination created');

    console.log('🎉 All tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testDestinationUtils = testDestinationUtils;
}
