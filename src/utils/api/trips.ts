import { supabase, isNetworkError } from '../supabaseClient';
import config from '../env';
import { Trip } from '../../types';
import { getCurrentUserId, withOwner, getUserActiveOrganization } from '../supaHelpers';
import { handleSupabaseError } from '../errors';
import { createLogger } from '../logger';

const logger = createLogger('trips');

// Shri Durga Enterprises organization ID
const SHRI_DURGA_ORG_ID = 'ab6c2178-32f9-4a03-b5ab-d535db827a58';

// Warehouse-specific freight rates for Shri Durga Enterprises
const getFreightRateForWarehouse = async (warehouseId: string): Promise<number | null> => {
  try {
    const { data: warehouse, error } = await supabase
      .from('warehouses')
      .select('name')
      .eq('id', warehouseId)
      .single();

    if (error || !warehouse) return null;

    const warehouseName = warehouse.name.toLowerCase();
    
    if (warehouseName.includes('raipur')) return 2.15;
    if (warehouseName.includes('sambarkur') || warehouseName.includes('sambalpur')) return 2.21;
    if (warehouseName.includes('bilaspur')) return 2.75;
    
    return null;
  } catch (error) {
    logger.error('Error getting freight rate for warehouse:', error);
    return null;
  }
};

export const getTrips = async (): Promise<Trip[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) logger.warn('Network error fetching user for trips, returning empty array');
        return [];
      }
      handleSupabaseError('get user for trips', userError);
      return [];
    }

    if (!user) {
      logger.error('No user authenticated');
      return [];
    }

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      logger.warn('No organization selected for user');
      return [];
    }

    // First get the total count
    const { count, error: countError } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    
    if (countError) {
      logger.error('Error getting trip count:', countError);
    }
    
    const totalCount = count || 0;
    logger.info(`Total trips in database: ${totalCount}`);
    
    // If count is 0, return early
    if (totalCount === 0) {
      return [];
    }
    
    // Fetch ALL trips using pagination to bypass 1000 row limit
    // Supabase PostgREST has a max_rows default of 1000
    // We need to fetch in batches if there are more than 1000 trips
    const BATCH_SIZE = 1000;
    let allTrips: Trip[] = [];
    
    if (totalCount <= BATCH_SIZE) {
      // If total is less than batch size, fetch in one go
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('organization_id', organizationId)
        .order('trip_start_date', { ascending: false })
        .range(0, totalCount - 1);
      
      if (error) {
        handleSupabaseError('fetch trips', error);
        return [];
      }
      
      allTrips = data || [];
    } else {
      // Fetch in batches for large datasets
      const batches = Math.ceil(totalCount / BATCH_SIZE);
      logger.info(`Fetching ${totalCount} trips in ${batches} batches...`);
      
      for (let i = 0; i < batches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE - 1, totalCount - 1);
        
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('organization_id', organizationId)
          .order('trip_start_date', { ascending: false })
          .range(start, end);
        
        if (error) {
          logger.error(`Error fetching batch ${i + 1}:`, error);
          continue;
        }
        
        if (data) {
          allTrips = allTrips.concat(data);
        }
        
        logger.info(`Batch ${i + 1}/${batches}: fetched ${data?.length || 0} trips (total so far: ${allTrips.length})`);
      }
    }
    
    logger.info(`Fetched ${allTrips.length} trips from database (expected: ${totalCount})`);

    return allTrips;
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn('Network error fetching user for trips, returning empty array');
      return [];
    }
    handleSupabaseError('get user for trips', error);
    return [];
  }
};

export const getTrip = async (id: string): Promise<Trip | null> => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    handleSupabaseError('fetch trip', error);
    return null;
  }

  return data;
};

export const createTrip = async (tripData: Omit<Trip, 'id'>): Promise<Trip | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected. Please select an organization.');
    }

    const sanitizedTripData = { ...tripData } as any;
    
    // Extract GPS screenshots before saving trip
    const gpsScreenshots = sanitizedTripData.gps_screenshots || [];
    delete sanitizedTripData.gps_screenshots;
    
    // Remove station field as it's no longer in the database
    delete sanitizedTripData.station;
    
    if (sanitizedTripData.fuel_station_id === '') {
      sanitizedTripData.fuel_station_id = null;
    }
    if (sanitizedTripData.vehicle_id === '') {
      sanitizedTripData.vehicle_id = null;
    }
    if (sanitizedTripData.driver_id === '') {
      sanitizedTripData.driver_id = null;
    }
    if (sanitizedTripData.warehouse_id === '') {
      sanitizedTripData.warehouse_id = null;
    }

    // Auto-populate freight_rate for Shri Durga Enterprises based on warehouse
    if (organizationId === SHRI_DURGA_ORG_ID && sanitizedTripData.warehouse_id) {
      const freightRate = await getFreightRateForWarehouse(sanitizedTripData.warehouse_id);
      if (freightRate && sanitizedTripData.gross_weight) {
        sanitizedTripData.freight_rate = freightRate;
        sanitizedTripData.billing_type = 'per_ton';
        
        // Calculate and round income_amount
        const calculatedIncome = sanitizedTripData.gross_weight * freightRate;
        sanitizedTripData.income_amount = Math.round(calculatedIncome * 100) / 100;
        
        logger.info('Auto-populated freight rate for Shri Durga Enterprises', {
          warehouseId: sanitizedTripData.warehouse_id,
          freightRate,
          grossWeight: sanitizedTripData.gross_weight,
          income: sanitizedTripData.income_amount
        });
      }
    }

    const payload = withOwner({
      ...sanitizedTripData,
      fuel_station_id: sanitizedTripData.fuel_station_id ?? null,
      fuel_expense: sanitizedTripData.fuel_expense || sanitizedTripData.fuel_cost || 0,
      fuel_cost: sanitizedTripData.fuel_cost || sanitizedTripData.fuel_expense || 0,
      // Ensure total_fuel_cost is properly handled
      total_fuel_cost: sanitizedTripData.total_fuel_cost || 0,
    }, userId, organizationId);

    const { data, error } = await supabase
      .from('trips')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('create trip', error);
      throw error;
    }

    // Handle GPS screenshots if provided
    if (data && gpsScreenshots.length > 0) {
      await handleGPSScreenshots(data.id, gpsScreenshots);
    }

    return data;
  } catch (error) {
    handleSupabaseError('create trip', error);
    throw error;
  }
};

// Helper function to handle GPS screenshots
const handleGPSScreenshots = async (tripId: string, screenshots: any[]) => {
  console.log('🖼️ handleGPSScreenshots called with:', { tripId, screenshotsCount: screenshots?.length });
  
  if (!screenshots || screenshots.length === 0) {
    console.log('⚠️ No screenshots to process');
    return;
  }

  for (const screenshot of screenshots) {
    console.log('📸 Processing screenshot:', { hasId: !!screenshot.id, hasFile: !!screenshot.file, hasUrl: !!screenshot.image_url });
    
    // Skip if already saved (has an id)
    if (screenshot.id) {
      console.log('✅ Screenshot already saved, skipping');
      continue;
    }

    // If screenshot has a file, it needs to be uploaded
    if (screenshot.file) {
      try {
        const fileExt = screenshot.file.name.split('.').pop();
        const fileName = `${tripId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `gps-screenshots/${fileName}`;

        console.log('📤 Uploading to storage:', filePath);

        const { error: uploadError } = await supabase.storage
          .from('trip-documents')
          .upload(filePath, screenshot.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Error uploading GPS screenshot:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('trip-documents')
          .getPublicUrl(filePath);

        console.log('✅ Upload successful, saving to database:', publicUrl);

        // Save to database
        const { data, error: dbError } = await supabase
          .from('trip_gps_screenshots')
          .insert({
            trip_id: tripId,
            image_url: publicUrl,
            caption: screenshot.caption || ''
          })
          .select()
          .single();

        if (dbError) {
          console.error('❌ Error saving to database:', dbError);
        } else {
          console.log('✅ Saved to database:', data);
        }
      } catch (error) {
        console.error('❌ Error saving GPS screenshot:', error);
      }
    } else if (screenshot.image_url && !screenshot.id) {
      console.log('💾 Saving URL to database:', screenshot.image_url);
      // If screenshot has URL but no id, save to database
      const { error } = await supabase
        .from('trip_gps_screenshots')
        .insert({
          trip_id: tripId,
          image_url: screenshot.image_url,
          caption: screenshot.caption || ''
        });
      
      if (error) {
        console.error('❌ Error saving screenshot URL:', error);
      } else {
        console.log('✅ Screenshot URL saved');
      }
    }
  }
  
  console.log('🎉 Finished processing all screenshots');
};

export const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip | null> => {
  try {
    console.log('🔄 updateTrip called with:', { id, hasGpsScreenshots: !!updates.gps_screenshots });
    
    const updateData = { ...updates } as any;
    
    // Extract GPS screenshots before updating trip
    const gpsScreenshots = updateData.gps_screenshots || [];
    console.log('📸 GPS Screenshots found:', gpsScreenshots.length, gpsScreenshots);
    delete updateData.gps_screenshots;
    
    // Remove station field as it's no longer in the database
    delete updateData.station;
    
    // Get organization ID from existing trip if not provided
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected. Please select an organization.');
    }

    // Auto-populate freight_rate for Shri Durga Enterprises if warehouse is being updated
    if (organizationId === SHRI_DURGA_ORG_ID && updateData.warehouse_id) {
      const freightRate = await getFreightRateForWarehouse(updateData.warehouse_id);
      
      // Get existing trip data if needed
      const { data: existingTrip } = await supabase
        .from('trips')
        .select('gross_weight')
        .eq('id', id)
        .single();
      
      const grossWeight = updateData.gross_weight ?? existingTrip?.gross_weight;
      
      if (freightRate && grossWeight) {
        updateData.freight_rate = freightRate;
        updateData.billing_type = 'per_ton';
        
        // Calculate and round income_amount
        const calculatedIncome = grossWeight * freightRate;
        updateData.income_amount = Math.round(calculatedIncome * 100) / 100;
        
        logger.info('Auto-populated freight rate for Shri Durga Enterprises on update', {
          warehouseId: updateData.warehouse_id,
          freightRate,
          grossWeight,
          income: updateData.income_amount
        });
      }
    }
    
    const { data, error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('update trip', error);
      throw error;
    }

    console.log('✅ Trip updated, now handling screenshots...');

    // Handle GPS screenshots if provided
    if (data && gpsScreenshots.length > 0) {
      console.log('🖼️ Calling handleGPSScreenshots...');
      await handleGPSScreenshots(id, gpsScreenshots);
    } else {
      console.log('⚠️ No screenshots to handle');
    }

    return data;
  } catch (error) {
    console.error('❌ Error in updateTrip:', error);
    handleSupabaseError('update trip', error);
    throw error;
  }
};

export const deleteTrip = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete trip', error);
    return false;
  }

  return true;
};