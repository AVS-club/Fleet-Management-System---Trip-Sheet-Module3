import { supabase } from './supabaseClient';
import { createLogger } from './logger';
import { getCurrentUserId, getUserActiveOrganization, withOwner } from './supaHelpers';
import { 
  getVendors as getVendorsFromCache,
  saveVendorsToCache,
  clearVendorCache 
} from './vendorSync';

const logger = createLogger('vendorStorage');

export interface Vendor {
  id: string;
  vendor_name: string;
  vendor_type?: 'garage' | 'spare_parts' | 'service_center' | 'freelance' | 'other';
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  specializations?: string[];
  rating?: number;
  active?: boolean;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all vendors for the current organization with caching
 */
export const getVendors = async (forceRefresh: boolean = false): Promise<Vendor[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.warn('No user ID found, returning empty vendors');
      return [];
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      logger.warn('No organization found, returning empty vendors');
      return [];
    }

    // Check cache first unless forced refresh
    if (!forceRefresh) {
      const cachedVendors = getVendorsFromCache();
      if (cachedVendors && cachedVendors.length > 0) {
        logger.debug(`Returning ${cachedVendors.length} vendors from cache`);
        // Map the cached vendors to the expected format
        return cachedVendors.map(v => ({
          id: v.id,
          vendor_name: v.name || v.vendor_name,
          vendor_type: v.vendor_type,
          contact_person: v.contact || v.contact_person,
          phone: v.phone,
          email: v.email,
          address: v.address,
          gst_number: v.gst_number,
          specializations: [],
          rating: 0,
          active: v.active !== false,
          organization_id: organizationId,
          created_at: v.created_at,
          updated_at: v.updated_at
        } as Vendor));
      }
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('maintenance_vendors')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('vendor_name', { ascending: true });

    if (error) {
      logger.error('Error fetching vendors:', error);
      // Try cache as fallback
      const cachedVendors = getVendorsFromCache();
      if (cachedVendors) {
        logger.warn('Using cached vendors due to database error');
        return cachedVendors.map(v => ({
          id: v.id,
          vendor_name: v.name || v.vendor_name,
          vendor_type: v.vendor_type,
          contact_person: v.contact || v.contact_person,
          phone: v.phone,
          email: v.email,
          address: v.address,
          gst_number: v.gst_number,
          specializations: [],
          rating: 0,
          active: v.active !== false,
          organization_id: organizationId,
          created_at: v.created_at,
          updated_at: v.updated_at
        } as Vendor));
      }
      return [];
    }

    logger.debug(`Fetched ${data?.length || 0} vendors from database`);
    
    // Save to cache in compatible format
    if (data && data.length > 0) {
      const cacheFormat = data.map(v => ({
        id: v.id,
        name: v.vendor_name,
        contact: v.contact_person,
        phone: v.phone,
        email: v.email,
        address: v.address,
        gst_number: v.gst_number,
        vendor_type: v.vendor_type,
        active: v.active,
        created_at: v.created_at,
        updated_at: v.updated_at,
        organization_id: v.organization_id,
        created_by: v.created_by
      }));
      saveVendorsToCache(cacheFormat);
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getVendors:', error);
    return [];
  }
};

/**
 * Create a new vendor
 */
export const createVendor = async (
  vendorData: Omit<Vendor, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
): Promise<Vendor | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected');
    }

    const payload = withOwner(
      {
        ...vendorData,
        active: vendorData.active !== undefined ? vendorData.active : true,
      },
      userId,
      organizationId
    );

    const { data, error } = await supabase
      .from('maintenance_vendors')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error('Error creating vendor:', error);
      throw error;
    }

    logger.debug('Vendor created successfully:', data);
    // Clear cache to force refresh on next fetch
    clearVendorCache();
    return data;
  } catch (error) {
    logger.error('Error in createVendor:', error);
    throw error;
  }
};

/**
 * Create vendor from simple name (convenience function)
 */
export const createVendorFromName = async (vendorName: string): Promise<Vendor | null> => {
  try {
    if (!vendorName || vendorName.trim() === '') {
      throw new Error('Vendor name is required');
    }

    return await createVendor({
      vendor_name: vendorName.trim(),
      // vendor_type removed - let database use default or allow NULL
      // The enum values don't include 'other', so we omit this field
    });
  } catch (error) {
    logger.error('Error in createVendorFromName:', error);
    throw error;
  }
};

/**
 * Update an existing vendor
 */
export const updateVendor = async (
  vendorId: string,
  updates: Partial<Omit<Vendor, 'id' | 'organization_id' | 'created_at'>>
): Promise<Vendor | null> => {
  try {
    const { data, error } = await supabase
      .from('maintenance_vendors')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating vendor:', error);
      throw error;
    }

    logger.debug('Vendor updated successfully:', data);
    return data;
  } catch (error) {
    logger.error('Error in updateVendor:', error);
    throw error;
  }
};

/**
 * Get vendor by ID
 */
export const getVendorById = async (vendorId: string): Promise<Vendor | null> => {
  try {
    const { data, error } = await supabase
      .from('maintenance_vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (error) {
      logger.error('Error fetching vendor by ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in getVendorById:', error);
    return null;
  }
};

/**
 * Search vendors by name
 */
export const searchVendors = async (searchTerm: string): Promise<Vendor[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      return [];
    }

    const { data, error } = await supabase
      .from('maintenance_vendors')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .ilike('vendor_name', `%${searchTerm}%`)
      .order('vendor_name', { ascending: true });

    if (error) {
      logger.error('Error searching vendors:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in searchVendors:', error);
    return [];
  }
};
