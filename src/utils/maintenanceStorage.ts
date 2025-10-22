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
  // Extract service groups to handle separately
  const { service_groups, ...taskData } = task as any;

  // Make sure start_date is not empty string
  if (taskData.start_date === "") {
    logger.error("Empty start_date detected in createTask");
    throw new Error("Start date cannot be empty");
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


  // Insert the main task first to get the ID
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .insert({
      ...taskData,
      bills: taskData.bills || [],
      parts_required: taskData.parts_required || [],
      odometer_image: null, // Will be updated after upload
    })
    .select()
    .single();

  if (error) {
    handleSupabaseError('create maintenance task', error);
    throw new Error(`Error creating maintenance task: ${error.message}`);
  }

  // Handle odometer image upload with actual task ID
  if (data && taskData.odometer_image && Array.isArray(taskData.odometer_image) && taskData.odometer_image.length > 0) {
    try {
      const compressedImage = await compressImageForUpload(taskData.odometer_image[0]);
      const odometerImageUrl = await uploadServiceBill(compressedImage, data.id, 'odometer');
      
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

  // Create audit log for task creation
  if (data) {
    try {
      await createAuditLog({
        task_id: data.id,
        changes: {
          status: {
            previousValue: null,
            updatedValue: data.status,
          },
        },
      });
    } catch (error) {
      handleSupabaseError('create audit log', error);
      // Continue even if audit log creation fails
    }

    // Compute and update next due dates/odometer
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

            return {
              ...group,
              maintenance_task_id: data.id,
              bill_url: bill_urls,
              battery_warranty_url: battery_warranty_urls,
              tyre_warranty_url: tyre_warranty_urls,
              // Remove file objects as they're not for database storage
              bill_file: undefined,
              battery_warranty_file: undefined,
              tyre_warranty_file: undefined,
            };
          })
        );

        await supabase
          .from("maintenance_service_tasks")
          .insert(serviceGroupsWithTaskId);

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
  // Extract service groups to handle separately
  const { service_groups, ...updateData } = updates as any;

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
    odometerImageUrl = await uploadServiceBill(compressedImage, id, 'odometer');
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

  // Create audit log for changes
  const changes: Record<string, { previousValue: any; updatedValue: any }> = {};
  Object.keys(updateData).forEach((key) => {
    const updateKey = key as keyof MaintenanceTask;
    if (updateData[updateKey] !== oldTask[updateKey]) {
      changes[key] = {
        previousValue: oldTask[updateKey],
        updatedValue: updateData[updateKey],
      };
    }
  });

  if (Object.keys(changes).length > 0) {
    try {
      await createAuditLog({
        task_id: id,
        changes,
      });
    } catch (error) {
      handleSupabaseError('create audit log', error);
      // Continue even if audit log creation fails
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

            return {
              ...group,
              maintenance_task_id: id,
              bill_url: bill_urls,
              battery_warranty_url: battery_warranty_urls,
              tyre_warranty_url: tyre_warranty_urls,
              // Remove file objects as they're not for database storage
              bill_file: undefined,
              battery_warranty_file: undefined,
              tyre_warranty_file: undefined,
            };
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

// Audit log operations
export const getAuditLogs = async (): Promise<MaintenanceAuditLog[]> => {
  const { data, error } = await supabase
    .from("maintenance_audit_logs")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    handleSupabaseError('fetch audit logs', error);
    return [];
  }

  return data || [];
};

const createAuditLog = async (
  log: Omit<MaintenanceAuditLog, "id" | "timestamp">
): Promise<MaintenanceAuditLog | null> => {
  const { data, error } = await supabase
    .from("maintenance_audit_logs")
    .insert({
      task_id: log.task_id,
      admin_user: log.admin_user,
      changes: log.changes,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    handleSupabaseError('create audit log', error);
    throw new Error(`Error creating audit log: ${error.message}`);
  }

  return data;
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

  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}-group${groupId || Date.now()}.${fileExt}`;
  const filePath = `maintenance-bills/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("maintenance")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    handleSupabaseError('upload service bill', uploadError);
    return null;
  }

  const { data } = supabase.storage.from("maintenance").getPublicUrl(filePath);

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
    ? serviceGroups.reduce((sum, group) => sum + (group.cost || 0), 0)
    : tasks.reduce(
        (sum, task) => sum + (task.actual_cost || task.estimated_cost || 0),
        0
      );

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
        ? taskGroups.reduce((sum, group) => sum + (group.cost || 0), 0)
        : task.actual_cost || task.estimated_cost || 0;

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
        ? taskGroups.reduce((sum, group) => sum + (group.cost || 0), 0)
        : task.actual_cost || task.estimated_cost || 0;

    acc[task.vehicle_id] = (acc[task.vehicle_id] || 0) + taskCost;
    return acc;
  }, {} as Record<string, number>);

  // Calculate expenditure by vendor (using service groups)
  const expenditure_by_vendor = Array.isArray(serviceGroups)
    ? serviceGroups.reduce((acc, group) => {
        if (group.vendor_id) {
          acc[group.vendor_id] =
            (acc[group.vendor_id] || 0) + (group.cost || 0);
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