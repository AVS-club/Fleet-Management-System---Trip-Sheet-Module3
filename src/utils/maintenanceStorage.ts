import { 
  MaintenanceTask, 
  MaintenanceStats,
  MaintenanceAuditLog
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

  return data || [];
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

  return data;
};

export const createTask = async (task: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>): Promise<MaintenanceTask | null> => {
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .insert({
      ...task,
      bills: task.bills || [],
      parts_required: task.parts_required || []
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
  }

  return data;
};

export const updateTask = async (id: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | null> => {
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
      ...updates,
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
  Object.keys(updates).forEach(key => {
    const updateKey = key as keyof MaintenanceTask;
    if (updates[updateKey] !== oldTask[updateKey]) {
      changes[key] = {
        previousValue: oldTask[updateKey],
        updatedValue: updates[updateKey]
      };
    }
  });

  if (Object.keys(changes).length > 0) {
    await createAuditLog({
      task_id: id,
      changes
    });
  }

  return updatedTask || null;
};

export const deleteTask = async (id: string): Promise<boolean> => {
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

// Statistics
export const getMaintenanceStats = async (): Promise<MaintenanceStats> => {
  const { data: tasks } = await supabase
    .from('maintenance_tasks')
    .select('*');

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
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
  
  // Calculate total expenditure using actual or estimated cost
  const total_expenditure = tasks.reduce((sum, task) => 
    sum + (task.actual_cost || task.estimated_cost || 0), 
    0
  );
  
  // Calculate monthly expenses
  const monthlyExpenses = tasks.reduce((acc, task) => {
    const taskDate = new Date(task.start_date);
    const monthKey = `${taskDate.getFullYear()}-${taskDate.getMonth()}`;
    const taskCost = task.actual_cost || task.estimated_cost || 0;
    acc[monthKey] = (acc[monthKey] || 0) + taskCost;
    return acc;
  }, {} as Record<string, number>);
  
  const average_monthly_expense = Object.values(monthlyExpenses).reduce((sum, val) => sum + val, 0) / 
    Math.max(Object.keys(monthlyExpenses).length, 1);
  
  // Calculate average task cost
  const average_task_cost = total_expenditure / Math.max(tasks.length, 1);
  
  // Calculate expenditure by vehicle
  const expenditure_by_vehicle = tasks.reduce((acc, task) => {
    const taskCost = task.actual_cost || task.estimated_cost || 0;
    acc[task.vehicle_id] = (acc[task.vehicle_id] || 0) + taskCost;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate expenditure by vendor
  const expenditure_by_vendor = tasks.reduce((acc, task) => {
    const taskCost = task.actual_cost || task.estimated_cost || 0;
    acc[task.vendor_id] = (acc[task.vendor_id] || 0) + taskCost;
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