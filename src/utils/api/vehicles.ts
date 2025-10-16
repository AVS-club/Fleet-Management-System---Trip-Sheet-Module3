import { supabase, isNetworkError, filterVehicleUpdateData } from '../supabaseClient';
import config from '../env';
import { Vehicle } from '../../types';
import { uploadVehicleDocument } from '../supabaseStorage';
import { getCurrentUserId, withOwner, getUserActiveOrganization } from '../supaHelpers';
import { generateCSV, downloadCSV } from '../csvParser';
import { handleSupabaseError } from '../errors';

// Helper function to check if a value is LTT (Lifetime Tax)
const isLTT = (value: string | null | undefined): boolean => {
  if (!value || typeof value !== 'string') return false;
  const upperValue = value.trim().toUpperCase();
  return ['LTT', 'LIFETIME', 'LIFE TIME', 'LIFE TIME TAX'].includes(upperValue);
};

// Helper function to get future date (10 years from now)
const getFutureDateForLTT = (): string => {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  return futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Define allowed columns for vehicles table
const VEHICLE_COLS = 'id,registration_number,make,model,year,type,fuel_type,current_odometer,status,chassis_number,engine_number,owner_name,tyre_size,number_of_tyres,rc_expiry_date,rc_document_url,insurance_policy_number,insurer_name,insurance_start_date,insurance_expiry_date,insurance_premium_amount,insurance_idv,insurance_document_url,fitness_certificate_number,fitness_issue_date,fitness_expiry_date,fitness_cost,fitness_document_url,tax_receipt_number,tax_amount,tax_period,tax_document_url,permit_number,permit_issuing_state,permit_type,permit_issue_date,permit_expiry_date,permit_cost,permit_document_url,puc_certificate_number,puc_issue_date,puc_expiry_date,puc_cost,puc_document_url,issuing_state,other_documents,registration_date,policy_number,tax_receipt_document,insurance_idv,tax_scope,remind_insurance,insurance_reminder_contact_id,insurance_reminder_days_before,remind_fitness,fitness_reminder_contact_id,fitness_reminder_days_before,remind_puc,puc_reminder_contact_id,puc_reminder_days_before,remind_tax,tax_reminder_contact_id,tax_reminder_days_before,remind_permit,permit_reminder_contact_id,permit_reminder_days_before,remind_service,service_reminder_contact_id,service_reminder_days_before,service_reminder_km,photo_url,financer,vehicle_class,color,cubic_capacity,cylinders,unladen_weight,seating_capacity,emission_norms,noc_details,national_permit_number,national_permit_upto,rc_status,vahan_last_fetched_at,other_info_documents,tax_paid_upto,last_updated_at,added_by,service_interval_km,service_interval_days,created_by,primary_driver_id,organization_id,created_at,updated_at';

// Vehicle CRUD operations
export const getVehicles = async (): Promise<Vehicle[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) console.warn('Network error fetching user for vehicles, returning empty array');
        return [];
      }
      handleSupabaseError('get user for vehicles', userError);
      return [];
    }

    if (!user) {
      console.error('No user authenticated');
      return [];
    }

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      console.warn('No organization selected for user');
      return [];
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        ${VEHICLE_COLS},
        vehicle_tags (
          tags (
            id,
            name,
            slug,
            color_hex,
            description,
            active,
            created_at,
            updated_at
          )
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError('fetch vehicles', error);
      return [];
    }

    // Transform the data to include tags
    const vehiclesWithTags = (data || []).map(vehicle => ({
      ...vehicle,
      tags: vehicle.vehicle_tags?.map((vt: any) => vt.tags).filter(Boolean) || []
    }));

    return vehiclesWithTags;
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) console.warn('Network error fetching user for vehicles, returning empty array');
      return [];
    }
    handleSupabaseError('get user for vehicles', error);
    return [];
  }
};

export const getVehicle = async (id: string): Promise<Vehicle | null> => {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      ${VEHICLE_COLS},
      vehicle_tags (
        tags (
          id,
          name,
          slug,
          color_hex,
          description,
          active,
          created_at,
          updated_at
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    handleSupabaseError('fetch vehicle', error);
    return null;
  }

  // Transform the data to include tags
  const vehicleWithTags = {
    ...data,
    tags: data.vehicle_tags?.map((vt: any) => vt.tags).filter(Boolean) || []
  };

  return vehicleWithTags;
};

export const createVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected. Please select an organization.');
    }

    // Strip UI-only fields and prepare data
    const { documents, selected, ...cleanData } = vehicleData as any;

    // Handle LTT (Lifetime Tax) conversion
    if (isLTT(cleanData.tax_paid_upto)) {
      cleanData.tax_paid_upto = getFutureDateForLTT();
      if (!cleanData.tax_scope || cleanData.tax_scope.trim() === '') {
        cleanData.tax_scope = 'Lifetime Tax (LTT)';
      }
    }

    const payload = withOwner({
      ...cleanData,
      current_odometer: cleanData.current_odometer || 0,
    }, userId, organizationId);

    for (const k of Object.keys(payload)) {
      if (k.endsWith('_file')) {
        delete payload[k];
      }
    }

    for (const key in payload) {
      if (typeof payload[key] === 'string' && payload[key].trim() === '') {
        payload[key] = null;
      }
    }
    const { data, error } = await supabase
      .from('vehicles')
      .insert(payload)
      .select(VEHICLE_COLS)
      .single();

    if (error) {
      handleSupabaseError('create vehicle', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('create vehicle', error);
    throw error;
  }
};

export const updateVehicle = async (id: string, values: any): Promise<Vehicle | null> => {
  try {
    // ✅ CRITICAL FIX: Filter out vehicle_tags before processing
    const filteredValues = filterVehicleUpdateData(values);
    
    // Debug logging for document URLs
    console.log('updateVehicle - received values:', {
      rc_document_url: values.rc_document_url,
      insurance_document_url: values.insurance_document_url,
      fitness_document_url: values.fitness_document_url,
      tax_document_url: values.tax_document_url,
      permit_document_url: values.permit_document_url,
      puc_document_url: values.puc_document_url,
    });
    
    const {
      documents,
      selected,
      stats,
      odometer,
      odometer_km,
      ...rest
    } = filteredValues || {};

    const payload: any = {
      ...rest,
      current_odometer: odometer_km ?? odometer ?? rest.current_odometer,
    };

    // Debug logging for final payload
    console.log('updateVehicle - final payload document URLs:', {
      rc_document_url: payload.rc_document_url,
      insurance_document_url: payload.insurance_document_url,
      fitness_document_url: payload.fitness_document_url,
      tax_document_url: payload.tax_document_url,
      permit_document_url: payload.permit_document_url,
      puc_document_url: payload.puc_document_url,
    });

    if (isLTT(payload.tax_paid_upto)) {
      payload.tax_paid_upto = getFutureDateForLTT();
      if (!payload.tax_scope || payload.tax_scope.trim() === '') {
        payload.tax_scope = 'Lifetime Tax (LTT)';
      }
    }

    if (payload.current_odometer != null) {
      const n = Number(payload.current_odometer);
      payload.current_odometer = Number.isFinite(n) ? n : null;
    }

    for (const k of Object.keys(payload)) {
      if (payload[k] === undefined) {
        delete payload[k];
      }
    }

    for (const k of Object.keys(payload)) {
      if (k.endsWith('_file')) {
        delete payload[k];
      }
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update(payload)
      .eq('id', id)
      .select(VEHICLE_COLS)
      .single();

    if (error) {
      handleSupabaseError('update vehicle', error);
      throw error;
    }

    if (Array.isArray(documents)) {
      for (const file of documents) {
        if (!file || typeof file.name !== 'string') {
          continue;
        }

        try {
          const dotIndex = file.name.lastIndexOf('.');
          const extension = dotIndex >= 0 ? file.name.slice(dotIndex + 1) : '';

          if (extension) {
            const filePath = await uploadVehicleDocument(file, id, 'general');
            const existingDocs = data.other_documents || [];
            const updatedDocs = [
              ...existingDocs,
              {
                name: file.name,
                file_path: filePath,
                upload_date: new Date().toISOString()
              }
            ];

            await supabase
              .from('vehicles')
              .update({ other_documents: updatedDocs })
              .eq('id', id);
          }
        } catch (uploadError) {
          handleSupabaseError('upload vehicle document', uploadError);
        }
      }
    }

    return data;
  } catch (error) {
    handleSupabaseError('update vehicle', error);
    throw error;
  }
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete vehicle', error);
    return false;
  }

  return true;
};

export const bulkArchiveVehicles = async (vehicleIds: string[]): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'archived' })
      .in('id', vehicleIds);

    if (error) {
      handleSupabaseError('archive vehicles', error);
      return false;
    }

    return true;
  } catch (error) {
    handleSupabaseError('archive vehicles', error);
    return false;
  }
};

export const exportVehicleData = async (): Promise<void> => {
  try {
    const vehicles = await getVehicles();

    const headers = {
      registration_number: 'Registration Number',
      make: 'Make',
      model: 'Model',
      year: 'Year',
      type: 'Type',
      fuel_type: 'Fuel Type',
      current_odometer: 'Current Odometer (km)',
      status: 'Status',
      chassis_number: 'Chassis Number',
      engine_number: 'Engine Number',
      owner_name: 'Owner Name',
      created_at: 'Created Date',
      updated_at: 'Updated Date'
    };

    const csvData = await generateCSV(vehicles, headers);

    const fileName = `vehicles_export_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(fileName, csvData);
  } catch (error) {
    handleSupabaseError('export vehicle data', error);
    throw error;
  }
};

export const bulkUnarchiveVehicles = async (vehicleIds: string[]): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({ status: 'active' })
      .in('id', vehicleIds);

    if (error) {
      handleSupabaseError('unarchive vehicles', error);
      return false;
    }

    return true;
  } catch (error) {
    handleSupabaseError('unarchive vehicles', error);
    return false;
  }
};

export const getVehicleTrips = async (vehicleId: string, limit = 10) => {
  try {
    console.log('🔍 Fetching trips for vehicle:', vehicleId);
    
    const { data: trips, error } = await supabase
      .from('trips')
      .select(`
        *,
        driver:drivers!driver_id (
          id,
          name
        ),
        warehouse:warehouses!warehouse_id (
          id,
          name
        )
      `)
      .eq('vehicle_id', vehicleId)
      .is('deleted_at', null)  // Exclude soft-deleted trips
      .order('trip_start_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching trips:', error);
      return { trips: [], stats: {} };
    }

    console.log('📊 Raw trips data:', trips);

    // Process trips - destinations are already in the table as arrays
    const processedTrips = trips?.map(trip => ({
      id: trip.id,
      trip_number: trip.trip_serial_number,
      trip_date: trip.trip_start_date,
      start_location: trip.warehouse?.name || 'Loading Point',
      end_location: trip.destination_names?.join(', ') || 'Unknown',
      driver_name: trip.driver?.name || trip.driver_name || 'Unassigned',
      mileage: trip.calculated_kmpl || 0,
      distance: (trip.end_km - trip.start_km) || 0,
      cargo_weight: trip.gross_weight || 0,
      revenue: trip.income_amount || 0,
      fuel_quantity: trip.fuel_quantity || 0,
      fuel_cost: trip.fuel_cost || 0,
      profit: trip.net_profit || 0
    })) || [];

    console.log('✅ Processed trips:', processedTrips);

    // Calculate stats
    const stats = {
      totalTrips: processedTrips.length,
      totalDistance: processedTrips.reduce((sum, t) => sum + t.distance, 0),
      avgMileage: calculateAverage(processedTrips, 'mileage'),
      totalFuel: processedTrips.reduce((sum, t) => sum + t.fuel_quantity, 0),
      bestDriver: getMostFrequentDriver(processedTrips),
      totalRevenue: processedTrips.reduce((sum, t) => sum + t.revenue, 0),
      totalProfit: processedTrips.reduce((sum, t) => sum + t.profit, 0)
    };

    console.log('📈 Calculated stats:', stats);

    return { trips: processedTrips, stats };
  } catch (error) {
    console.error('❌ Error in getVehicleTrips:', error);
    return { trips: [], stats: {} };
  }
};

function calculateAverage(trips: any[], field: string): number {
  const validTrips = trips.filter(t => t[field] > 0);
  if (validTrips.length === 0) return 0;
  const sum = validTrips.reduce((acc, t) => acc + t[field], 0);
  return parseFloat((sum / validTrips.length).toFixed(2));
}

function getMostFrequentDriver(trips: any[]): string {
  const driverCount = {};
  trips.forEach(trip => {
    if (trip.driver_name && trip.driver_name !== 'Unassigned') {
      driverCount[trip.driver_name] = (driverCount[trip.driver_name] || 0) + 1;
    }
  });
  
  let maxDriver = 'No regular driver';
  let maxCount = 0;
  
  Object.entries(driverCount).forEach(([driver, count]) => {
    if (count > maxCount) {
      maxDriver = driver;
      maxCount = count;
    }
  });
  
  return maxDriver;
}

