import { 
  MaintenanceTask, 
  MaintenanceStats,
  MaintenanceAuditLog,
  MaintenanceServiceGroup
} from '../types/maintenance';
import { supabase } from './supabaseClient';

// Tasks CRUD operations
export const getTasks = async (): Promise<MaintenanceTask[]> => {
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching maintenance tasks:', error);
    return [];
  }

  // Fetch service groups for each task
  const tasks = await Promise.all((data || []).map(async (task) => {
    const { data: serviceGroups, error: serviceGroupsError } = await supabase
      .from('maintenance_service_tasks')
      .select('*')
      .eq('maintenance_task_id', task.id);
    
    if (serviceGroupsError) {
      console.error('Error fetching service groups:', serviceGroupsError);
      return task;
    }
    
    return {
      ...task,
      service_groups: serviceGroups || []
    };
  }));

  return tasks;
};

export const getTask = async (id: string): Promise<MaintenanceTask | null> => {
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching maintenance task:', error);
    return null;
  }

  // Fetch service groups
  const { data: serviceGroups, error: serviceGroupsError } = await supabase
    .from('maintenance_service_tasks')
    .select('*')
    .eq('maintenance_task_id', id);

  if (serviceGroupsError) {
    console.error('Error fetching service groups:', serviceGroupsError);
    return data;
  }

  return {
    ...data,
    service_groups: serviceGroups || []
  };
};

export const createTask = async (task: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceTask | null> => {
  // Extract service groups to handle separately
  const { service_groups, next_predicted_service, ...taskData } = task as any;

  console.log("Creating maintenance task with data:", { ...taskData });

  // Insert the main task
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .insert({
      ...taskData,
      bills: taskData.bills || [],
      parts_required: taskData.parts_required || []
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating maintenance task:', error);
    return null;
  }

  // Create audit log for task creation
  if (data) {
    await createAuditLog({
      task_id: data.id,
      changes: {
        status: {
          previousValue: null,
          updatedValue: data.status
        }
      }
    });

    // Insert service groups if any
    if (service_groups && service_groups.length > 0) {
      try {
        const serviceGroupsWithTaskId = service_groups.map((group: any) => ({
          ...group,
          maintenance_task_id: data.id,
          // Remove bill_file as it's not for database storage
          bill_file: undefined
        }));

        await supabase
          .from('maintenance_service_tasks')
          .insert(serviceGroupsWithTaskId);
          
        // Fetch the inserted service groups
        const { data: insertedGroups } = await supabase
          .from('maintenance_service_tasks')
          .select('*')
          .eq('maintenance_task_id', data.id);
          
        return {
          ...data,
          service_groups: insertedGroups || []
        };
      } catch (error) {
        console.error('Error creating service groups:', error);
        // Return the task even if service groups failed
        return data;
      }
    }
  }

  return data;
};

export const updateTask = async (id: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | null> => {
  // Extract service groups to handle separately
  const { service_groups, next_predicted_service, ...updateData } = updates as any;

  // Get the old task first to compare changes
  const { data: oldTask } = await supabase
    .from('maintenance_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (!oldTask) {
    console.error('Task not found:', id);
    return null;
  }

  // Update the task
  const { data: updatedTask, error } = await supabase
    .from('maintenance_tasks')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating maintenance task:', error);
    return null;
  }

  // Create audit log for changes
  const changes: Record<string, { previousValue: any; updatedValue: any }> = {};
  Object.keys(updateData).forEach(key => {
    const updateKey = key as keyof MaintenanceTask;
    if (updateData[updateKey] !== oldTask[updateKey]) {
      changes[key] = {
        previousValue: oldTask[updateKey],
        updatedValue: updateData[updateKey]
      };
    }
  });

  if (Object.keys(changes).length > 0) {
    await createAuditLog({
      task_id: id,
      changes
    });
  }

  // Handle service groups update
  if (service_groups && updatedTask) {
    try {
      // First delete existing service groups
      await supabase
        .from('maintenance_service_tasks')
        .delete()
        .eq('maintenance_task_id', id);
      
      // Then insert the updated ones
      if (service_groups.length > 0) {
        const serviceGroupsWithTaskId = service_groups.map((group: any) => ({
          ...group,
          maintenance_task_id: id,
          // Remove bill_file as it's not for database storage
          bill_file: undefined
        }));

        await supabase
          .from('maintenance_service_tasks')
          .insert(serviceGroupsWithTaskId);
      }
      
      // Fetch the inserted service groups
      const { data: insertedGroups } = await supabase
        .from('maintenance_service_tasks')
        .select('*')
        .eq('maintenance_task_id', id);
        
      return {
        ...updatedTask,
        service_groups: insertedGroups || []
      };
    } catch (error) {
      console.error('Error updating service groups:', error);
      // Return the task even if service groups failed
      return updatedTask;
    }
  }

  return updatedTask || null;
};

export const deleteTask = async (id: string): Promise<boolean> => {
  // First delete the service groups (should cascade, but let's be explicit)
  await supabase
    .from('maintenance_service_tasks')
    .delete()
    .eq('maintenance_task_id', id);

  // Then delete the main task
  const { error } = await supabase
    .from('maintenance_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting maintenance task:', error);
    return false;
  }

  return true;
};

// Audit log operations
export const getAuditLogs = async (taskId?: string): Promise<MaintenanceAuditLog[]> => {
  let query = supabase
    .from('maintenance_audit_logs')
    .select('*')
    .order('timestamp', { ascending: false });

  if (taskId) {
    query = query.eq('task_id', taskId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  return data || [];
};

export const createAuditLog = async (log: Omit<MaintenanceAuditLog, 'id' | 'timestamp'>): Promise<MaintenanceAuditLog | null> => {
  const { data, error } = await supabase
    .from('maintenance_audit_logs')
    .insert({
      task_id: log.task_id,
      admin_user: log.admin_user,
      changes: log.changes,
      timestamp: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating audit log:', error);
    return null;
  }

  return data;
};

// Service groups operations
export const getServiceGroups = async (taskId: string): Promise<MaintenanceServiceGroup[]> => {
  const { data, error } = await supabase
    .from('maintenance_service_tasks')
    .select('*')
    .eq('maintenance_task_id', taskId);

  if (error) {
    console.error('Error fetching service groups:', error);
    return [];
  }

  return data || [];
};

// Upload service group bill
export const uploadServiceBill = async (file: File, taskId: string, groupId?: string): Promise<string | null> => {
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${taskId}-${groupId || Date.now()}.${fileExt}`;
  const filePath = `maintenance-bills/${fileName}`;
  
  const { error: uploadError } = await supabase.storage
    .from('maintenance')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    console.error('Error uploading bill:', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('maintenance')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Statistics
export const getMaintenanceStats = async (): Promise<MaintenanceStats> => {
  const { data: tasks } = await supabase
    .from('maintenance_tasks')
    .select('*');

  // Also fetch service groups to get accurate cost data
  const { data: serviceGroups } = await supabase
    .from('maintenance_service_tasks')
    .select('*');

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
      pending_tasks: 0
    };
  }

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  // Calculate total expenditure from service groups
  const total_expenditure = Array.isArray(serviceGroups)
    ? serviceGroups.reduce((sum, group) => sum + (group.cost || 0), 0)
    : tasks.reduce((sum, task) => sum + (task.actual_cost || task.estimated_cost || 0), 0);
  
  // Calculate monthly expenses
  const monthlyExpenses = tasks.reduce((acc, task) => {
    const taskDate = new Date(task.start_date);
    const monthKey = `${taskDate.getFullYear()}-${taskDate.getMonth()}`;
    
    // Get costs from service groups for this task
    const taskGroups = Array.isArray(serviceGroups) 
      ? serviceGroups.filter(group => group.maintenance_task_id === task.id)
      : [];
    
    const taskCost = taskGroups.length > 0
      ? taskGroups.reduce((sum, group) => sum + (group.cost || 0), 0)
      : task.actual_cost || task.estimated_cost || 0;
      
    acc[monthKey] = (acc[monthKey] || 0) + taskCost;
    return acc;
  }, {} as Record<string, number>);
  
  const average_monthly_expense = Object.values(monthlyExpenses).reduce((sum, val) => sum + val, 0) / 
    Math.max(Object.keys(monthlyExpenses).length, 1);
  
  // Calculate average task cost
  const average_task_cost = total_expenditure / Math.max(tasks.length, 1);
  
  // Calculate expenditure by vehicle
  const expenditure_by_vehicle = tasks.reduce((acc, task) => {
    // Get costs from service groups for this task
    const taskGroups = Array.isArray(serviceGroups) 
      ? serviceGroups.filter(group => group.maintenance_task_id === task.id)
      : [];
    
    const taskCost = taskGroups.length > 0
      ? taskGroups.reduce((sum, group) => sum + (group.cost || 0), 0)
      : task.actual_cost || task.estimated_cost || 0;
      
    acc[task.vehicle_id] = (acc[task.vehicle_id] || 0) + taskCost;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate expenditure by vendor (using service groups)
  const expenditure_by_vendor = Array.isArray(serviceGroups)
    ? serviceGroups.reduce((acc, group) => {
        acc[group.vendor_id] = (acc[group.vendor_id] || 0) + (group.cost || 0);
        return acc;
      }, {} as Record<string, number>)
    : tasks.reduce((acc, task) => {
        acc[task.vendor_id] = (acc[task.vendor_id] || 0) + (task.actual_cost || task.estimated_cost || 0);
        return acc;
      }, {} as Record<string, number>);
  
  // Calculate KM reading differences
  const km_reading_difference = tasks.reduce((acc, task) => {
    acc[task.vehicle_id] = task.odometer_reading;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate vehicle downtime
  const vehicle_downtime = tasks.reduce((acc, task) => {
    const taskDate = new Date(task.start_date);
    if (taskDate >= lastMonth) {
      acc[task.vehicle_id] = (acc[task.vehicle_id] || 0) + (task.downtime_days || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate average completion time for resolved tasks
  const completedTasks = tasks.filter(task => 
    task.status === 'resolved' && task.start_date && task.end_date
  );
  
  const totalCompletionTime = completedTasks.reduce((sum, task) => {
    const start = new Date(task.start_date);
    const end = new Date(task.end_date!);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  }, 0);

  const average_completion_time = completedTasks.length > 0 ? 
    totalCompletionTime / completedTasks.length : 
    0;

  // Count total and pending tasks
  const total_tasks = tasks.length;
  const pending_tasks = tasks.filter(task => 
    task.status === 'open' || task.status === 'in_progress' || task.status === 'escalated'
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
    pending_tasks
  };
};