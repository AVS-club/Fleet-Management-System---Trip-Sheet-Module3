/**
 * Vendor Sync Service
 * Handles synchronization between localStorage and Supabase database
 * Ensures vendor data consistency across the application
 */

import { supabase } from './supabaseClient';
import { getCurrentUserId, getUserActiveOrganization } from './supaHelpers';
import { createLogger } from './logger';

const logger = createLogger('vendorSync');

export interface Vendor {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  vendor_type?: 'purchase' | 'labor' | 'both';
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  organization_id?: string;
  created_by?: string;
}

const VENDOR_CACHE_KEY = 'vendors_cache';
const VENDOR_CACHE_TIMESTAMP = 'vendors_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get vendors from database with proper organization context
 */
export async function fetchVendorsFromDatabase(): Promise<Vendor[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.warn('No user authenticated, returning empty vendors');
      return [];
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      logger.warn('No organization selected, returning empty vendors');
      return [];
    }

    const { data, error } = await supabase
      .from('maintenance_vendors')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('vendor_name', { ascending: true });

    if (error) {
      logger.error('Error fetching vendors from database:', error);
      throw error;
    }

    // Map database columns to interface
    return (data || []).map(vendor => ({
      ...vendor,
      name: vendor.vendor_name || vendor.name,
      contact: vendor.contact_person || vendor.contact,
    }));
  } catch (error) {
    logger.error('Failed to fetch vendors:', error);
    throw error;
  }
}

/**
 * Get vendors from localStorage cache
 */
export function getVendorsFromCache(): Vendor[] | null {
  try {
    const cachedData = localStorage.getItem(VENDOR_CACHE_KEY);
    const cacheTimestamp = localStorage.getItem(VENDOR_CACHE_TIMESTAMP);

    if (!cachedData || !cacheTimestamp) {
      return null;
    }

    const timestamp = parseInt(cacheTimestamp, 10);
    const now = Date.now();

    // Check if cache is expired
    if (now - timestamp > CACHE_DURATION) {
      logger.debug('Vendor cache expired');
      clearVendorCache();
      return null;
    }

    return JSON.parse(cachedData);
  } catch (error) {
    logger.error('Error reading vendor cache:', error);
    clearVendorCache();
    return null;
  }
}

/**
 * Save vendors to localStorage cache
 */
export function saveVendorsToCache(vendors: Vendor[]): void {
  try {
    localStorage.setItem(VENDOR_CACHE_KEY, JSON.stringify(vendors));
    localStorage.setItem(VENDOR_CACHE_TIMESTAMP, Date.now().toString());
    logger.debug(`Saved ${vendors.length} vendors to cache`);
  } catch (error) {
    logger.error('Error saving vendors to cache:', error);
  }
}

/**
 * Clear vendor cache
 */
export function clearVendorCache(): void {
  try {
    localStorage.removeItem(VENDOR_CACHE_KEY);
    localStorage.removeItem(VENDOR_CACHE_TIMESTAMP);
    logger.debug('Vendor cache cleared');
  } catch (error) {
    logger.error('Error clearing vendor cache:', error);
  }
}

/**
 * Get vendors with smart caching strategy
 */
export async function getVendors(forceRefresh: boolean = false): Promise<Vendor[]> {
  try {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cachedVendors = getVendorsFromCache();
      if (cachedVendors) {
        logger.debug(`Returning ${cachedVendors.length} vendors from cache`);
        return cachedVendors;
      }
    }

    // Fetch from database
    logger.debug('Fetching vendors from database');
    const vendors = await fetchVendorsFromDatabase();
    
    // Update cache
    saveVendorsToCache(vendors);
    
    return vendors;
  } catch (error) {
    logger.error('Error getting vendors:', error);
    
    // Fallback to cache if database fails
    const cachedVendors = getVendorsFromCache();
    if (cachedVendors) {
      logger.warn('Database failed, using cached vendors');
      return cachedVendors;
    }
    
    // Return empty array as last resort
    return [];
  }
}

/**
 * Create a new vendor
 */
export async function createVendor(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected');
    }

    // Check for duplicate vendor name
    const existingVendors = await getVendors();
    const duplicate = existingVendors.find(
      v => v.name.toLowerCase() === vendor.name.toLowerCase()
    );
    
    if (duplicate) {
      throw new Error(`Vendor "${vendor.name}" already exists`);
    }

    const { data, error } = await supabase
      .from('maintenance_vendors')
      .insert({
        vendor_name: vendor.name,
        contact_person: vendor.contact,
        phone: vendor.phone,
        email: vendor.email,
        address: vendor.address,
        gst_number: vendor.gst_number,
        vendor_type: vendor.vendor_type,
        organization_id: organizationId,
        created_by: userId,
        active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating vendor:', error);
      throw error;
    }

    // Clear cache to force refresh on next fetch
    clearVendorCache();
    
    // Map database columns to interface
    const mappedVendor = {
      ...data,
      name: data.vendor_name || data.name,
      contact: data.contact_person || data.contact,
    };
    
    logger.info(`Created vendor: ${mappedVendor.name}`);
    return mappedVendor;
  } catch (error) {
    logger.error('Failed to create vendor:', error);
    throw error;
  }
}

/**
 * Update an existing vendor
 */
export async function updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
  try {
    // Remove fields that shouldn't be updated
    const { id: _, created_at, created_by, organization_id, name, contact, ...updateData } = updates;

    const { data, error } = await supabase
      .from('maintenance_vendors')
      .update({
        ...updateData,
        ...(name && { vendor_name: name }),
        ...(contact && { contact_person: contact }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating vendor:', error);
      throw error;
    }

    // Clear cache to force refresh on next fetch
    clearVendorCache();
    
    // Map database columns to interface
    const mappedVendor = {
      ...data,
      name: data.vendor_name || data.name,
      contact: data.contact_person || data.contact,
    };
    
    logger.info(`Updated vendor: ${mappedVendor.name}`);
    return mappedVendor;
  } catch (error) {
    logger.error('Failed to update vendor:', error);
    throw error;
  }
}

/**
 * Delete (soft delete) a vendor
 */
export async function deleteVendor(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('maintenance_vendors')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('Error deleting vendor:', error);
      throw error;
    }

    // Clear cache to force refresh on next fetch
    clearVendorCache();
    
    logger.info(`Soft deleted vendor: ${id}`);
  } catch (error) {
    logger.error('Failed to delete vendor:', error);
    throw error;
  }
}

/**
 * Get vendor by ID
 */
export async function getVendorById(id: string): Promise<Vendor | null> {
  try {
    const vendors = await getVendors();
    return vendors.find(v => v.id === id) || null;
  } catch (error) {
    logger.error('Failed to get vendor by ID:', error);
    return null;
  }
}

/**
 * Get vendor by name (case-insensitive)
 */
export async function getVendorByName(name: string): Promise<Vendor | null> {
  try {
    const vendors = await getVendors();
    return vendors.find(v => v.name.toLowerCase() === name.toLowerCase()) || null;
  } catch (error) {
    logger.error('Failed to get vendor by name:', error);
    return null;
  }
}

/**
 * Convert vendor name to ID
 */
export async function convertVendorNameToId(vendorName: string): Promise<string> {
  try {
    if (!vendorName) {
      return '';
    }

    // Check if it's already a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(vendorName)) {
      return vendorName;
    }

    // Look up vendor by name
    const vendor = await getVendorByName(vendorName);
    if (vendor) {
      return vendor.id;
    }

    // If vendor doesn't exist, create it
    logger.info(`Creating new vendor: ${vendorName}`);
    const newVendor = await createVendor({
      name: vendorName,
      vendor_type: 'both',
    });
    
    return newVendor.id;
  } catch (error) {
    logger.error('Error converting vendor name to ID:', error);
    return '';
  }
}

/**
 * Sync vendors from localStorage to database
 * This is for migration purposes
 */
export async function migrateLocalStorageVendors(): Promise<void> {
  try {
    const localVendors = localStorage.getItem('vendors');
    if (!localVendors) {
      logger.info('No local vendors to migrate');
      return;
    }

    const vendors = JSON.parse(localVendors);
    if (!Array.isArray(vendors)) {
      logger.warn('Invalid local vendors format');
      return;
    }

    logger.info(`Migrating ${vendors.length} vendors from localStorage`);

    for (const vendor of vendors) {
      try {
        // Check if vendor already exists
        const existing = await getVendorByName(vendor.name);
        if (!existing) {
          await createVendor({
            name: vendor.name,
            contact: vendor.contact,
            phone: vendor.phone,
            email: vendor.email,
            address: vendor.address,
            gst_number: vendor.gst_number,
            vendor_type: vendor.type || 'both',
          });
          logger.info(`Migrated vendor: ${vendor.name}`);
        }
      } catch (error) {
        logger.error(`Failed to migrate vendor ${vendor.name}:`, error);
      }
    }

    // Remove old localStorage vendors after successful migration
    localStorage.removeItem('vendors');
    logger.info('Vendor migration completed');
  } catch (error) {
    logger.error('Failed to migrate localStorage vendors:', error);
  }
}

/**
 * Subscribe to vendor changes in real-time
 */
export function subscribeToVendorChanges(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('vendor-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'maintenance_vendors' },
      (payload) => {
        logger.debug('Vendor change detected:', payload.eventType);
        clearVendorCache(); // Clear cache on any change
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
