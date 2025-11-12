// DEPLOYMENT VERIFICATION: Updated 2025-11-11 - Schema cache fix applied
// This file contains fixes for actual_cost/estimated_cost removal and parts_data mapping
import {
  MaintenanceTask,
  MaintenanceStats,
  MaintenanceAuditLog,
  MaintenanceServiceGroup,
} from "@/types/maintenance";
import { supabase } from "./supabaseClient";
import { computeNextDueFromLast } from "./serviceDue";
import { getLatestOdometer, getVehicle } from "./storage";
import { handleSupabaseError } from "./errors";
import { clearVehiclePredictionCache } from "./maintenancePredictor";
import { createLogger } from './logger';
import { getCurrentUserId, getUserActiveOrganization, withOwner } from './supaHelpers';

const logger = createLogger('maintenanceStorage');

// CRASH-PROOF: Compress images before upload to prevent main thread blocking
const compressImageForUpload = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    // Only compress if it's an image and larger than 1MB
    if (!file.type.startsWith('image/') || file.size <= 1024 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 1920px width)
        let width = img.width;
        let height = img.height;
        const maxWidth = 1920;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              logger.debug(`📸 Odometer image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      
      img.onerror = () => resolve(file);
    };
    
    reader.onerror = () => resolve(file);
  });
};

// Tasks CRUD operations
export const getTasks = async (): Promise<MaintenanceTask[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.error("Error fetching user data");
    return [];
  }
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .eq("added_by", user.id)
    .order("start_date", { ascending: false });

  if (error) {
    handleSupabaseError('fetch maintenance tasks', error);
    return [];
  }

  // Fetch service groups for each task
  const tasks = await Promise.all(
    (data || []).map(async (task) => {
      const { data: serviceGroups, error: serviceGroupsError } = await supabase
        .from("maintenance_service_tasks")
        .select("*")
        .eq("maintenance_task_id", task.id);

      if (serviceGroupsError) {
        handleSupabaseError('fetch service groups', serviceGroupsError);
        return task;
      }

      return {
        ...task,
        service_groups: serviceGroups || [],
      };
    })
  );

  return tasks;
};

export const getTask = async (id: string): Promise<MaintenanceTask | null> => {
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    handleSupabaseError('fetch maintenance task', error);
    return null;
  }

  // Fetch service groups
  const { data: serviceGroups, error: serviceGroupsError } = await supabase
    .from("maintenance_service_tasks")
    .select("*")
    .eq("maintenance_task_id", id);

  if (serviceGroupsError) {
    handleSupabaseError('fetch service groups', serviceGroupsError);
    return data;
  }

  return {
    ...data,
    service_groups: serviceGroups || [],
  };
};

export const createTask = async (
  task: Omit<MaintenanceTask, "id" | "created_at" | "updated_at">
): Promise<MaintenanceTask | null> => {
  // Extract service groups and cost fields to handle separately
  const { service_groups, estimated_cost, total_cost, ...taskData } = task as any;

  // Make sure start_date is not empty string
  if (taskData.start_date === "") {
    logger.error("Empty start_date detected in createTask");
    throw new Error("Start date cannot be empty");
  }

  // Make sure end_date is not empty string - if empty, use start_date
  if (taskData.end_date === "" || !taskData.end_date) {
    logger.warn("Empty or missing end_date detected, using start_date as fallback");
    taskData.end_date = taskData.start_date;
  }

  // If garage_id is not provided, use vendor_id from the first service group
  if (
    !taskData.garage_id &&
    service_groups &&
    service_groups.length > 0 &&
    service_groups[0].vendor_id
  ) {
    taskData.garage_id = service_groups[0].vendor_id;
  }

  // Make sure required fields are present
  if (!taskData.garage_id) {
    logger.error("Missing garage_id in createTask");
    throw new Error("Garage ID is required");
  }

  // Get user ID and organization ID for multi-tenant support
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.error("User not authenticated in createTask");
    throw new Error("User not authenticated");
  }

  const organizationId = await getUserActiveOrganization(userId);
  if (!organizationId) {
    logger.error("No organization found for user in createTask");
    throw new Error("No organization selected. Please select an organization.");
  }

  // Use withOwner to add both created_by and organization_id
  const payload = withOwner({
    ...taskData,
    bills: taskData.bills || [],
    parts_required: taskData.parts_required || [],
    odometer_image: null, // Will be updated after upload
  }, userId, organizationId);

  // ========================================
  // 📝 COMPREHENSIVE DEBUG LOGGING - MAIN TASK
  // ========================================
  console.group('📝 MAINTENANCE TASK DEBUG - CREATE');

  console.group('1️⃣ MAIN TASK FIELDS');
  console.log('✅ Vehicle ID:', payload.vehicle_id, typeof payload.vehicle_id);
  console.log('✅ Task Type:', payload.task_type);
  console.log('✅ Title:', payload.title, Array.isArray(payload.title) ? `(array of ${payload.title.length})` : typeof payload.title);
  console.log('✅ Description:', payload.description, `(length: ${payload.description?.length || 0})`);
  console.log('✅ Status:', payload.status);
  console.log('✅ Priority:', payload.priority);
  console.log('✅ Garage ID:', payload.garage_id);
  console.log('💰 Cost Note: estimated_cost and total_cost excluded (DB auto-calculates total_cost)');
  console.log('📅 Start Date:', payload.start_date);
  console.log('📅 End Date:', payload.end_date);
  console.log('⏱️ Downtime Days:', payload.downtime_days, typeof payload.downtime_days);
  console.log('⏱️ Downtime Hours:', payload.downtime_hours, typeof payload.downtime_hours);
  console.log('🚗 Odometer Reading:', payload.odometer_reading, typeof payload.odometer_reading);
  console.log('📷 Odometer Image:', payload.odometer_image || '(none)');
  console.log('📋 Complaint:', payload.complaint_description, `(length: ${payload.complaint_description?.length || 0})`);
  console.log('✔️ Resolution:', payload.resolution_summary, `(length: ${payload.resolution_summary?.length || 0})`);
  console.log('🏢 Organization ID:', organizationId);
  console.log('👤 Created By:', userId);
  console.groupEnd();

  console.group('2️⃣ SERVICE GROUPS (before processing)');
  console.log('Service Groups Count:', service_groups?.length || 0);
  if (service_groups && service_groups.length > 0) {
    service_groups.forEach((group: any, idx: number) => {
      console.group(`Group ${idx + 1}`);
      console.log('🔧 Service Type:', group.serviceType || group.service_type || '(not set)');
      console.log('👤 Vendor:', group.vendor || group.vendor_id || '(not set)');
      console.log('📋 Tasks:', group.tasks, Array.isArray(group.tasks) ? `(array of ${group.tasks.length})` : typeof group.tasks);
      console.log('💰 Cost:', group.cost, typeof group.cost);
      console.log('📝 Notes:', group.notes, `(length: ${group.notes?.length || 0})`);
      console.log('📄 Bill Files:', group.bill_file, Array.isArray(group.bill_file) ? `(${group.bill_file.length} files)` : typeof group.bill_file);

      if (group.batteryData || group.battery_tracking) {
        console.group('🔋 Battery Data');
        console.log('Tracking:', group.battery_tracking || false);
        console.log('Serial:', group.batteryData?.serialNumber || group.battery_serial || '(not set)');
        console.log('Brand:', group.batteryData?.brand || group.battery_brand || '(not set)');
        console.log('Warranty Files:', group.battery_warranty_file, Array.isArray(group.battery_warranty_file) ? `(${group.battery_warranty_file.length} files)` : typeof group.battery_warranty_file);
        console.groupEnd();
      }

      if (group.tyreData || group.tyre_tracking) {
        console.group('🛞 Tyre Data');
        console.log('Tracking:', group.tyre_tracking || false);
        console.log('Positions:', group.tyreData?.positions || group.tyre_positions || [], Array.isArray(group.tyreData?.positions) ? `(${group.tyreData.positions.length} selected)` : '(not array)');
        console.log('Brand:', group.tyreData?.brand || group.tyre_brand || '(not set)');
        console.log('Serials:', group.tyreData?.serialNumbers || group.tyre_serials || '(not set)');
        console.log('Warranty Files:', group.tyre_warranty_file, Array.isArray(group.tyre_warranty_file) ? `(${group.tyre_warranty_file.length} files)` : typeof group.tyre_warranty_file);
        console.groupEnd();
      }

      if (group.partsData && Array.isArray(group.partsData) && group.partsData.length > 0) {
        console.group('🔩 Parts Data');
        console.log('Parts Count:', group.partsData.length);
        group.partsData.forEach((part: any, pIdx: number) => {
          console.log(`Part ${pIdx + 1}:`, {
            type: part.partType,
            name: part.partName,
            brand: part.brand,
            serial: part.serialNumber,
            quantity: part.quantity
          });
        });
        console.groupEnd();
      }

      console.groupEnd();
    });
  }
  console.groupEnd();

  console.groupEnd();
  // ========================================

  logger.debug(`Creating maintenance task for organization: ${organizationId}`);

  // Insert the main task first to get the ID
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .insert(payload)
    .select()
    .single();

  if (error) {
    handleSupabaseError('create maintenance task', error);
    throw new Error(`Error creating maintenance task: ${error.message}`);
  }

  // Add maintenance task to events feed for AI Alerts timeline
  if (data) {
    try {
      const { error: feedError } = await supabase
        .from('events_feed')
        .insert({
          kind: 'maintenance',
          event_time: new Date().toISOString(), // Use NOW() for chronological feed ordering
          priority: data.priority === 'high' ? 'warn' : 'info',
          title: `Maintenance Task Created${data.priority === 'high' ? ' (High Priority)' : ''}`,
          description: `${data.type || 'Service'} scheduled for vehicle at ${data.odometer_reading} km`,
          entity_json: {
            task_id: data.id,
            vehicle_id: data.vehicle_id,
            type: data.type,
            priority: data.priority,
            status: data.status,
            odometer_reading: data.odometer_reading,
            garage_id: data.garage_id,
            scheduled_date: data.start_date // Store scheduled date in metadata
          },
          status: data.status,
          metadata: {
            source: 'maintenance_task_creation'
          },
          organization_id: data.organization_id
        });

      if (feedError) {
        logger.error('Failed to create feed event:', feedError);
        // Don't throw - feed event is not critical
      } else {
        logger.debug('✅ Maintenance task added to events feed');
      }
    } catch (feedError) {
      logger.error('Exception adding to events feed:', feedError);
      // Continue - feed event is not critical
    }
  }

  // Handle odometer image upload with actual task ID
  if (data && taskData.odometer_image && Array.isArray(taskData.odometer_image) && taskData.odometer_image.length > 0) {
    try {
      const compressedImage = await compressImageForUpload(taskData.odometer_image[0]);
      const odometerImageUrl = await uploadOdometerImage(compressedImage, data.id);
      
      if (odometerImageUrl) {
        await supabase
          .from("maintenance_tasks")
          .update({ odometer_image: odometerImageUrl })
          .eq("id", data.id);
        
        data.odometer_image = odometerImageUrl;
      }
    } catch (uploadError) {
      logger.error("Failed to upload odometer image:", uploadError);
      // Continue without failing the entire task creation
    }
  }

  // Compute and update next due dates/odometer
  if (data) {
    try {
      await updateNextDueForTask(data.id, data.vehicle_id, data.odometer_reading, data.start_date);
    } catch (error) {
      handleSupabaseError('compute next due for task', error);
      // Continue even if next due computation fails
    }

    // Clear prediction cache for this vehicle since maintenance data has changed
    clearVehiclePredictionCache(data.vehicle_id);

    // Insert service groups if any
    if (service_groups && service_groups.length > 0) {
      try {
        const serviceGroupsWithTaskId = await Promise.all(
          service_groups.map(async (group: any) => {
            // CRASH-PROOF: Handle file uploads for bills with compression
            const bill_urls: string[] = [];
            if (group.bill_file && Array.isArray(group.bill_file)) {
              for (const file of group.bill_file) {
                const compressedFile = await compressImageForUpload(file);
                const url = await uploadServiceBill(compressedFile, data.id, group.id);
                if (url) bill_urls.push(url);
              }
            }

            // CRASH-PROOF: Handle battery warranty file uploads with compression
            const battery_warranty_urls: string[] = [];
            if (group.battery_warranty_file && Array.isArray(group.battery_warranty_file)) {
              for (const file of group.battery_warranty_file) {
                const compressedFile = await compressImageForUpload(file);
                const url = await uploadServiceBill(compressedFile, data.id, `battery-${group.id}`);
                if (url) battery_warranty_urls.push(url);
              }
            }

            // CRASH-PROOF: Handle tyre warranty file uploads with compression
            const tyre_warranty_urls: string[] = [];
            if (group.tyre_warranty_file && Array.isArray(group.tyre_warranty_file)) {
              for (const file of group.tyre_warranty_file) {
                const compressedFile = await compressImageForUpload(file);
                const url = await uploadServiceBill(compressedFile, data.id, `tyre-${group.id}`);
                if (url) tyre_warranty_urls.push(url);
              }
            }

            // Destructure to remove File fields and prepare database object
            const {
              id, // Remove 'id' field (UI timestamp, DB auto-generates UUID)
              bill_file,
              battery_warranty_file,
              tyre_warranty_file,
              batteryData,
              tyreData,
              partsData,
              serviceType,
              bills, // Remove 'bills' field (used in UI, not in DB)
              batteryWarrantyFiles, // Remove file arrays from UI
              tyreWarrantyFiles, // Remove file arrays from UI
              parts, // Remove 'parts' field (legacy, not in DB schema)
              vendor, // Remove 'vendor' field (UI has name, DB has vendor_id UUID)
              tasks, // Remove 'tasks' field - will be added after conversion below
              ...groupWithoutFiles
            } = group;

            const dbGroup: any = {
              ...groupWithoutFiles,
              maintenance_task_id: data.id,
              organization_id: data.organization_id, // Copy organization_id from parent task
              service_type: serviceType || 'both', // Add service_type field
              tasks: group.tasks || [], // Keep tasks array (should already be converted to UUIDs by this point)
              bill_url: bill_urls,
              battery_warranty_url: battery_warranty_urls,
              tyre_warranty_url: tyre_warranty_urls,
            };

            // Map battery data to JSONB if present
            if (batteryData && batteryData.serialNumber) {
              dbGroup.battery_data = {
                serialNumber: batteryData.serialNumber,
                brand: batteryData.brand || '',
              };
            }

            // Map tyre data to JSONB if present
            if (tyreData && tyreData.positions && tyreData.positions.length > 0) {
              dbGroup.tyre_data = {
                positions: tyreData.positions,
                brand: tyreData.brand || '',
                serialNumbers: tyreData.serialNumbers || '',
              };
            }

            // Map parts data to JSONB if present
            if (partsData && Array.isArray(partsData) && partsData.length > 0) {
              dbGroup.parts_data = partsData;
            }

            return dbGroup;
          })
        );

        // ========================================
        // 🔍 DETAILED SERVICE GROUP DEBUG LOGGING
        // ========================================
        console.group('3️⃣ SERVICE GROUPS (after processing - FINAL DATABASE FORMAT)');
        console.log('📊 Total groups to insert:', serviceGroupsWithTaskId.length);
        console.log('📄 Full JSON:', JSON.stringify(serviceGroupsWithTaskId, null, 2));

        serviceGroupsWithTaskId.forEach((group, idx) => {
          console.group(`🔧 Group ${idx + 1} - Database Format`);

          console.log('👤 vendor_id:', group.vendor_id, typeof group.vendor_id, group.vendor_id ? '✅' : '❌ EMPTY');
          console.log('📋 tasks:', group.tasks);
          console.log('   ├─ Type:', Array.isArray(group.tasks) ? '✅ array' : `❌ ${typeof group.tasks} (should be array!)`);
          console.log('   ├─ Length:', Array.isArray(group.tasks) ? group.tasks.length : 'N/A');
          console.log('   └─ Values:', Array.isArray(group.tasks) ? group.tasks.map(t => `${t.substring(0, 8)}...`) : 'NOT AN ARRAY');

          console.log('💰 cost:', group.cost, typeof group.cost);
          console.log('🔧 service_type:', group.service_type, group.service_type ? '✅' : '⚠️ missing');
          console.log('📝 notes:', group.notes, group.notes ? `(${group.notes.length} chars)` : '(empty)');

          console.log('📄 bill_url:', group.bill_url);
          console.log('   ├─ Type:', Array.isArray(group.bill_url) ? '✅ array' : `❌ ${typeof group.bill_url} (should be array!)`);
          console.log('   └─ Count:', Array.isArray(group.bill_url) ? group.bill_url.length : 'NOT AN ARRAY');

          console.log('🔋 battery_warranty_url:', Array.isArray(group.battery_warranty_url) ? `✅ array (${group.battery_warranty_url.length})` : `❌ ${typeof group.battery_warranty_url}`);
          console.log('🛞 tyre_warranty_url:', Array.isArray(group.tyre_warranty_url) ? `✅ array (${group.tyre_warranty_url.length})` : `❌ ${typeof group.tyre_warranty_url}`);

          if (group.battery_data) {
            console.group('🔋 battery_data (JSONB)');
            console.log('Serial:', group.battery_data.serialNumber);
            console.log('Brand:', group.battery_data.brand);
            console.log('Type:', typeof group.battery_data);
            console.groupEnd();
          } else {
            console.log('🔋 battery_data: (none)');
          }

          if (group.tyre_data) {
            console.group('🛞 tyre_data (JSONB)');
            console.log('Positions:', group.tyre_data.positions, Array.isArray(group.tyre_data.positions) ? `✅ array (${group.tyre_data.positions.length})` : '❌ not array');
            console.log('Brand:', group.tyre_data.brand);
            console.log('Serials:', group.tyre_data.serialNumbers);
            console.log('Type:', typeof group.tyre_data);
            console.groupEnd();
          } else {
            console.log('🛞 tyre_data: (none)');
          }

          if (group.parts_data && Array.isArray(group.parts_data) && group.parts_data.length > 0) {
            console.group('🔩 parts_data (JSONB Array)');
            console.log('Count:', group.parts_data.length);
            console.log('Type:', Array.isArray(group.parts_data) ? '✅ array' : `❌ ${typeof group.parts_data}`);
            group.parts_data.forEach((part: any, pIdx: number) => {
              console.log(`Part ${pIdx + 1}:`, part);
            });
            console.groupEnd();
          } else {
            console.log('🔩 parts_data: (none)');
          }

          console.groupEnd();
        });

        console.groupEnd();
        // ========================================

        const { data: insertResult, error: insertError } = await supabase
          .from("maintenance_service_tasks")
          .insert(serviceGroupsWithTaskId);

        if (insertError) {
          console.error('❌ DEBUG: Insert failed with error:', insertError);
          console.error('❌ DEBUG: Error code:', insertError.code);
          console.error('❌ DEBUG: Error message:', insertError.message);
          console.error('❌ DEBUG: Error details:', insertError.details);
          console.error('❌ DEBUG: Error hint:', insertError.hint);
          throw insertError;
        }

        console.log('✅ DEBUG: Insert successful:', insertResult);

        // Fetch the inserted service groups
        const { data: insertedGroups } = await supabase
          .from("maintenance_service_tasks")
          .select("*")
          .eq("maintenance_task_id", data.id);

        return {
          ...data,
          service_groups: insertedGroups || [],
        };
      } catch (error) {
        handleSupabaseError('create service groups', error);
        // Return the task even if service groups failed
        return data;
      }
    }
  }

  return data;
};

export const updateTask = async (
  id: string,
  updates: Partial<MaintenanceTask>
): Promise<MaintenanceTask | null> => {
  // Extract service groups and generated columns to handle separately
  const { service_groups, total_downtime_hours, ...updateData } = updates as any;

  // Note: total_downtime_hours is a GENERATED column in the database
  // It's automatically calculated as (downtime_days * 24) + downtime_hours
  // We must not include it in UPDATE operations

  // Get the old task first to compare changes
  const { data: oldTask } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (!oldTask) {
    logger.error("Task not found:", id);
    return null;
  }

  // Make sure start_date is not empty string
  if (updateData.start_date === "") {
    logger.error("Empty start_date detected in updateTask");
    throw new Error("Start date cannot be empty");
  }

  // If garage_id is not provided, use vendor_id from the first service group
  if (
    !updateData.garage_id &&
    service_groups &&
    service_groups.length > 0 &&
    service_groups[0].vendor_id
  ) {
    updateData.garage_id = service_groups[0].vendor_id;
  }

  // Make sure required fields are preserved
  if (updateData.garage_id === undefined && oldTask.garage_id) {
    updateData.garage_id = oldTask.garage_id;
  }

  // CRASH-PROOF: Handle odometer image upload for updates with compression
  let odometerImageUrl: string | null = null;
  if (updateData.odometer_image && Array.isArray(updateData.odometer_image) && updateData.odometer_image.length > 0) {
    // Compress image before upload to prevent main thread blocking
    const compressedImage = await compressImageForUpload(updateData.odometer_image[0]);
    odometerImageUrl = await uploadOdometerImage(compressedImage, id);
  }

  // Update the task
  const { data: updatedTask, error } = await supabase
    .from("maintenance_tasks")
    .update({
      ...updateData,
      odometer_image: odometerImageUrl || updateData.odometer_image,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    handleSupabaseError('update maintenance task', error);
    throw new Error(`Error updating maintenance task: ${error.message}`);
  }

  // Add feed event if status changed to completed
  if (updatedTask && updateData.status === 'completed' && oldTask.status !== 'completed') {
    try {
      const { error: feedError } = await supabase
        .from('events_feed')
        .insert({
          kind: 'maintenance',
          event_time: new Date().toISOString(), // Use NOW() for chronological feed ordering
          priority: 'info',
          title: 'Maintenance Task Completed',
          description: `${updatedTask.type || 'Service'} completed for vehicle at ${updatedTask.odometer_reading} km`,
          entity_json: {
            task_id: updatedTask.id,
            vehicle_id: updatedTask.vehicle_id,
            type: updatedTask.type,
            priority: updatedTask.priority,
            status: updatedTask.status,
            odometer_reading: updatedTask.odometer_reading,
            garage_id: updatedTask.garage_id,
            completed_date: updatedTask.end_date // Store completion date in metadata
          },
          status: 'completed',
          metadata: {
            source: 'maintenance_task_completion'
          },
          organization_id: updatedTask.organization_id
        });

      if (feedError) {
        logger.error('Failed to create completion feed event:', feedError);
      } else {
        logger.debug('✅ Maintenance completion added to events feed');
      }
    } catch (feedError) {
      logger.error('Exception adding completion to events feed:', feedError);
    }
  }

  // Compute and update next due dates/odometer if relevant fields changed
  if (updateData.odometer_reading || updateData.start_date || updateData.vehicle_id) {
    try {
      const finalOdometer = updateData.odometer_reading || oldTask.odometer_reading;
      const finalStartDate = updateData.start_date || oldTask.start_date;
      const finalVehicleId = updateData.vehicle_id || oldTask.vehicle_id;
      
      await updateNextDueForTask(id, finalVehicleId, finalOdometer, finalStartDate);
    } catch (error) {
      handleSupabaseError('compute next due for updated task', error);
      // Continue even if next due computation fails
    }
  }

  // Clear prediction cache for this vehicle since maintenance data has changed
  const vehicleId = updateData.vehicle_id || oldTask.vehicle_id;
  clearVehiclePredictionCache(vehicleId);

  // Handle service groups update
  if (service_groups && updatedTask) {
    try {
      // First delete existing service groups
      await supabase
        .from("maintenance_service_tasks")
        .delete()
        .eq("maintenance_task_id", id);

      // Then insert the updated ones
      if (service_groups.length > 0) {
        const serviceGroupsWithTaskId = await Promise.all(
          service_groups.map(async (group: any) => {
            // Handle file uploads for bills
            const bill_urls: string[] = [];
            if (group.bill_file && Array.isArray(group.bill_file)) {
              for (const file of group.bill_file) {
                const url = await uploadServiceBill(file, id, group.id);
                if (url) bill_urls.push(url);
              }
            }

            // Handle battery warranty file uploads
            const battery_warranty_urls: string[] = [];
            if (group.battery_warranty_file && Array.isArray(group.battery_warranty_file)) {
              for (const file of group.battery_warranty_file) {
                const url = await uploadServiceBill(file, id, `battery-${group.id}`);
                if (url) battery_warranty_urls.push(url);
              }
            }

            // Handle tyre warranty file uploads
            const tyre_warranty_urls: string[] = [];
            if (group.tyre_warranty_file && Array.isArray(group.tyre_warranty_file)) {
              for (const file of group.tyre_warranty_file) {
                const url = await uploadServiceBill(file, id, `tyre-${group.id}`);
                if (url) tyre_warranty_urls.push(url);
              }
            }

            // Destructure to remove File fields and prepare database object
            const {
              id, // Remove 'id' field (UI timestamp, DB auto-generates UUID)
              bill_file,
              battery_warranty_file,
              tyre_warranty_file,
              batteryData,
              tyreData,
              partsData,
              serviceType,
              bills, // Remove 'bills' field (used in UI, not in DB)
              batteryWarrantyFiles, // Remove file arrays from UI
              tyreWarrantyFiles, // Remove file arrays from UI
              parts, // Remove 'parts' field (legacy, not in DB schema)
              vendor, // Remove 'vendor' field (UI has name, DB has vendor_id UUID)
              tasks, // Remove 'tasks' field - will be added after conversion below
              ...groupWithoutFiles
            } = group;

            const dbGroup: any = {
              ...groupWithoutFiles,
              maintenance_task_id: id,
              organization_id: oldTask.organization_id, // Copy organization_id from parent task
              service_type: serviceType || 'both', // Add service_type field
              tasks: group.tasks || [], // Keep tasks array (should already be converted to UUIDs by this point)
              bill_url: bill_urls,
              battery_warranty_url: battery_warranty_urls,
              tyre_warranty_url: tyre_warranty_urls,
            };

            // Map battery data to JSONB if present
            if (batteryData && batteryData.serialNumber) {
              dbGroup.battery_data = {
                serialNumber: batteryData.serialNumber,
                brand: batteryData.brand || '',
              };
            }

            // Map tyre data to JSONB if present
            if (tyreData && tyreData.positions && tyreData.positions.length > 0) {
              dbGroup.tyre_data = {
                positions: tyreData.positions,
                brand: tyreData.brand || '',
                serialNumbers: tyreData.serialNumbers || '',
              };
            }

            // Map parts data to JSONB if present
            if (partsData && Array.isArray(partsData) && partsData.length > 0) {
              dbGroup.parts_data = partsData;
            }

            return dbGroup;
          })
        );

        await supabase
          .from("maintenance_service_tasks")
          .insert(serviceGroupsWithTaskId);
      }

      // Fetch the inserted service groups
      const { data: insertedGroups } = await supabase
        .from("maintenance_service_tasks")
        .select("*")
        .eq("maintenance_task_id", id);

      return {
        ...updatedTask,
        service_groups: insertedGroups || [],
      };
    } catch (error) {
      handleSupabaseError('update service groups', error);
      // Return the task even if service groups failed
      return updatedTask;
    }
  }

  return updatedTask || null;
};

export const deleteTask = async (id: string): Promise<boolean> => {
  // First delete the service groups (should cascade, but let's be explicit)
  await supabase
    .from("maintenance_service_tasks")
    .delete()
    .eq("maintenance_task_id", id);

  // Then delete the main task
  const { error } = await supabase
    .from("maintenance_tasks")
    .delete()
    .eq("id", id);

  if (error) {
    handleSupabaseError('delete maintenance task', error);
    return false;
  }

  return true;
};

// Helper function to compute and update next due for a maintenance task
const updateNextDueForTask = async (
  taskId: string,
  vehicleId: string,
  odometerReading: number,
  startDate: string
): Promise<void> => {
  try {
    // Get vehicle service intervals
    const vehicle = await getVehicle(vehicleId);
    if (!vehicle) return;

    const intervalKm = vehicle.service_interval_km;
    const intervalDays = vehicle.service_interval_days;

    // Skip if no intervals are configured
    if (!intervalKm && !intervalDays) return;

    // Use current task as the "last service"
    const lastServiceOdo = odometerReading;
    const lastServiceDate = startDate;

    // Compute next due
    const nextDue = computeNextDueFromLast({
      lastServiceOdo,
      lastServiceDate,
      intervalKm,
      intervalDays
    });

    // Update the task with computed next due values
    if (nextDue.nextDueOdo || nextDue.nextDueDate) {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({
          next_due_odometer: nextDue.nextDueOdo || null,
          next_due_date: nextDue.nextDueDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) {
        handleSupabaseError('update next due for task', error);
      }
    }
  } catch (error) {
    handleSupabaseError('update next due for task', error);
  }
};

// Service groups operations
const getServiceGroups = async (
  taskId: string
): Promise<MaintenanceServiceGroup[]> => {
  const { data, error } = await supabase
    .from("maintenance_service_tasks")
    .select("*")
    .eq("maintenance_task_id", taskId);

  if (error) {
    handleSupabaseError('fetch service groups', error);
    return [];
  }

  return data || [];
};

// Upload service group bill
export const uploadServiceBill = async (
  file: File,
  taskId: string,
  groupId?: string
): Promise<string | null> => {
  if (!file) return null;

  // Get organization ID for multi-tenant file storage
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.error("User not authenticated for file upload");
    return null;
  }

  const organizationId = await getUserActiveOrganization(userId);
  if (!organizationId) {
    logger.error("No organization found for file upload");
    return null;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}-group${groupId || Date.now()}.${fileExt}`;
  // Path structure required by RLS policy: {org-id}/tasks/{task-id}/bills/{filename}
  const filePath = `${organizationId}/tasks/${taskId}/bills/${fileName}`;

  logger.debug('📤 Attempting to upload service bill:', {
    bucketId: 'maintenance-bills',
    organizationId: organizationId,
    fileName: fileName,
    filePath: filePath,
    fileSize: file.size,
    fileType: file.type
  });

  const { error: uploadError } = await supabase.storage
    .from("maintenance-bills")  // ✅ FIXED: Use new bucket
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    logger.error('❌ Storage upload failed:', {
      error: uploadError,
      message: uploadError.message,
      statusCode: (uploadError as any).statusCode,
      details: uploadError
    });
    handleSupabaseError('upload service bill', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from("maintenance-bills")  // ✅ FIXED: Use new bucket
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Upload odometer image
export const uploadOdometerImage = async (
  file: File,
  taskId: string
): Promise<string | null> => {
  if (!file) return null;

  // Get organization ID for multi-tenant file storage
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.error("User not authenticated for odometer upload");
    return null;
  }

  const organizationId = await getUserActiveOrganization(userId);
  if (!organizationId) {
    logger.error("No organization found for odometer upload");
    return null;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}-odometer.${fileExt}`;
  // Path structure required by RLS policy: {org-id}/tasks/{task-id}/odometer/{filename}
  const filePath = `${organizationId}/tasks/${taskId}/odometer/${fileName}`;

  logger.debug('📤 Uploading odometer image:', {
    organizationId,
    taskId,
    fileName,
    filePath
  });

  const { error: uploadError } = await supabase.storage
    .from("maintenance-bills")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    handleSupabaseError('upload odometer image', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from("maintenance-bills")
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Upload supporting document
export const uploadSupportingDocument = async (
  file: File,
  taskId: string,
  index: number
): Promise<string | null> => {
  if (!file) return null;

  // Get organization ID for multi-tenant file storage
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.error("User not authenticated for supporting document upload");
    return null;
  }

  const organizationId = await getUserActiveOrganization(userId);
  if (!organizationId) {
    logger.error("No organization found for supporting document upload");
    return null;
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}-document-${index}.${fileExt}`;
  // Path structure required by RLS policy: {org-id}/tasks/{task-id}/documents/{filename}
  const filePath = `${organizationId}/tasks/${taskId}/documents/${fileName}`;

  logger.debug('📤 Uploading supporting document:', {
    organizationId,
    taskId,
    index,
    fileName,
    filePath
  });

  const { error: uploadError } = await supabase.storage
    .from("maintenance-bills")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    handleSupabaseError('upload supporting document', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from("maintenance-bills")
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Statistics
const getMaintenanceStats = async (): Promise<MaintenanceStats> => {
  const { data: tasks } = await supabase.from("maintenance_tasks").select("*");

  // Also fetch service groups to get accurate cost data
  const { data: serviceGroups } = await supabase
    .from("maintenance_service_tasks")
    .select("*");

  if (!tasks || !Array.isArray(tasks)) {
    return {
      total_expenditure: 0,
      record_count: 0,
      average_monthly_expense: 0,
      average_task_cost: 0,
      expenditure_by_vehicle: {},
      expenditure_by_vendor: {},
      km_reading_difference: {},
      vehicle_downtime: {},
      average_completion_time: 0,
      total_tasks: 0,
      pending_tasks: 0,
    };
  }

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Calculate total expenditure from service groups
  const total_expenditure = Array.isArray(serviceGroups)
    ? serviceGroups.reduce((sum, group) => sum + (group.service_cost || group.cost || 0), 0)
    : 0; // No service groups = no cost data

  // Calculate monthly expenses
  const monthlyExpenses = tasks.reduce((acc, task) => {
    const taskDate = new Date(task.start_date);
    const monthKey = `${taskDate.getFullYear()}-${taskDate.getMonth()}`;

    // Get costs from service groups for this task
    const taskGroups = Array.isArray(serviceGroups)
      ? serviceGroups.filter((group) => group.maintenance_task_id === task.id)
      : [];

    const taskCost =
      taskGroups.length > 0
        ? taskGroups.reduce((sum, group) => sum + (group.service_cost || group.cost || 0), 0)
        : 0; // No service groups = no cost data

    acc[monthKey] = (acc[monthKey] || 0) + taskCost;
    return acc;
  }, {} as Record<string, number>);

  const average_monthly_expense =
    Object.values(monthlyExpenses).reduce((sum, val) => sum + val, 0) /
    Math.max(Object.keys(monthlyExpenses).length, 1);

  // Calculate average task cost
  const average_task_cost = total_expenditure / Math.max(tasks.length, 1);

  // Calculate expenditure by vehicle
  const expenditure_by_vehicle = tasks.reduce((acc, task) => {
    // Get costs from service groups for this task
    const taskGroups = Array.isArray(serviceGroups)
      ? serviceGroups.filter((group) => group.maintenance_task_id === task.id)
      : [];

    const taskCost =
      taskGroups.length > 0
        ? taskGroups.reduce((sum, group) => sum + (group.service_cost || group.cost || 0), 0)
        : 0; // No service groups = no cost data

    acc[task.vehicle_id] = (acc[task.vehicle_id] || 0) + taskCost;
    return acc;
  }, {} as Record<string, number>);

  // Calculate expenditure by vendor (using service groups)
  const expenditure_by_vendor = Array.isArray(serviceGroups)
    ? serviceGroups.reduce((acc, group) => {
        if (group.vendor_id) {
          acc[group.vendor_id] =
            (acc[group.vendor_id] || 0) + (group.service_cost || group.cost || 0);
        }
        return acc;
      }, {} as Record<string, number>)
    : {};

  // Calculate KM reading differences
  const km_reading_difference = tasks.reduce((acc, task) => {
    acc[task.vehicle_id] = task.odometer_reading;
    return acc;
  }, {} as Record<string, number>);

  // Calculate vehicle downtime
  const vehicle_downtime = tasks.reduce((acc, task) => {
    const taskDate = new Date(task.start_date);
    if (taskDate >= lastMonth) {
      acc[task.vehicle_id] =
        (acc[task.vehicle_id] || 0) + (task.downtime_days || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate average completion time for resolved tasks
  const completedTasks = tasks.filter(
    (task) => task.status === "resolved" && task.start_date && task.end_date
  );

  const totalCompletionTime = completedTasks.reduce((sum, task) => {
    const start = new Date(task.start_date);
    const end = new Date(task.end_date!);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  }, 0);

  const average_completion_time =
    completedTasks.length > 0 ? totalCompletionTime / completedTasks.length : 0;

  // Count total and pending tasks
  const total_tasks = tasks.length;
  const pending_tasks = tasks.filter(
    (task) =>
      task.status === "open" ||
      task.status === "in_progress" ||
      task.status === "escalated"
  ).length;

  return {
    total_expenditure,
    record_count: tasks.length,
    average_monthly_expense,
    average_task_cost,
    expenditure_by_vehicle,
    expenditure_by_vendor,
    km_reading_difference,
    vehicle_downtime,
    average_completion_time,
    total_tasks,
    pending_tasks,
  };
};