import { supabase } from './supabaseClient';

const uploadVehicleProfile = async (vehicleId: string, vehicleData: any): Promise<void> => {
  const profileData = {
    id: vehicleData.id,
    registration_number: vehicleData.registration_number,
    make: vehicleData.make,
    model: vehicleData.model,
    year: vehicleData.year,
    type: vehicleData.type,
    fuel_type: vehicleData.fuel_type,
    current_odometer: vehicleData.current_odometer,
    status: vehicleData.status,
    chassis_number: vehicleData.chassis_number,
    engine_number: vehicleData.engine_number,
    owner_name: vehicleData.owner_name,
    insurance_end_date: vehicleData.insurance_end_date,
    fitness_expiry_date: vehicleData.fitness_expiry_date,
    permit_expiry_date: vehicleData.permit_expiry_date,
    puc_expiry_date: vehicleData.puc_expiry_date,
    created_at: vehicleData.created_at,
    updated_at: vehicleData.updated_at,
    generated_at: new Date().toISOString(),
    document_paths: {
      rc: vehicleData.rc_document_url,
      insurance: vehicleData.insurance_document_url,
      fitness: vehicleData.fitness_document_url,
      tax: vehicleData.tax_document_url,
      permit: vehicleData.permit_document_url,
      puc: vehicleData.puc_document_url,
      other: vehicleData.other_documents?.map((doc: any) => doc.file_path),
    },
  };

  const { error } = await supabase.storage
    .from('vehicle-profiles')
    .upload(`${vehicleId}.json`, JSON.stringify(profileData, null, 2), {
      contentType: 'application/json',
      upsert: true,
    });
  if (error) throw error;
};

const getVehicleData = async (vehicleId: string): Promise<any> => {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
  if (error) throw error;
  return data;
};

export const createShareableVehicleLink = async (vehicleId: string): Promise<string> => {
  try {
    const vehicleData = await getVehicleData(vehicleId);
    await uploadVehicleProfile(vehicleId, vehicleData);
    const { data, error } = await supabase.storage
      .from('vehicle-profiles')
      .createSignedUrl(`${vehicleId}.json`, 60 * 60 * 24 * 7);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw error;
  }
};

const uploadDriverProfile = async (driverId: string, driverData: any): Promise<void> => {
  const profileData = {
    id: driverData.id,
    name: driverData.name,
    license_number: driverData.license_number,
    contact_number: driverData.contact_number,
    email: driverData.email,
    join_date: driverData.join_date,
    status: driverData.status,
    experience_years: driverData.experience_years,
    primary_vehicle_id: driverData.primary_vehicle_id,
    license_expiry_date: driverData.license_expiry_date,
    documents_verified: driverData.documents_verified,
    driver_status_reason: driverData.driver_status_reason,
    created_at: driverData.created_at,
    updated_at: driverData.updated_at,
    generated_at: new Date().toISOString(),
    document_paths: {
      license: driverData.license_document_path,
      photo: driverData.driver_photo_path,
    },
  };

  const { error } = await supabase.storage
    .from('driver-profiles')
    .upload(`${driverId}.json`, JSON.stringify(profileData, null, 2), {
      contentType: 'application/json',
      upsert: true,
    });
  if (error) throw error;
};

const getDriverData = async (driverId: string): Promise<any> => {
  const { data, error } = await supabase.from('drivers').select('*').eq('id', driverId).single();
  if (error) throw error;
  return data;
};

export const createShareableDriverLink = async (driverId: string): Promise<string> => {
  try {
    const driverData = await getDriverData(driverId);
    await uploadDriverProfile(driverId, driverData);
    const { data, error } = await supabase.storage
      .from('driver-profiles')
      .createSignedUrl(`${driverId}.json`, 60 * 60 * 24 * 7);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw error;
  }
};
