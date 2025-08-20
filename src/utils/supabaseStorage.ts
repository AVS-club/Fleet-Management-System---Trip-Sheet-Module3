import {
  Trip,
  Vehicle,
  Driver,
  Warehouse,
  Destination,
  RouteAnalysis,
  Alert,
} from "../types";
import { supabase } from "./supabaseClient";
import { logVehicleActivity } from "./vehicleActivity";
import { uploadFilesAndGetPublicUrls } from "./supabaseStorage";
import { normalizeVehicleType } from "./vehicleNormalize";

// Helper function to convert camelCase to snake_case
const toSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// Convert object keys from camelCase to snake_case
const convertKeysToSnakeCase = (
  obj: Record<string, any>
): Record<string, any> => {
  const newObj: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = toSnakeCase(key);

    newObj[newKey] =
      value && typeof value === "object" && !Array.isArray(value)
        ? convertKeysToSnakeCase(value)
        : value;
  });

  return newObj;
};
import { calculateMileage } from "./mileageCalculator";
import { BUCKETS } from "./storageBuckets";
import { normalizeVehicleType, withOwner, getCurrentUserId } from "./supaHelpers";

/**
 * Upload a driver file to the drivers storage bucket
 * @param driverId Driver ID
 * @param kind Type of document
 * @param file File to upload
 * @param customName Optional custom name for 'other' documents
 * @returns Object with path or null if no file provided
 */
export async function uploadDriverFile(
  driverId: string, 
  kind: 'photo' | 'license' | 'aadhaar' | 'police' | 'medical' | 'other', 
  file: File | File[], 
  customName?: string
): Promise<{ path: string | null }> {
  // Handle array of files (take first file)
  const fileToUpload = Array.isArray(file) ? file[0] : file;
  
  if (!fileToUpload) {
    return { path: null };
  }

  const folder = 
    kind === 'photo'   ? 'driver_photos'
  : kind === 'license' ? 'license_documents'
  : kind === 'aadhaar' ? 'aadhaar_documents'
  : kind === 'police'  ? 'police_verification'
  : kind === 'medical' ? 'medical_certificate'
  :                      'other_documents';

  const fileName = customName 
    ? `${Date.now()}-${customName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    : `${Date.now()}-${fileToUpload.name}`;
    
  const path = `${folder}/${driverId}/${fileName}`;
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKETS.DRIVERS)
      .upload(path, fileToUpload, { 
        upsert: true, 
        contentType: fileToUpload.type 
      });

    if (error) {
      // Surface status code & path for debugging
      throw new Error(`Upload failed (${error.status || 'n/a'}): bucket=${BUCKETS.DRIVERS}, path=${path}, msg=${error.message}`);
    }

    const finalPath = data?.path || path;
    console.log(`Successfully uploaded to bucket=${BUCKETS.DRIVERS}, path=${finalPath}`);
    
    return { path: finalPath };
  } catch (error) {
    console.error('Error in uploadDriverFile:', error);
    throw error;
  }
}

// Helper function to upload vehicle profile JSON to Supabase Storage
const uploadVehicleProfile = async (vehicle: Vehicle): Promise<void> => {
  try {
    const fileName = `${vehicle.id}.json`;
    const filePath = fileName;

    // Create JSON blob
    const jsonBlob = new Blob([JSON.stringify(vehicle, null, 2)], {
      type: "application/json",
    });

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("vehicle-profiles")
      .upload(filePath, jsonBlob, {
        upsert: true,
        contentType: "application/json",
      });

    if (uploadError) {
      console.error("Error uploading vehicle profile:", uploadError);
      // Don't throw error to avoid breaking the main operation
    }
  } catch (error) {
    console.error("Error creating vehicle profile JSON:", error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Generate Trip ID based on vehicle registration
const generateTripId = async (vehicleId: string): Promise<string> => {
  // Validate vehicleId
  if (!vehicleId) {
    throw new Error("Vehicle ID is required to generate a trip ID");
  }

  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) {
    console.error(`Vehicle with ID ${vehicleId} not found`);
    throw new Error(`Vehicle with ID ${vehicleId} not found`);
  }

  // Extract last 4 digits from registration number
  const regMatch = vehicle.registration_number.match(/\d{4}$/);
  if (!regMatch) {
    console.error(
      `Invalid registration format for vehicle: ${vehicle.registration_number}`
    );
    throw new Error(
      `Invalid registration format for vehicle: ${vehicle.registration_number}`
    );
  }

  const prefix = regMatch[0];

  // Get latest trip number for this vehicle
  const { data: latestTrip } = await supabase
    .from("trips")
    .select("trip_serial_number")
    .eq("vehicle_id", vehicleId)
    .order("trip_serial_number", { ascending: false })
    .limit(1);

  const lastNum = latestTrip?.[0]?.trip_serial_number
    ? parseInt(latestTrip[0].trip_serial_number.slice(-4))
    : 0;

  const nextNum = lastNum + 1;

  // Format: XXXX0001 where XXXX is last 4 digits of registration
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

// Trips CRUD operations with Supabase
export const getTrips = async (): Promise<Trip[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Error fetching user data");
    return [];
  }
  try {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("added_by", user.id)
      .order("trip_start_date", { ascending: false });

    if (error) {
      console.error("Error fetching trips:", error);
      // If it's a network error, throw it to be handled by the calling component
      if (error.message && error.message.includes("Failed to fetch")) {
        throw new Error("Network connection failed while fetching trips");
      }
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getTrips:", error);
    // Re-throw network errors so they can be handled appropriately
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw error;
    }
    return [];
  }
};

export const getTrip = async (id: string): Promise<Trip | null> => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching trip:", error);
      // If it's a network error, throw it to be handled by the calling component
      if (error.message && error.message.includes("Failed to fetch")) {
        throw new Error("Network connection failed while fetching trip");
      }
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getTrip:", error);
    // Re-throw network errors so they can be handled appropriately
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw error;
    }
    return null;
  }
};

export const createTrip = async (
  trip: Omit<Trip, "id" | "trip_serial_number">
): Promise<Trip | null> => {
  // Validate required fields
  if (!trip.vehicle_id) {
    console.error("Vehicle ID is missing for trip creation");
    throw new Error("Vehicle ID is required to create a trip");
  }

  const tripId = await generateTripId(trip.vehicle_id);

  // Ensure material_type_ids is properly handled
  const tripData = {
    ...trip,
    trip_serial_number: tripId,
    // Ensure breakdown_expense and miscellaneous_expense are included
    breakdown_expense: trip.breakdown_expense || 0,
    miscellaneous_expense: trip.miscellaneous_expense || 0,
  };

  const { data, error } = await supabase
    .from("trips")
    .insert(tripData)
    .select()
    .single();

  if (error) {
    console.error("Error creating trip:", error);
    return null;
  }

  return data;
};

export const updateTrip = async (
  id: string,
  updatedTrip: Partial<Trip>
): Promise<Trip | null> => {
  const { data: oldTrip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (!oldTrip) {
    console.error("Trip not found:", id);
    return null;
  }

  const { data, error } = await supabase
    .from("trips")
    .update({
      ...updatedTrip,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating trip:", error);
    return null;
  }

  return data;
};

export const deleteTrip = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("trips").delete().eq("id", id);

  if (error) {
    console.error("Error deleting trip:", error);
    return false;
  }

  return true;
};

const recalculateMileageForAffectedTrips = async (
  changedTrip: Trip
): Promise<void> => {
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("vehicle_id", changedTrip.vehicle_id)
    .gte("trip_end_date", changedTrip.trip_end_date)
    .order("trip_end_date", { ascending: true });

  if (!trips || !Array.isArray(trips) || trips.length === 0) return;

  // Find all refueling trips for the same vehicle that occurred after the changed trip
  const affectedTrips = trips.filter(
    (trip) =>
      trip.refueling_done &&
      trip.fuel_quantity &&
      trip.fuel_quantity > 0 &&
      trip.id !== changedTrip.id
  );

  if (affectedTrips.length === 0) return;

  // Gather all affected trip IDs with their new mileage
  const updates = affectedTrips.map((trip) => ({
    id: trip.id,
    calculated_kmpl: calculateMileage(trip, trips),
  }));

  const startTime = performance.now();

  const { error } = await supabase.from("trips").upsert(updates);

  const duration = performance.now() - startTime;
  console.log(
    `Batch updated calculated_kmpl for ${updates.length} trips in ${duration.toFixed(
      2
    )}ms`
  );

  if (error) {
    console.error("Error updating mileage for affected trips:", error);
    throw error;
  }
};

// Vehicles CRUD operations with Supabase
export const getVehicles = async (): Promise<Vehicle[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Error fetching user data");
    return [];
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("added_by", user.id)
    .order("registration_number");

  if (error) {
    console.error("Error fetching vehicles:", error);
    return [];
  }

  return data || [];
};

export const getVehicle = async (id: string): Promise<Vehicle | null> => {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching vehicle:", error);
    return null;
  }

  return data;
};

export const createVehicle = async (
  vehicle: Omit<Vehicle, "id">
): Promise<Vehicle | null> => {
  // Process the vehicle data to handle file uploads and document flags
  const processedVehicle = {
    ...vehicle,
    type: normalizeVehicleType(vehicle.type) || 'truck',
  };
  let rcPublicUrls = [];
  let insurancePublicUrls = [];
  let fitnessPublicUrls = [];
  let pucPublicUrls = [];
  let taxPublicUrls = [];
  let permitPublicUrls = [];
  // Handle document file uploads
  try {
    // Upload RC document if provided

    if (processedVehicle.rc_copy_file && processedVehicle.rc_copy_file.length) {
      rcPublicUrls = await uploadFilesAndGetPublicUrls(
        "vehicle-docs",
        `${processedVehicle.registration_number}/rc`,
        processedVehicle.rc_copy_file
      );
      processedVehicle.rc_document_url = rcPublicUrls;
      processedVehicle.rc_copy = true;
    }

    // Upload insurance document if provided
    if (
      processedVehicle.insurance_document_file &&
      processedVehicle.insurance_document_file.length
    ) {
      insurancePublicUrls = await uploadFilesAndGetPublicUrls(
        "vehicle-docs",
        `${processedVehicle.registration_number}/insurance`,
        processedVehicle.insurance_document_file
      );
      processedVehicle.insurance_document_url = insurancePublicUrls;
      processedVehicle.insurance_document = true;
    }

    // Upload fitness document if provided
    if (
      processedVehicle.fitness_document_file &&
      processedVehicle.fitness_document_file.length
    ) {
      fitnessPublicUrls = await uploadFilesAndGetPublicUrls(
        "vehicle-docs",
        `${processedVehicle.registration_number}/fitness`,
        processedVehicle.fitness_document_file
      );
      processedVehicle.fitness_document_url = fitnessPublicUrls;
      processedVehicle.fitness_document = true;
    }

    // Upload tax document if provided
    if (
      processedVehicle.tax_receipt_document_file &&
      processedVehicle.tax_receipt_document_file.length
    ) {
      taxPublicUrls = await uploadFilesAndGetPublicUrls(
        "vehicle-docs",
        `${processedVehicle.registration_number}/tax`,
        processedVehicle.tax_receipt_document_file
      );
      processedVehicle.tax_document_url = taxPublicUrls;
      processedVehicle.tax_receipt_document = true;
    }

    // Upload permit document if provided
    if (
      processedVehicle.permit_document_file &&
      processedVehicle.permit_document_file.length
    ) {
      permitPublicUrls = await uploadFilesAndGetPublicUrls(
        "vehicle-docs",
        `${processedVehicle.registration_number}/permit`,
        processedVehicle.permit_document_file
      );
      processedVehicle.permit_document_url = permitPublicUrls;
      processedVehicle.permit_document = true;
    }

    // Upload PUC document if provided
    if (
      processedVehicle.puc_document_file &&
      processedVehicle.puc_document_file.length
    ) {
      pucPublicUrls = await uploadFilesAndGetPublicUrls(
        "vehicle-docs",
        `${processedVehicle.registration_number}/puc`,
        processedVehicle.puc_document_file
      );
      processedVehicle.puc_document_url = pucPublicUrls;
      processedVehicle.puc_document = true;
    }
  } catch (error) {
    console.error("Error uploading vehicle documents:", error);
    // Continue with vehicle creation even if document uploads fail
  }

  // Remove file objects as they can't be stored in the database
  delete (processedVehicle as any).rc_copy_file;
  delete (processedVehicle as any).insurance_document_file;
  delete (processedVehicle as any).fitness_document_file;
  delete (processedVehicle as any).tax_receipt_document_file;
  delete (processedVehicle as any).permit_document_file;
  delete (processedVehicle as any).puc_document_file;

  // Get current user for created_by field
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? null;

  // Prepare the vehicle data for insertion
  const vehicleDataToInsert = convertKeysToSnakeCase(processedVehicle);
  
  // Only add created_by if we have a user ID
  if (userId) {
    vehicleDataToInsert.created_by = userId;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      ...vehicleDataToInsert,
      rc_document_url: processedVehicle.rc_document_url,
      insurance_document_url: processedVehicle.insurance_document_url,
      fitness_document_url: processedVehicle.fitness_document_url,
      tax_document_url: processedVehicle.tax_document_url,
      permit_document_url: processedVehicle.permit_document_url,
      puc_document_url: processedVehicle.puc_document_url,
      tax_paid_upto:
        (processedVehicle.tax_paid_upto &&
          !isNaN(new Date(processedVehicle.tax_paid_upto).getTime()) &&
          new Date(processedVehicle.tax_paid_upto)) ||
        null,
      national_permit_upto:
        (processedVehicle.national_permit_upto &&
          !isNaN(new Date(processedVehicle.national_permit_upto).getTime()) &&
          new Date(processedVehicle.national_permit_upto)) ||
        null,
      registration_date:
        (processedVehicle.registration_date &&
          !isNaN(new Date(processedVehicle.registration_date).getTime()) &&
          new Date(processedVehicle.registration_date)) ||
        null,
      puc_issue_date:
        (processedVehicle.puc_issue_date &&
          !isNaN(new Date(processedVehicle.puc_issue_date).getTime()) &&
          new Date(processedVehicle.puc_issue_date)) ||
        null,
      puc_expiry_date:
        (processedVehicle.puc_expiry_date &&
          !isNaN(new Date(processedVehicle.puc_expiry_date).getTime()) &&
          new Date(processedVehicle.puc_expiry_date)) ||
        null,
      permit_issue_date:
        (processedVehicle.permit_issue_date &&
          !isNaN(new Date(processedVehicle.permit_issue_date).getTime()) &&
          new Date(processedVehicle.permit_issue_date)) ||
        null,
      permit_expiry_date:
        (processedVehicle.permit_expiry_date &&
          !isNaN(new Date(processedVehicle.permit_expiry_date).getTime()) &&
          new Date(processedVehicle.permit_expiry_date)) ||
        null,
      fitness_issue_date: 
        (processedVehicle.fitness_issue_date &&
          !isNaN(new Date(processedVehicle.fitness_issue_date).getTime()) &&
          new Date(processedVehicle.fitness_issue_date)) ||
        null,
      fitness_expiry_date:
        (processedVehicle.fitness_expiry_date &&
          !isNaN(new Date(processedVehicle.fitness_expiry_date).getTime()) &&
          new Date(processedVehicle.fitness_expiry_date)) ||
        null,
      insurance_expiry_date:
        (processedVehicle.insurance_expiry_date &&
          !isNaN(new Date(processedVehicle.insurance_expiry_date).getTime()) &&
          new Date(processedVehicle.insurance_expiry_date)) ||
        null,
      insurance_start_date:
        (processedVehicle.insurance_start_date &&
          !isNaN(new Date(processedVehicle.insurance_start_date).getTime()) &&
          new Date(processedVehicle.insurance_start_date)) ||
        null,
      rc_expiry_date:
        (processedVehicle.rc_expiry_date &&
          !isNaN(new Date(processedVehicle.rc_expiry_date).getTime()) &&
          new Date(processedVehicle.rc_expiry_date)) ||
        null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating vehicle:", error);
    return null;
  }

  // Log the vehicle creation activity
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (data && user) {
    await logVehicleActivity(
      data.id,
      "updated",
      user.email || user.id,
      "Vehicle created"
    );
  }

  return data;
};

export const updateVehicle = async (
  id: string,
  updatedVehicle: Partial<Vehicle>,
  userId: string
): Promise<Vehicle | null> => {
  // Get the current vehicle data
  const { data: currentVehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();

  if (!currentVehicle) {
    console.error("Vehicle not found:", id);
    return null;
  }

  // Process the vehicle data to handle file uploads and document flags
  const processedVehicle = {
    ...updatedVehicle,
    updated_at: new Date().toISOString(),
  };

  // Handle document file uploads
  try {
    // Upload RC document if provided
    if (processedVehicle.rc_copy_file) {
      const { data: uploadRCData, error: uploadRCError } =
        await supabase.storage
          .from("vehicle-docs")
          .upload(
            `${userId}/${
              processedVehicle.registration_number
            }/rc/rc_copy${processedVehicle.rc_copy_file.name.slice(-4)}`,
            processedVehicle.rc_copy_file,
            {
              upsert: true,
            }
          );

      if (uploadRCError) {
        console.error("RC Upload error:", uploadRCError);
        return null;
      }
      // Get the public URL
      const { data: licencePublicUrl } = supabase.storage
        .from("vehicle-docs")
        .getPublicUrl(`${uploadRCData.path}`);

      processedVehicle.rc_document_url = licencePublicUrl.publicUrl;
      processedVehicle.rc_copy = true;
    }

    // Upload insurance document if provided
    if (processedVehicle.insurance_document_file) {
      const { data: uploadInsuranceData, error: uploadInsuranceError } =
        await supabase.storage
          .from("vehicle-docs")
          .upload(
            `${userId}/${
              processedVehicle.registration_number
            }/insurance/insurance${processedVehicle.insurance_document_file.name.slice(
              -4
            )}`,
            processedVehicle.insurance_document_file,
            {
              upsert: true,
            }
          );

      if (uploadInsuranceError) {
        console.error("Insurance Upload error:", uploadInsuranceError);
        return null;
      }
      // Get the public URL
      const { data: insurancePublicUrl } = supabase.storage
        .from("vehicle-docs")
        .getPublicUrl(`${uploadInsuranceData.path}`);

      processedVehicle.insurance_document_url = insurancePublicUrl.publicUrl;
      processedVehicle.insurance_document = true;
    }

    // Upload fitness document if provided
    if (processedVehicle.fitness_document_file) {
      const { data: uploadFitnessData, error: uploadFitnessError } =
        await supabase.storage
          .from("vehicle-docs")
          .upload(
            `${userId}/${
              processedVehicle.registration_number
            }/fitness/fitness${processedVehicle.fitness_document_file.name.slice(
              -4
            )}`,
            processedVehicle.fitness_document_file,
            {
              upsert: true,
            }
          );

      if (uploadFitnessError) {
        console.error("Fitness Upload error:", uploadFitnessError);
        return null;
      }
      // Get the public URL
      const { data: fitnessPublicUrl } = supabase.storage
        .from("vehicle-docs")
        .getPublicUrl(`${uploadFitnessData.path}`);

      processedVehicle.fitness_document_url = fitnessPublicUrl.publicUrl;
      processedVehicle.fitness_document = true;
    }

    // Upload tax document if provided
    if (processedVehicle.tax_receipt_document_file) {
      const { data: uploadTaxData, error: uploadTaxError } =
        await supabase.storage
          .from("vehicle-docs")
          .upload(
            `${userId}/${
              processedVehicle.registration_number
            }/tax/taxReciept${processedVehicle.tax_receipt_document_file.name.slice(
              -4
            )}`,
            processedVehicle.tax_receipt_document_file,
            {
              upsert: true,
            }
          );

      if (uploadTaxError) {
        console.error("Tax Reciept Upload error:", uploadTaxError);
        return null;
      }
      // Get the public URL
      const { data: taxPublicUrl } = supabase.storage
        .from("vehicle-docs")
        .getPublicUrl(`${uploadTaxData.path}`);

      processedVehicle.tax_document_url = taxPublicUrl.publicUrl;
      processedVehicle.tax_receipt_document = true;
    }

    // Upload permit document if provided
    if (processedVehicle.permit_document_file) {
      const { data: uploadPermitData, error: uploadPermitError } =
        await supabase.storage
          .from("vehicle-docs")
          .upload(
            `${userId}/${
              processedVehicle.registration_number
            }/permit/permit${processedVehicle.permit_document_file.name.slice(
              -4
            )}`,
            processedVehicle.permit_document_file,
            {
              upsert: true,
            }
          );

      if (uploadPermitError) {
        console.error("Permit Upload error:", uploadPermitError);
        return null;
      }
      // Get the public URL
      const { data: permitPublicUrl } = supabase.storage
        .from("vehicle-docs")
        .getPublicUrl(`${uploadPermitData.path}`);
      processedVehicle.permit_document_url = permitPublicUrl.publicUrl;
      processedVehicle.permit_document = true;
    }

    // Upload PUC document if provided
    if (processedVehicle.puc_document_file) {
      const { data: uploadPUCData, error: uploadPUCError } =
        await supabase.storage
          .from("vehicle-docs")
          .upload(
            `${userId}/${
              processedVehicle.registration_number
            }/puc/puc${processedVehicle.puc_document_file.name.slice(-4)}`,
            processedVehicle.puc_document_file,
            {
              upsert: true,
            }
          );

      if (uploadPUCError) {
        console.error("PUC Upload error:", uploadPUCError);
        return null;
      }
      const { data: pucPublicUrl } = supabase.storage
        .from("vehicle-docs")
        .getPublicUrl(`${uploadPUCData.path}`);
      processedVehicle.puc_document_url = pucPublicUrl.publicUrl;
      processedVehicle.puc_document = true;
    }
  } catch (error) {
    console.error("Error uploading vehicle documents:", error);
    // Continue with vehicle update even if document uploads fail
  }

  // Remove file objects as they can't be stored in the database
  delete (processedVehicle as any).rc_copy_file;
  delete (processedVehicle as any).insurance_document_file;
  delete (processedVehicle as any).fitness_document_file;
  delete (processedVehicle as any).tax_receipt_document_file;
  delete (processedVehicle as any).permit_document_file;
  delete (processedVehicle as any).puc_document_file;

  const { data, error } = await supabase
    .from("vehicles")
    .update(convertKeysToSnakeCase(processedVehicle))
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating vehicle:", error);
    return null;
  }

  // Upload updated vehicle profile JSON to storage
  if (data) {
    await uploadVehicleProfile(data);
  }

  // Log the vehicle update activity
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (data && user) {
    let actionType:
      | "updated"
      | "archived"
      | "assigned_driver"
      | "unassigned_driver" = "updated";
    let notes = "Vehicle information updated";

    // Determine the action type based on the updated fields
    if (updatedVehicle.status === "archived") {
      actionType = "archived";
      notes = "Vehicle archived";
    } else if (updatedVehicle.status === "active" && data.status === "active") {
      actionType = "updated";
      notes = "Vehicle unarchived";
    } else if (updatedVehicle.primary_driver_id !== undefined) {
      if (updatedVehicle.primary_driver_id === null) {
        actionType = "unassigned_driver";
        notes = "Driver unassigned from vehicle";
      } else {
        actionType = "assigned_driver";
        notes = "Driver assigned to vehicle";
      }
    }

    await logVehicleActivity(id, actionType, user.email || user.id, notes);
  }

  return data;
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  try {
    // Instead of deleting, change the vehicle status to 'archived'
    const { data, error } = await supabase
      .from("vehicles")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error archiving vehicle:", error);
      throw new Error(`Failed to archive vehicle: ${error.message}`);
    }

    // Log the archive activity
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logVehicleActivity(
        id,
        "archived",
        user.email || user.id,
        "Vehicle archived"
      );
    }

    return true;
  } catch (error) {
    console.error("Error in vehicle archiving process:", error);
    throw error;
  }
};

const unarchiveVehicle = async (id: string): Promise<boolean> => {
  try {
    // Change the vehicle status from 'archived' back to 'active'
    const { data, error } = await supabase
      .from("vehicles")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error unarchiving vehicle:", error);
      throw new Error(`Failed to unarchive vehicle: ${error.message}`);
    }

    // Log the unarchive activity
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logVehicleActivity(
        id,
        "updated",
        user.email || user.id,
        "Vehicle unarchived"
      );
    }

    return true;
  } catch (error) {
    console.error("Error in vehicle unarchiving process:", error);
    throw error;
  }
};

export const bulkUpdateVehicles = async (
  vehicleIds: string[],
  updates: Partial<Vehicle>,
  userId: string
): Promise<{ success: number; failed: number }> => {
  const promises = vehicleIds.map((id) => updateVehicle(id, updates, userId));

  const results = await Promise.allSettled(promises);

  let successCount = 0;
  let failedCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      successCount++;
    } else {
      failedCount++;
      if (result.status === "rejected") {
        console.error("Error updating vehicle:", result.reason);
      }
    }
  }

  return { success: successCount, failed: failedCount };
};

export const bulkArchiveVehicles = async (
  vehicleIds: string[]
): Promise<{ success: number; failed: number }> => {
  const promises = vehicleIds.map((id) => deleteVehicle(id));

  const results = await Promise.allSettled(promises);

  let successCount = 0;
  let failedCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      successCount++;
    } else {
      failedCount++;
      if (result.status === "rejected") {
        console.error("Error archiving vehicle:", result.reason);
      }
    }
  }

  return { success: successCount, failed: failedCount };
};

export const bulkUnarchiveVehicles = async (
  vehicleIds: string[]
): Promise<{ success: number; failed: number }> => {
  const promises = vehicleIds.map((id) => unarchiveVehicle(id));

  const results = await Promise.allSettled(promises);

  let successCount = 0;
  let failedCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      successCount++;
    } else {
      failedCount++;
      if (result.status === "rejected") {
        console.error("Error unarchiving vehicle:", result.reason);
      }
    }
  }

  return { success: successCount, failed: failedCount };
};

const bulkDeleteVehicles = bulkArchiveVehicles; // Alias for backward compatibility

// Drivers CRUD operations with Supabase
export const getDrivers = async (): Promise<Driver[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Error fetching user data");
    return [];
  }

  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("added_by", user.id)
    .order("name");

  if (error) {
    console.error("Error fetching drivers:", error);
    return [];
  }

  return data || [];
};

export const getDriver = async (id: string): Promise<Driver | null> => {
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching driver:", error);
    return null;
  }

  return data;
};

export const createDriver = async (
  driver: Omit<Driver, "id">
): Promise<Driver | null> => {
  // Remove photo property if it exists (we handle it separately)
  const {
    photo,
    dl_number,
    license_document,
    aadhaar_document,
    medical_document,
    police_document,
    ...driverData
  } = driver as any;

  // Ensure dl_number is not empty for file path construction
  const driverLicenseNumber = dl_number && dl_number.trim() !== '' ? dl_number : 'unknown_driver';

  // const { data: uploadData, error: uploadError } = await supabase.storage
  //   .from("driver-docs")
  //   .upload(
  //     `${userId}/drivingLicence/licence${license_document.name.slice(-4)}`,
  //     license_document,
  //     {
  //       upsert: true,
  //     }
  //   );

  // if (uploadError) {
  //   console.error("Upload error:", uploadError);
  //   return null;
  // }
  let licencePublicUrls = [];
  let idProofPublicUrls = [];
  let policePublicUrls = [];
  let medicalPublicUrls = [];
  try {
    licencePublicUrls = await uploadFilesAndGetPublicUrls(
      "driver-docs",
      `${driverLicenseNumber}/license`,
      license_document
    );
    idProofPublicUrls = await uploadFilesAndGetPublicUrls(
      "driver-docs",
      `${driverLicenseNumber}/idproof`,
      aadhaar_document
    );
    policePublicUrls = await uploadFilesAndGetPublicUrls(
      "driver-docs",
      `${driverLicenseNumber}/policeVerification`,
      police_document
    );
    medicalPublicUrls = await uploadFilesAndGetPublicUrls(
      "driver-docs",
      `${driverLicenseNumber}/medicalCertificate`,
      medical_document
    );
  } catch (err) {
    console.error("Error uploading driver documents:", err);
    throw new Error("Failed to upload one or more files. Please try again or check your network/storage settings.");
  }

  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("drivers")
    .insert({
      ...convertKeysToSnakeCase(withOwner(driverData, userId)),
      license_number: dl_number,
      license_doc_url: licencePublicUrls,
      aadhar_doc_url: idProofPublicUrls,
      police_doc_url: policePublicUrls,
      medical_doc_url: medicalPublicUrls,
      license_issue_date:
        (driverData.license_issue_date &&
          !isNaN(new Date(driverData.license_issue_date).getTime()) &&
          new Date(driverData.license_issue_date)) ||
        null,
      dob:
        (driverData.dob &&
          !isNaN(new Date(driverData.dob).getTime()) &&
          new Date(driverData.dob)) ||
        null,
      valid_from:
        (driverData.valid_from &&
          !isNaN(new Date(driverData.valid_from).getTime()) &&
          new Date(driverData.valid_from)) ||
        null,
      license_expiry_date:
        (driverData.license_expiry_date &&
          !isNaN(new Date(driverData.license_expiry_date).getTime()) &&
          new Date(driverData.license_expiry_date)) ||
        null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating driver:", error);
    return null;
  }

  return data;
};

export const updateDriver = async (
  id: string,
  updatedDriver: Partial<Driver>
): Promise<Driver | null> => {
  // Remove photo property and handle dl_number mapping if it exists
  const { photo, dl_number, ...driverData } = updatedDriver as any;

  const mappedDriverData = {
    ...driverData,
    updated_at: new Date().toISOString(),
  };

  // Map dl_number to license_number if it exists
  if (dl_number !== undefined) {
    mappedDriverData.license_number = dl_number;
  }

  const { data, error } = await supabase
    .from("drivers")
    .update(mappedDriverData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating driver:", error);
    return null;
  }

  return data;
};

export const deleteDriver = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("drivers").delete().eq("id", id);

  if (error) {
    console.error("Error deleting driver:", error);
    return false;
  }

  return true;
};

// Upload driver photo to Supabase Storage
export const uploadDriverPhoto = async (
  driverId: string,
  file: File
): Promise<string> => {
  const fileName = `${driverId}_photo.${file.name.split(".").pop()}`;
  const { data, error } = await supabase.storage
    .from("driver-photos")
    .upload(fileName, file, {
      upsert: true,
    });

  if (error) {
    console.error("Error uploading driver photo:", error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("driver-photos")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};

// Driver stats
export const getDriverStats = async (driverId: string) => {
  // First get the driver to get their name
  const driver = await getDriver(driverId);
  if (!driver) return { totalTrips: 0, totalDistance: 0 };

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("driver_name", driver.name);

  if (!trips || !Array.isArray(trips))
    return { totalTrips: 0, totalDistance: 0 };

  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, trip) => {
    const startKm = parseFloat(trip.start_kilometer) || 0;
    const endKm = parseFloat(trip.end_kilometer) || 0;
    return sum + (endKm - startKm);
  }, 0);

  const tripsWithKmpl = trips.filter(
    (trip) => trip.calculated_kmpl !== undefined && !trip.short_trip
  );
  const averageKmpl =
    tripsWithKmpl.length > 0
      ? tripsWithKmpl.reduce(
          (sum, trip) => sum + (trip.calculated_kmpl || 0),
          0
        ) / tripsWithKmpl.length
      : undefined;

  return {
    totalTrips,
    totalDistance,
    averageKmpl,
  };
};

// Warehouses CRUD operations with Supabase
export const getWarehouses = async (): Promise<Warehouse[]> => {
  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching warehouses:", error);
    return [];
  }

  return data || [];
};

export const getWarehouse = async (id: string): Promise<Warehouse | null> => {
  try {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching warehouse:", error);
      // If it's a network error, throw it to be handled by the calling component
      if (error.message && error.message.includes("Failed to fetch")) {
        throw new Error("Network connection failed while fetching warehouse");
      }
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getWarehouse:", error);
    // Re-throw network errors so they can be handled appropriately
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw error;
    }
    return null;
  }
};

export const createWarehouse = async (
  warehouse: Omit<Warehouse, "id">
): Promise<Warehouse | null> => {
  // Ensure material_type_ids is an array
  const warehouseData = {
    ...warehouse,
    material_type_ids: warehouse.materialTypeIds || [],
  };

  // Delete the camelCase property as we're using the snake_case version
  if ("materialTypeIds" in warehouseData) {
    delete (warehouseData as any).materialTypeIds;
  }

  const { data, error } = await supabase
    .from("warehouses")
    .insert(convertKeysToSnakeCase(warehouseData))
    .select()
    .single();

  if (error) {
    console.error("Error creating warehouse:", error);
    return null;
  }

  return data;
};

export const updateWarehouse = async (
  id: string,
  updates: Partial<Warehouse>
): Promise<Warehouse | null> => {
  // Ensure material_type_ids is an array
  const warehouseUpdates = {
    ...updates,
    material_type_ids: updates.materialTypeIds || updates.material_type_ids,
    updated_at: new Date().toISOString(),
  };

  // Delete the camelCase property as we're using the snake_case version
  if ("materialTypeIds" in warehouseUpdates) {
    delete (warehouseUpdates as any).materialTypeIds;
  }

  const { data, error } = await supabase
    .from("warehouses")
    .update(warehouseUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating warehouse:", error);
    return null;
  }

  return data;
};

export const deleteWarehouse = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("warehouses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting warehouse:", error);
    return false;
  }

  return true;
};

// Destinations CRUD operations with Supabase
export const getDestinations = async (): Promise<Destination[]> => {
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching destinations:", error);
    return [];
  }

  return data || [];
};

export const getDestination = async (
  id: string
): Promise<Destination | null> => {
  // Validate the ID parameter before making the request
  if (!id || typeof id !== "string" || id.trim() === "") {
    console.error("Invalid destination ID provided:", id);
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("destinations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching destination:", error);
      // If it's a network error, throw it to be handled by the calling component
      if (error.message && error.message.includes("Failed to fetch")) {
        throw new Error("Network connection failed while fetching destination");
      }
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getDestination:", error);
    // Re-throw network errors so they can be handled appropriately
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw error;
    }
    return null;
  }
};

export const createDestination = async (
  destination: Omit<Destination, "id">
): Promise<Destination | null> => {
  // Prepare the data for insertion, removing empty id field if present
  const destinationData = convertKeysToSnakeCase(destination);

  // Remove id field if it's empty or undefined to let Supabase auto-generate it
  if (
    "id" in destinationData &&
    (!destinationData.id || destinationData.id === "")
  ) {
    delete destinationData.id;
  }

  const { data, error } = await supabase
    .from("destinations")
    .insert(destinationData)
    .select()
    .single();

  if (error) {
    console.error("Error creating destination:", error);
    return null;
  }

  return data;
};

export const updateDestination = async (
  id: string,
  updates: Partial<Destination>
): Promise<Destination | null> => {
  const { data, error } = await supabase
    .from("destinations")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating destination:", error);
    return null;
  }

  return data;
};

export const deleteDestination = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("destinations").delete().eq("id", id);

  if (error) {
    console.error("Error deleting destination:", error);
    return false;
  }

  return true;
};

export const hardDeleteDestination = async (id: string): Promise<void> => {
  const { error } = await supabase.from('destinations').delete().eq('id', id);
  if (error) throw error;
};

// Route Analysis
export const analyzeRoute = async (
  warehouseId: string,
  destinationIds: string[]
): Promise<RouteAnalysis | undefined> => {
  const warehouse = await getWarehouse(warehouseId);
  const { data: destinations } = await supabase
    .from("destinations")
    .select("*")
    .in("id", destinationIds);

  if (
    !warehouse ||
    !destinations ||
    !Array.isArray(destinations) ||
    destinations.length === 0
  )
    return undefined;

  // Calculate total standard distance and estimated time
  let totalDistance = 0;
  let totalMinutes = 0;

  destinations.forEach((dest) => {
    totalDistance += dest.standardDistance;
    const timeMatch = dest.estimated_time.match(/(\d+)h\s*(?:(\d+)m)?/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1] || "0");
      const minutes = parseInt(timeMatch[2] || "0");
      totalMinutes += hours * 60 + minutes;
    }
  });

  return {
    total_distance: totalDistance,
    standard_distance: totalDistance,
    deviation: 0, // This will be calculated when actual distance is known
    estimated_time: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
    waypoints: [
      { lat: warehouse.latitude, lng: warehouse.longitude },
      ...destinations.map((d) => ({ lat: d.latitude, lng: d.longitude })),
    ],
  };
};

// Generate alerts based on route analysis
const generateAlerts = async (analysis: RouteAnalysis): Promise<Alert[]> => {
  const alerts: Alert[] = [];

  if (Math.abs(analysis.deviation) > 15) {
    alerts.push({
      type: "deviation",
      message: "Significant route deviation detected",
      severity: Math.abs(analysis.deviation) > 25 ? "high" : "medium",
      details: `Route shows ${Math.abs(analysis.deviation).toFixed(
        1
      )}% deviation from standard distance`,
    });
  }

  return alerts;
};

// Vehicle stats
export const getVehicleStats = async (vehicleId: string) => {
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("vehicle_id", vehicleId);

  if (!trips || !Array.isArray(trips))
    return { totalTrips: 0, totalDistance: 0 };

  const totalTrips = trips.length;
  const totalDistance = trips.reduce(
    (sum, trip) => sum + (trip.end_km - trip.start_km),
    0
  );
  const tripsWithKmpl = trips.filter(
    (trip) => trip.calculated_kmpl !== undefined && !trip.short_trip
  );
  const averageKmpl =
    tripsWithKmpl.length > 0
      ? tripsWithKmpl.reduce(
          (sum, trip) => sum + (trip.calculated_kmpl || 0),
          0
        ) / tripsWithKmpl.length
      : undefined;

  return {
    totalTrips,
    totalDistance,
    averageKmpl,
  };
};

// Update all trip mileage
export const updateAllTripMileage = async (): Promise<void> => {
  try {
    // Add timeout to prevent hanging on CORS issues
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Request timeout - possible CORS issue")),
        15000
      )
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Error fetching user data");
      return;
    }

    const queryPromise = supabase
      .from("trips")
      .select("*")
      .eq("added_by", user.id)
      .order("trip_end_date", { ascending: true });

    const { data: trips } = (await Promise.race([
      queryPromise,
      timeoutPromise,
    ])) as any;

    if (!trips || !Array.isArray(trips)) return;

    for (const trip of trips) {
      if (trip.refueling_done && trip.fuel_quantity && trip.fuel_quantity > 0) {
        const calculatedKmpl = calculateMileage(trip, trips);

        // Add timeout for updates as well
        const updatePromise = supabase
          .from("trips")
          .update({ calculated_kmpl: calculatedKmpl })
          .eq("id", trip.id);

        const updateTimeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Update timeout - possible CORS issue")),
            10000
          )
        );

        await Promise.race([updatePromise, updateTimeoutPromise]);
      }
    }
  } catch (error) {
    console.error("Error updating trip mileage:", error);

    // Provide more specific error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("CORS")) {
        throw new Error(`Connection timeout while updating trip data. This is likely a CORS configuration issue.
        
Please ensure your Supabase project allows requests from ${window.location.origin}:
1. Go to your Supabase Dashboard
2. Navigate to Settings → API → CORS  
3. Add ${window.location.origin} to allowed origins
4. Save and reload the page`);
      }
    }

    // Re-throw network errors so they can be handled appropriately
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(`Network connection failed while updating trip mileage. This is likely a CORS issue.
      
Please configure CORS in your Supabase project to allow requests from ${window.location.origin}`);
    }

    // Also handle Supabase-specific network errors
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      (error.message.includes("Failed to fetch") ||
        error.message.includes("Network request failed") ||
        error.message.includes("fetch is not defined"))
    ) {
      throw new TypeError(`Network connection failed while updating trip mileage. 
      
This is likely a CORS configuration issue. Please add ${window.location.origin} to your Supabase CORS settings.`);
    }

    // Handle cases where the error might be wrapped
    if (
      error &&
      typeof error === "object" &&
      "error" in error &&
      error.error &&
      typeof error.error === "object" &&
      "message" in error.error &&
      typeof error.error.message === "string" &&
      error.error.message.includes("Failed to fetch")
    ) {
      throw new TypeError(`Network connection failed while updating trip mileage.
      
This is likely a CORS configuration issue. Please add ${window.location.origin} to your Supabase CORS settings.`);
    }
  }
};

// Export vehicle data to CSV
export const exportVehicleData = async (
  vehicleData: any[]
): Promise<string> => {
  // Get the current user for logging
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create CSV header and content
  let csvContent =
    "Registration Number,Make,Model,Year,Type,Fuel Type,Status,Current Odometer,Total Trips,Total Distance,Average Mileage\n";

  for (const vehicle of vehicleData) {
    const row = [
      vehicle.registration_number,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.type,
      vehicle.fuel_type,
      vehicle.status,
      vehicle.current_odometer,
      vehicle.stats?.totalTrips || 0,
      vehicle.stats?.totalDistance || 0,
      vehicle.stats?.averageKmpl ? vehicle.stats.averageKmpl.toFixed(2) : "N/A",
    ]
      .map((value) => `"${value}"`)
      .join(",");

    csvContent += row + "\n";

    // Log export activity for each vehicle
    if (user) {
      await logVehicleActivity(
        vehicle.id,
        "exported",
        user.email || user.id,
        "Vehicle data exported to CSV"
      );
    }
  }

  return csvContent;
};

export const getLatestOdometer = async (vehicleId: string): Promise<{ value: number | null; source: 'vehicle' | 'trip' | 'unknown' }> => {
  try {
    // Try to get current_odometer from the vehicle record first
    const vehicle = await getVehicle(vehicleId); // Assuming getVehicle is already imported and available
    if (vehicle && typeof vehicle.current_odometer === 'number' && !isNaN(vehicle.current_odometer)) {
      return { value: vehicle.current_odometer, source: 'vehicle' };
    }

    // If not available, query the latest trip's end_km
    const { data: latestTrip, error: tripError } = await supabase
      .from('trips')
      .select('end_km, trip_end_date')
      .eq('vehicle_id', vehicleId)
      .order('trip_end_date', { ascending: false })
      .limit(1)
      .single();

    if (tripError) {
      console.error('Error fetching latest trip for odometer:', tripError);
      return { value: null, source: 'unknown' };
    }

    if (latestTrip && typeof latestTrip.end_km === 'number' && !isNaN(latestTrip.end_km)) {
      return { value: latestTrip.end_km, source: 'trip' };
    }

    return { value: null, source: 'unknown' };
  } catch (error) {
    console.error('Exception in getLatestOdometer:', error);
    return { value: null, source: 'unknown' };
  }
};

// Upload files to Supabase Storage and get public URLs
export const uploadFilesAndGetPublicUrls = async (
  bucketName: string,
  folderPath: string,
  files: File[]
): Promise<string[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map(async (file, index) => {
    const fileName = `${Date.now()}_${index}_${file.name}`;
    const filePath = `${folderPath}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      throw error;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  });

  try {
    const publicUrls = await Promise.all(uploadPromises);
    return publicUrls;
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }
};

// Get signed URL for driver documents
export const getSignedDriverDocumentUrl = async (filePath: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage.from(BUCKETS.DRIVERS).createSignedUrl(filePath, 60 * 60 * 24); // 24 hours
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed driver document URL:', error);
    throw error;
  }
};

// Get signed URL for regular documents
export const getSignedDocumentUrl = async (filePath: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage.from('vehicle-docs').createSignedUrl(filePath, 60 * 60 * 24); // 24 hours
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed document URL:', error);
    throw error;
  }
};