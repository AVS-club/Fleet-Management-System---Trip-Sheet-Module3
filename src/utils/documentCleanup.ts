// utils/documentCleanup.ts
// Utility functions for cleaning up document paths

import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('documentCleanup');

/**
 * Clean up document paths to ensure consistency
 */
export const cleanupDocumentPaths = async () => {
  logger.debug('Starting document path cleanup...');
  
  try {
    // Fetch all vehicles
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, registration_number, rc_document_url, insurance_document_url, fitness_document_url, tax_document_url, permit_document_url, puc_document_url');
    
    if (vehicleError) {
      logger.error('Error fetching vehicles:', vehicleError);
      return { success: false, error: vehicleError };
    }
    
    if (!vehicles || vehicles.length === 0) {
      logger.debug('No vehicles found');
      return { success: true, updated: 0 };
    }
    
    logger.debug(`Processing ${vehicles.length} vehicles...`);
    let updatedCount = 0;
    
    for (const vehicle of vehicles) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Document fields to check
      const docFields = [
        'rc_document_url',
        'insurance_document_url',
        'fitness_document_url',
        'tax_document_url',
        'permit_document_url',
        'puc_document_url'
      ];
      
      for (const field of docFields) {
        const paths = vehicle[field];
        
        if (paths && Array.isArray(paths)) {
          const cleanedPaths = paths.map(path => cleanPath(path)).filter(p => p !== null);
          
          // Only update if something changed
          if (JSON.stringify(cleanedPaths) !== JSON.stringify(paths)) {
            updates[field] = cleanedPaths.length > 0 ? cleanedPaths : null;
            needsUpdate = true;
          }
        }
      }
      
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update(updates)
          .eq('id', vehicle.id);
        
        if (updateError) {
          logger.error(`Error updating vehicle ${vehicle.registration_number}:`, updateError);
        } else {
          logger.debug(`Updated vehicle ${vehicle.registration_number}`);
          updatedCount++;
        }
      }
    }
    
    logger.debug(`Document path cleanup completed. Updated ${updatedCount} vehicles.`);
    return { success: true, updated: updatedCount };
  } catch (error) {
    logger.error('Cleanup failed:', error);
    return { success: false, error };
  }
};

/**
 * Clean a single path
 */
const cleanPath = (path: string): string | null => {
  if (!path) return null;
  
  // If it's already a clean relative path, return as is
  if (!path.includes('http') && !path.includes('vehicle-docs')) {
    return path;
  }
  
  // Extract the relative path from full URLs
  const patterns = [
    /https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/vehicle-docs\/(.*)/,
    /https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/driver-docs\/(.*)/,
  ];
  
  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Remove bucket prefix if present
  if (path.startsWith('vehicle-docs/')) {
    return path.replace('vehicle-docs/', '');
  }
  if (path.startsWith('driver-docs/')) {
    return path.replace('driver-docs/', '');
  }
  
  return path;
};

/**
 * Verify all document paths are valid
 */
export const verifyDocumentPaths = async () => {
  logger.debug('Verifying document paths...');
  
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, registration_number, rc_document_url, insurance_document_url, fitness_document_url, tax_document_url, permit_document_url, puc_document_url');
  
  if (!vehicles) return [];
  
  const issues: string[] = [];
  
  for (const vehicle of vehicles) {
    const docFields = [
      'rc_document_url',
      'insurance_document_url',
      'fitness_document_url',
      'tax_document_url',
      'permit_document_url',
      'puc_document_url'
    ];
    
    for (const field of docFields) {
      const paths = vehicle[field];
      
      if (paths && Array.isArray(paths)) {
        for (const path of paths) {
          if (path && (path.includes('http') || path.includes('vehicle-docs/'))) {
            issues.push(`Vehicle ${vehicle.registration_number}: ${field} contains full URL or bucket prefix`);
          }
        }
      }
    }
  }
  
  if (issues.length > 0) {
    logger.debug('Found issues:');
    issues.forEach(issue => logger.debug(`  - ${issue}`));
  } else {
    logger.debug('All document paths are valid');
  }
  
  return issues;
};
