import { supabase } from '../utils/supabaseClient';
import { PartReplacement, PartsAnalyticsData } from '../utils/partsAnalyticsV2';
import { createLogger } from '../utils/logger';

const logger = createLogger('partsHealth');

export const getPartsHealthData = async (): Promise<PartsAnalyticsData> => {
  try {
    const response = await fetch('/api/parts-health', {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error fetching parts health data:', error);
    throw error;
  }
};

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

const getStandardLife = (partType: string): number => {
  const standards: Record<string, number> = {
    'tyres': 60000,
    'battery': 80000,
    'clutch_plate': 80000,
    'brake_pads': 40000,
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
    'exhaust_system': 100000
  };
  return standards[partType] || 50000;
};

const getEstimatedCost = (partType: string): number => {
  const costs: Record<string, number> = {
    'tyres': 15000,
    'battery': 8000,
    'clutch_plate': 12000,
    'brake_pads': 5000,
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
    'exhaust_system': 15000
  };
  return costs[partType] || 5000;
};

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
