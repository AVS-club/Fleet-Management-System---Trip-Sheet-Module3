import { supabase } from './supabaseClient';
import { getCurrentOrganizationId } from './auth';

interface WarehouseRule {
  id: string;
  vehiclePattern: RegExp;
  warehouseName: string;
  warehousePincode?: string;
  priority: number;
  isActive: boolean;
}

interface Warehouse {
  id: string;
  name: string;
  pincode?: string;
}

export const getWarehouseRules = async (organizationId?: string): Promise<WarehouseRule[]> => {
  const orgId = organizationId || getCurrentOrganizationId();
  if (!orgId) return [];

  try {
    const { data, error } = await supabase
      .from('organization_warehouse_rules')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error || !data) return [];

    return data.map(rule => ({
      id: rule.id,
      vehiclePattern: new RegExp(rule.vehicle_pattern),
      warehouseName: rule.warehouse_name,
      warehousePincode: rule.warehouse_pincode,
      priority: rule.priority,
      isActive: rule.is_active
    }));
  } catch (error) {
    console.error('Error fetching warehouse rules:', error);
    return [];
  }
};

export const autoAssignWarehouse = async (
  vehicleRegNumber: string,
  organizationId?: string,
  warehouses?: Warehouse[]
): Promise<string | null> => {
  if (!vehicleRegNumber) return null;

  const rules = await getWarehouseRules(organizationId);
  if (rules.length === 0) return null;

  // Find matching rule
  for (const rule of rules) {
    if (rule.vehiclePattern.test(vehicleRegNumber.toUpperCase())) {
      // If warehouses are provided, find the matching warehouse
      if (warehouses && warehouses.length > 0) {
        const warehouse = warehouses.find(w => 
          w.name?.toLowerCase().includes(rule.warehouseName.toLowerCase()) ||
          (rule.warehousePincode && w.pincode === rule.warehousePincode)
        );
        
        if (warehouse) {
          return warehouse.id;
        }
      }
      
      // If no warehouses provided, return the warehouse name for manual matching
      return rule.warehouseName;
    }
  }
  
  return null;
};

export const createWarehouseRule = async (
  organizationId: string,
  vehiclePattern: string,
  warehouseName: string,
  warehousePincode?: string,
  priority: number = 0
) => {
  try {
    const { data, error } = await supabase
      .from('organization_warehouse_rules')
      .insert({
        organization_id: organizationId,
        vehicle_pattern: vehiclePattern,
        warehouse_name: warehouseName,
        warehouse_pincode: warehousePincode,
        priority,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating warehouse rule:', error);
    throw error;
  }
};

export const updateWarehouseRule = async (
  ruleId: string,
  updates: Partial<{
    vehicle_pattern: string;
    warehouse_name: string;
    warehouse_pincode: string;
    priority: number;
    is_active: boolean;
  }>
) => {
  try {
    const { data, error } = await supabase
      .from('organization_warehouse_rules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating warehouse rule:', error);
    throw error;
  }
};

export const deleteWarehouseRule = async (ruleId: string) => {
  try {
    const { error } = await supabase
      .from('organization_warehouse_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting warehouse rule:', error);
    throw error;
  }
};
