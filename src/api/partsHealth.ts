import { supabase } from '../utils/supabaseClient';
import { PartReplacement, PartsAnalyticsData } from '../utils/partsAnalyticsV2';
import { createLogger } from '../utils/logger';
import { getCurrentUserId, getUserActiveOrganization } from '../utils/supaHelpers';

const logger = createLogger('partsHealth');

/**
 * Fetch parts health data directly from database
 * No longer relies on non-existent API endpoint
 */
export const getPartsHealthData = async (): Promise<PartsAnalyticsData> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.warn('No user authenticated for parts health data');
      return {
        replacements: [],
        analytics: {
          totalReplacements: 0,
          totalCost: 0,
          averageCost: 0,
          criticalParts: [],
          upcomingReplacements: []
        }
      };
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      logger.warn('No organization selected for parts health data');
      return {
        replacements: [],
        analytics: {
          totalReplacements: 0,
          totalCost: 0,
          averageCost: 0,
          criticalParts: [],
          upcomingReplacements: []
        }
      };
    }

    // Fetch parts replacements directly from database
    const { data: replacements, error: replacementsError } = await supabase
      .from('parts_replacements')
      .select('*')
      .eq('organization_id', organizationId)
      .order('replacement_date', { ascending: false });

    if (replacementsError) {
      logger.error('Error fetching parts replacements:', replacementsError);
      throw replacementsError;
    }

    // Fetch vehicles for current odometer readings
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number, current_odometer')
      .eq('organization_id', organizationId);

    if (vehiclesError) {
      logger.error('Error fetching vehicles for parts health:', vehiclesError);
      throw vehiclesError;
    }

    // Calculate analytics
    const analytics = calculatePartsAnalytics(replacements || [], vehicles || []);

    return {
      replacements: replacements || [],
      analytics
    };
  } catch (error) {
    logger.error('Error fetching parts health data:', error);
    // Return empty data structure instead of throwing
    return {
      replacements: [],
      analytics: {
        totalReplacements: 0,
        totalCost: 0,
        averageCost: 0,
        criticalParts: [],
        upcomingReplacements: []
      }
    };
  }
};

/**
 * Calculate parts analytics from replacements and vehicle data
 */
function calculatePartsAnalytics(replacements: any[], vehicles: any[]) {
  const totalReplacements = replacements.length;
  const totalCost = replacements.reduce((sum, r) => sum + (r.cost || 0), 0);
  const averageCost = totalReplacements > 0 ? totalCost / totalReplacements : 0;

  // Group replacements by vehicle and part type to find latest
  const vehiclePartMap = new Map<string, Map<string, any>>();
  
  replacements.forEach(replacement => {
    const vehicleId = replacement.vehicle_id;
    const partType = replacement.part_type;
    
    if (!vehiclePartMap.has(vehicleId)) {
      vehiclePartMap.set(vehicleId, new Map());
    }
    
    const partMap = vehiclePartMap.get(vehicleId)!;
    const existing = partMap.get(partType);
    
    if (!existing || new Date(replacement.replacement_date) > new Date(existing.replacement_date)) {
      partMap.set(partType, replacement);
    }
  });

  // Calculate critical parts and upcoming replacements
  const criticalParts: any[] = [];
  const upcomingReplacements: any[] = [];

  vehicles.forEach(vehicle => {
    const partMap = vehiclePartMap.get(vehicle.id);
    if (!partMap) return;

    partMap.forEach((replacement, partType) => {
      const kmSinceReplacement = (vehicle.current_odometer || 0) - replacement.odometer_reading;
      const standardLife = getStandardPartLife(partType);
      const remainingLife = standardLife - kmSinceReplacement;
      const lifePercentage = Math.max(0, Math.min(100, (remainingLife / standardLife) * 100));

      const partInfo = {
        vehicleId: vehicle.id,
        vehicleReg: vehicle.registration_number,
        partType: replacement.part_type,
        partName: replacement.part_name,
        remainingLife,
        lifePercentage,
        kmSinceReplacement,
        lastReplacement: replacement.replacement_date,
        estimatedCost: replacement.cost || getEstimatedPartCost(partType)
      };

      if (lifePercentage < 20) {
        criticalParts.push(partInfo);
      } else if (lifePercentage < 40) {
        upcomingReplacements.push(partInfo);
      }
    });
  });

  // Sort by remaining life (ascending)
  criticalParts.sort((a, b) => a.remainingLife - b.remainingLife);
  upcomingReplacements.sort((a, b) => a.remainingLife - b.remainingLife);

  return {
    totalReplacements,
    totalCost,
    averageCost,
    criticalParts: criticalParts.slice(0, 10), // Top 10 critical
    upcomingReplacements: upcomingReplacements.slice(0, 10) // Top 10 upcoming
  };
}

export const updatePartReplacement = async (data: Partial<PartReplacement>) => {
  try {
    const response = await fetch('/api/parts-replacement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error updating part replacement:', error);
    throw error;
  }
};

export const addPartReplacement = async (data: Omit<PartReplacement, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
  try {
    const { data: result, error } = await supabase
      .from('parts_replacements')
      .insert([data])
      .select()
      .single();

    if (error) {
      logger.error('Error adding part replacement:', error);
      throw error;
    }

    return result;
  } catch (error) {
    logger.error('Error adding part replacement:', error);
    throw error;
  }
};

export const updatePartReplacementById = async (id: string, updates: Partial<PartReplacement>) => {
  try {
    const { data, error } = await supabase
      .from('parts_replacements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating part replacement:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error updating part replacement:', error);
    throw error;
  }
};

export const deletePartReplacement = async (id: string) => {
  try {
    const { error } = await supabase
      .from('parts_replacements')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting part replacement:', error);
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Error deleting part replacement:', error);
    throw error;
  }
};

export const getPartReplacementsByVehicle = async (vehicleId: string) => {
  try {
    const { data, error } = await supabase
      .from('parts_replacements')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('replacement_date', { ascending: false });

    if (error) {
      logger.error('Error fetching part replacements:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error fetching part replacements:', error);
    throw error;
  }
};

export const getPartReplacementsByPartType = async (partType: string) => {
  try {
    const { data, error } = await supabase
      .from('parts_replacements')
      .select('*')
      .eq('part_type', partType)
      .order('replacement_date', { ascending: false });

    if (error) {
      logger.error('Error fetching part replacements by type:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error fetching part replacements by type:', error);
    throw error;
  }
};

export const getCriticalParts = async () => {
  try {
    // Get all vehicles with their current odometer readings
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number, current_odometer, gvw');

    if (vehiclesError) {
      throw vehiclesError;
    }

    // Get all part replacements
    const { data: replacements, error: replacementsError } = await supabase
      .from('parts_replacements')
      .select('*')
      .order('replacement_date', { ascending: false });

    if (replacementsError) {
      throw replacementsError;
    }

    // Process data to find critical parts
    const criticalParts = [];
    
    for (const vehicle of vehicles || []) {
      const vehicleReplacements = replacements?.filter(r => r.vehicle_id === vehicle.id) || [];
      
      // Group by part type and get latest replacement
      const latestReplacements = vehicleReplacements.reduce((acc, replacement) => {
        if (!acc[replacement.part_type] || 
            new Date(replacement.replacement_date) > new Date(acc[replacement.part_type].replacement_date)) {
          acc[replacement.part_type] = replacement;
        }
        return acc;
      }, {} as Record<string, any>);

      // Check each part type for critical status
      Object.values(latestReplacements).forEach((replacement: any) => {
        const kmSinceReplacement = (vehicle.current_odometer || 0) - replacement.odometer_reading;
        const standardLife = getStandardLife(replacement.part_type);
        const remainingLife = standardLife - kmSinceReplacement;
        const lifePercentage = Math.max(0, Math.min(100, (remainingLife / standardLife) * 100));
        
        if (lifePercentage < 20) { // Critical threshold
          criticalParts.push({
            vehicleId: vehicle.id,
            vehicleReg: vehicle.registration_number,
            partType: replacement.part_type,
            partName: replacement.part_name,
            remainingLife,
            lifePercentage,
            kmSinceReplacement,
            lastReplacement: replacement.replacement_date,
            estimatedCost: replacement.cost || getEstimatedCost(replacement.part_type)
          });
        }
      });
    }

    return criticalParts.sort((a, b) => a.remainingLife - b.remainingLife);
  } catch (error) {
    logger.error('Error fetching critical parts:', error);
    throw error;
  }
};

/**
 * Get standard life expectancy for a part type in kilometers
 */
function getStandardPartLife(partType: string): number {
  const standards: Record<string, number> = {
    'tyres': 60000,
    'battery': 80000,
    'clutch_plate': 80000,
    'brake_pads': 40000,
    'brake_discs': 60000,
    'leaf_springs': 120000,
    'gearbox': 150000,
    'engine_oil': 10000,
    'air_filter': 20000,
    'fuel_filter': 30000,
    'timing_belt': 100000,
    'water_pump': 120000,
    'alternator': 150000,
    'starter_motor': 150000,
    'radiator': 200000,
    'exhaust_system': 100000,
    'suspension': 80000,
    'steering_components': 100000,
    'transmission_fluid': 60000,
    'coolant': 40000,
    'spark_plugs': 40000,
    'cabin_filter': 20000,
    'wiper_blades': 20000
  };
  return standards[partType] || 50000;
}

/**
 * Get estimated cost for a part type in INR
 */
function getEstimatedPartCost(partType: string): number {
  const costs: Record<string, number> = {
    'tyres': 15000,
    'battery': 8000,
    'clutch_plate': 12000,
    'brake_pads': 5000,
    'brake_discs': 8000,
    'leaf_springs': 18000,
    'gearbox': 45000,
    'engine_oil': 2000,
    'air_filter': 1500,
    'fuel_filter': 2000,
    'timing_belt': 8000,
    'water_pump': 12000,
    'alternator': 15000,
    'starter_motor': 12000,
    'radiator': 10000,
    'exhaust_system': 15000,
    'suspension': 20000,
    'steering_components': 15000,
    'transmission_fluid': 3000,
    'coolant': 1000,
    'spark_plugs': 2000,
    'cabin_filter': 1000,
    'wiper_blades': 1500
  };
  return costs[partType] || 5000;
}

// Keep the old function names for backward compatibility
const getStandardLife = getStandardPartLife;
const getEstimatedCost = getEstimatedPartCost;

export const getPartsAnalyticsSummary = async () => {
  try {
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number, current_odometer, gvw');

    if (vehiclesError) throw vehiclesError;

    const { data: replacements, error: replacementsError } = await supabase
      .from('parts_replacements')
      .select('*');

    if (replacementsError) throw replacementsError;

    // Calculate summary statistics
    const totalVehicles = vehicles?.length || 0;
    const totalReplacements = replacements?.length || 0;
    
    // Calculate critical parts count
    const criticalParts = await getCriticalParts();
    
    // Calculate total cost
    const totalCost = replacements?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
    
    // Calculate upcoming cost (critical parts)
    const upcomingCost = criticalParts.reduce((sum, p) => sum + p.estimatedCost, 0);

    return {
      totalVehicles,
      totalReplacements,
      criticalPartsCount: criticalParts.length,
      totalCost,
      upcomingCost,
      averageCostPerReplacement: totalReplacements > 0 ? totalCost / totalReplacements : 0
    };
  } catch (error) {
    logger.error('Error fetching parts analytics summary:', error);
    throw error;
  }
};
