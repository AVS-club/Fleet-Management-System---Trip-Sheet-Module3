import { supabase } from './supabaseClient';
import { MaintenanceServiceLineItem } from '@/types/maintenance';
import { createLogger } from './logger';

const logger = createLogger('maintenanceLineItemsStorage');

/**
 * Handles Supabase errors with consistent logging
 */
const handleSupabaseError = (operation: string, error: any) => {
  logger.error(`Error ${operation}:`, error);
  if (error?.message) {
    logger.error('Error message:', error.message);
  }
  if (error?.details) {
    logger.error('Error details:', error.details);
  }
  if (error?.hint) {
    logger.error('Error hint:', error.hint);
  }
};

/**
 * Get all line items for a specific service task
 */
export const getLineItems = async (
  serviceTaskId: string
): Promise<MaintenanceServiceLineItem[]> => {
  try {
    logger.debug(`Fetching line items for service task: ${serviceTaskId}`);

    const { data, error } = await supabase
      .from('maintenance_service_line_items')
      .select('*')
      .eq('service_task_id', serviceTaskId)
      .order('item_order', { ascending: true });

    if (error) {
      handleSupabaseError('fetch line items', error);
      return [];
    }

    logger.debug(`Fetched ${data?.length || 0} line items`);
    return data || [];
  } catch (error) {
    handleSupabaseError('fetch line items', error);
    return [];
  }
};

/**
 * Create a new line item
 */
export const createLineItem = async (
  item: Omit<MaintenanceServiceLineItem, 'id' | 'created_at' | 'updated_at' | 'subtotal'>
): Promise<MaintenanceServiceLineItem | null> => {
  try {
    logger.debug('Creating line item:', item);

    const { data, error } = await supabase
      .from('maintenance_service_line_items')
      .insert(item)
      .select()
      .single();

    if (error) {
      handleSupabaseError('create line item', error);
      return null;
    }

    logger.debug('Line item created successfully:', data);
    return data;
  } catch (error) {
    handleSupabaseError('create line item', error);
    return null;
  }
};

/**
 * Update an existing line item
 */
export const updateLineItem = async (
  id: string,
  updates: Partial<Omit<MaintenanceServiceLineItem, 'id' | 'service_task_id' | 'created_at' | 'updated_at' | 'subtotal'>>
): Promise<MaintenanceServiceLineItem | null> => {
  try {
    logger.debug(`Updating line item ${id}:`, updates);

    const { data, error } = await supabase
      .from('maintenance_service_line_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      handleSupabaseError('update line item', error);
      return null;
    }

    logger.debug('Line item updated successfully:', data);
    return data;
  } catch (error) {
    handleSupabaseError('update line item', error);
    return null;
  }
};

/**
 * Delete a line item
 */
export const deleteLineItem = async (id: string): Promise<boolean> => {
  try {
    logger.debug(`Deleting line item: ${id}`);

    const { error } = await supabase
      .from('maintenance_service_line_items')
      .delete()
      .eq('id', id);

    if (error) {
      handleSupabaseError('delete line item', error);
      return false;
    }

    logger.debug('Line item deleted successfully');
    return true;
  } catch (error) {
    handleSupabaseError('delete line item', error);
    return false;
  }
};

/**
 * Reorder line items for a service task
 */
export const reorderLineItems = async (
  serviceTaskId: string,
  orderedIds: string[]
): Promise<boolean> => {
  try {
    logger.debug(`Reordering line items for service task ${serviceTaskId}:`, orderedIds);

    // Update each item's order based on its position in the array
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('maintenance_service_line_items')
        .update({ item_order: index })
        .eq('id', id)
        .eq('service_task_id', serviceTaskId)
    );

    const results = await Promise.all(updates);

    // Check if any updates failed
    const hasError = results.some(result => result.error);
    if (hasError) {
      logger.error('Some line items failed to reorder');
      return false;
    }

    logger.debug('Line items reordered successfully');
    return true;
  } catch (error) {
    handleSupabaseError('reorder line items', error);
    return false;
  }
};

/**
 * Bulk create multiple line items
 */
export const bulkCreateLineItems = async (
  items: Omit<MaintenanceServiceLineItem, 'id' | 'created_at' | 'updated_at' | 'subtotal'>[]
): Promise<MaintenanceServiceLineItem[]> => {
  try {
    logger.debug(`Bulk creating ${items.length} line items`);

    const { data, error } = await supabase
      .from('maintenance_service_line_items')
      .insert(items)
      .select();

    if (error) {
      handleSupabaseError('bulk create line items', error);
      return [];
    }

    logger.debug(`Bulk created ${data?.length || 0} line items successfully`);
    return data || [];
  } catch (error) {
    handleSupabaseError('bulk create line items', error);
    return [];
  }
};

/**
 * Replace all line items for a service task
 * Deletes existing items and creates new ones in a transaction-like manner
 */
export const replaceLineItems = async (
  serviceTaskId: string,
  items: Omit<MaintenanceServiceLineItem, 'id' | 'created_at' | 'updated_at' | 'subtotal'>[]
): Promise<boolean> => {
  try {
    logger.debug(`Replacing line items for service task ${serviceTaskId}`);

    // Delete existing line items
    const { error: deleteError } = await supabase
      .from('maintenance_service_line_items')
      .delete()
      .eq('service_task_id', serviceTaskId);

    if (deleteError) {
      handleSupabaseError('delete existing line items', deleteError);
      return false;
    }

    // If no new items, we're done
    if (items.length === 0) {
      logger.debug('No new line items to insert');
      return true;
    }

    // Insert new line items
    const itemsWithServiceTaskId = items.map(item => ({
      ...item,
      service_task_id: serviceTaskId,
    }));

    const { error: insertError } = await supabase
      .from('maintenance_service_line_items')
      .insert(itemsWithServiceTaskId);

    if (insertError) {
      handleSupabaseError('insert new line items', insertError);
      return false;
    }

    logger.debug(`Replaced line items successfully`);
    return true;
  } catch (error) {
    handleSupabaseError('replace line items', error);
    return false;
  }
};

/**
 * Calculate total cost from line items
 * Useful for validation before saving
 */
export const calculateLineItemsTotal = (
  items: MaintenanceServiceLineItem[]
): number => {
  return items.reduce((total, item) => {
    const subtotal = item.subtotal || (item.quantity * item.unit_price);
    return total + subtotal;
  }, 0);
};

/**
 * Delete all line items for a service task
 */
export const deleteAllLineItems = async (
  serviceTaskId: string
): Promise<boolean> => {
  try {
    logger.debug(`Deleting all line items for service task: ${serviceTaskId}`);

    const { error } = await supabase
      .from('maintenance_service_line_items')
      .delete()
      .eq('service_task_id', serviceTaskId);

    if (error) {
      handleSupabaseError('delete all line items', error);
      return false;
    }

    logger.debug('All line items deleted successfully');
    return true;
  } catch (error) {
    handleSupabaseError('delete all line items', error);
    return false;
  }
};

