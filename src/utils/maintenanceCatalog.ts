import { supabase } from './supabaseClient';

export interface MaintenanceTaskCatalog {
  id: string;
  task_category: string;
  task_name: string;
  is_category: boolean;
  active: boolean;
}

export interface MaintenanceTaskCategory {
  title: string;
  items: MaintenanceTaskItem[];
}

export interface MaintenanceTaskItem {
  id: string;
  name: string;
  group: string;
  inactive?: boolean;
}

/**
 * Fetches maintenance tasks catalog from the database
 */
export const getMaintenanceTasksCatalog = async (): Promise<MaintenanceTaskCatalog[]> => {
  const { data, error } = await supabase
    .from('maintenance_tasks_catalog')
    .select('*')
    .order('task_category')
    .order('is_category', { ascending: false }) // Categories first, then tasks
    .order('task_name');

  if (error) {
    console.error('Error fetching maintenance tasks catalog:', error);
    return [];
  }

  return data || [];
};

/**
 * Converts catalog data to the format expected by the MaintenanceSelector component
 */
export const convertCatalogToSelectorFormat = (catalog: MaintenanceTaskCatalog[]): {
  items: MaintenanceTaskItem[];
  groups: Record<string, MaintenanceTaskCategory>;
} => {
  const items: MaintenanceTaskItem[] = [];
  const groups: Record<string, MaintenanceTaskCategory> = {};
  
  // Group by category
  const categoriesMap: Record<string, MaintenanceTaskCatalog[]> = {};
  
  // First, separate categories and items
  catalog.forEach(item => {
    if (!item.is_category) {
      const groupKey = item.task_category.toLowerCase().replace(/\s+/g, '_');
      
      if (!categoriesMap[groupKey]) {
        categoriesMap[groupKey] = [];
      }
      
      categoriesMap[groupKey].push(item);
      
      // Add to flat items list
      items.push({
        id: item.id,
        name: item.task_name,
        group: groupKey,
        inactive: !item.active
      });
    }
  });
  
  // Then create groups
  Object.entries(categoriesMap).forEach(([groupKey, groupItems]) => {
    if (groupItems.length > 0) {
      groups[groupKey] = {
        title: groupItems[0].task_category,
        items: groupItems.map(item => ({
          id: item.id,
          name: item.task_name,
          group: groupKey,
          inactive: !item.active
        }))
      };
    }
  });
  
  return { items, groups };
};

export default {
  getMaintenanceTasksCatalog,
  convertCatalogToSelectorFormat
};