import { supabase } from './supabaseClient';
import { createLogger } from './logger';
import { getCurrentUserId, getUserActiveOrganization, withOwner } from './supaHelpers';

const logger = createLogger('maintenanceTaskCatalogStorage');

export interface MaintenanceTask {
  id: string;
  task_name: string;
  task_category?: string;
  is_category?: boolean;
  active?: boolean;
  organization_id: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all tasks for the current organization
 */
export const getTasks = async (): Promise<MaintenanceTask[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.warn('No user ID found, returning empty tasks');
      return [];
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      logger.warn('No organization found, returning empty tasks');
      return [];
    }

    const { data, error } = await supabase
      .from('maintenance_tasks_catalog')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('task_name', { ascending: true });

    if (error) {
      logger.error('Error fetching tasks:', error);
      return [];
    }

    logger.debug(`Fetched ${data?.length || 0} tasks from database`);
    return data || [];
  } catch (error) {
    logger.error('Error in getTasks:', error);
    return [];
  }
};

/**
 * Create a new task in the catalog
 */
export const createTask = async (
  taskData: Omit<MaintenanceTask, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'>
): Promise<MaintenanceTask | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected');
    }

    // Build payload with only valid columns
    const payload = {
      task_name: taskData.task_name,
      task_category: taskData.task_category,
      is_category: taskData.is_category !== undefined ? taskData.is_category : false,
      active: taskData.active !== undefined ? taskData.active : true,
      organization_id: organizationId,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('maintenance_tasks_catalog')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error('Error creating task:', error);
      throw error;
    }

    logger.debug('Task created successfully:', data);
    return data;
  } catch (error) {
    logger.error('Error in createTask:', error);
    throw error;
  }
};

/**
 * Create task from simple name (convenience function)
 * This is the key function for "Type & Add" functionality
 *
 * @param taskName - The name of the task to create
 * @param category - The category based on service type (optional, defaults to 'general_scheduled_service')
 */
export const createTaskFromName = async (
  taskName: string,
  category?: string
): Promise<MaintenanceTask | null> => {
  try {
    if (!taskName || taskName.trim() === '') {
      throw new Error('Task name is required');
    }

    return await createTask({
      task_name: taskName.trim(),
      task_category: category || 'general_scheduled_service',
      is_category: false,
    });
  } catch (error) {
    logger.error('Error in createTaskFromName:', error);
    throw error;
  }
};

/**
 * Update an existing task
 */
export const updateTask = async (
  taskId: string,
  updates: Partial<Omit<MaintenanceTask, 'id' | 'organization_id' | 'created_at'>>
): Promise<MaintenanceTask | null> => {
  try {
    const { data, error } = await supabase
      .from('maintenance_tasks_catalog')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating task:', error);
      throw error;
    }

    logger.debug('Task updated successfully:', data);
    return data;
  } catch (error) {
    logger.error('Error in updateTask:', error);
    throw error;
  }
};

/**
 * Get task by ID
 */
export const getTaskById = async (taskId: string): Promise<MaintenanceTask | null> => {
  try {
    const { data, error } = await supabase
      .from('maintenance_tasks_catalog')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      logger.error('Error fetching task by ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in getTaskById:', error);
    return null;
  }
};

/**
 * Search tasks by name
 */
export const searchTasks = async (searchTerm: string): Promise<MaintenanceTask[]> => {
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
      .from('maintenance_tasks_catalog')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .ilike('task_name', `%${searchTerm}%`)
      .order('task_name', { ascending: true });

    if (error) {
      logger.error('Error searching tasks:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in searchTasks:', error);
    return [];
  }
};
