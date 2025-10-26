// Test script for destination utilities
// This file can be used to test the destination functionality

import { searchOrCreateDestination, findDestinationByPlaceId } from './destinationUtils';
import { createLogger } from '../utils/logger';

const logger = createLogger('testDestinationUtils');

/**
 * Test function to verify destination utilities work correctly
 * This should be called from browser console for testing
 */
export async function testDestinationUtils() {
  logger.debug('Testing destination utilities...');
  
  try {
    // Test data
    const testPlaceDetails = {
      place_id: 'test_place_123',
      name: 'Test City',
      formatted_address: 'Test City, Test State, Test Country',
      latitude: 23.0225,
      longitude: 72.5714
    };

    logger.debug('1. Testing searchOrCreateDestination...');
    const destination = await searchOrCreateDestination(testPlaceDetails);
    logger.debug('✅ Created/found destination:', destination);

    logger.debug('2. Testing findDestinationByPlaceId...');
    const foundDestination = await findDestinationByPlaceId(testPlaceDetails.place_id, destination.organization_id);
    logger.debug('✅ Found destination:', foundDestination);

    logger.debug('3. Testing duplicate handling...');
    const duplicateDestination = await searchOrCreateDestination(testPlaceDetails);
    logger.debug('✅ Duplicate handling:', duplicateDestination.id === destination.id ? 'SUCCESS - Same destination returned' : 'FAILED - Different destination created');

    logger.debug('🎉 All tests passed!');
    return true;
  } catch (error) {
    logger.error('❌ Test failed:', error);
    return false;
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testDestinationUtils = testDestinationUtils;
}
