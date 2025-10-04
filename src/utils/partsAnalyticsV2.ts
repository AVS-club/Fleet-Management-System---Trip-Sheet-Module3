import { MaintenanceTask } from '@/types/maintenance';
import { Vehicle } from '@/types';
import { supabase } from './supabaseClient';

export interface PartReplacement {
  id: string;
  vehicle_id: string;
  part_type: string;
  part_name: string;
  replacement_date: string;
  odometer_reading: number;
  cost?: number;
  brand?: string;
  warranty_months?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  organization_id: string;
}

export interface PartHealthData {
  vehicleId: string;
  vehicleReg: string;
  vehicleGVW: number;
  vehicleMake: string;
  vehicleModel: string;
  partType: string;
  partName: string;
  partIcon: string;
  currentOdometer: number;
  lastReplacement: string;
  lastReplacementOdometer: number;
  kmSinceReplacement: number;
  remainingLife: number;
  lifePercentage: number;
  status: 'critical' | 'warning' | 'good';
  estimatedCost: number;
  history: Array<{
    date: string;
    odometer: number;
    cost: number;
    brand: string;
    lifeAchieved: number;
  }>;
  avgLifeAchieved: number;
  trend: number;
}

export interface PartsAnalyticsData {
  vehicles: Vehicle[];
  partTypes: Array<{
    id: string;
    name: string;
    icon: string;
    standardLife: number;
    criticalThreshold: number;
  }>;
  partsData: PartHealthData[];
}

export const fetchPartsData = async (): Promise<PartsAnalyticsData> => {
  try {
    // Fetch vehicles with GVW
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .order('registration_number');

    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError);
      throw vehiclesError;
    }

    // Fetch maintenance tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .order('start_date', { ascending: false });

    if (tasksError) {
      console.error('Error fetching maintenance tasks:', tasksError);
      // Continue without tasks data
    }

    // Fetch parts replacements
    const { data: replacements, error: replacementsError } = await supabase
      .from('parts_replacements')
      .select('*')
      .order('replacement_date', { ascending: false });

    if (replacementsError) {
      console.error('Error fetching parts replacements:', replacementsError);
      // Continue without replacements data
    }

    return {
      vehicles: vehicles || [],
      partTypes: getPartTypes(),
      partsData: processPartsData(vehicles || [], tasks || [], replacements || [])
    };
  } catch (error) {
    console.error('Error fetching parts data:', error);
    return {
      vehicles: [],
      partTypes: getPartTypes(),
      partsData: []
    };
  }
};

export const calculatePartHealth = (
  part: PartReplacement,
  currentOdometer: number
) => {
  const kmSinceReplacement = currentOdometer - part.odometer_reading;
  const standardLife = getStandardLife(part.part_type);
  const remainingLife = standardLife - kmSinceReplacement;
  const lifePercentage = Math.max(0, Math.min(100, (remainingLife / standardLife) * 100));

  return {
    kmSinceReplacement,
    remainingLife,
    lifePercentage,
    status: getPartStatus(lifePercentage, part.part_type)
  };
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

const getPartStatus = (lifePercentage: number, partType: string): 'critical' | 'warning' | 'good' => {
  const criticalThreshold = getCriticalThreshold(partType);
  const warningThreshold = criticalThreshold * 2;
  
  if (lifePercentage < criticalThreshold) return 'critical';
  if (lifePercentage < warningThreshold) return 'warning';
  return 'good';
};

const getCriticalThreshold = (partType: string): number => {
  const thresholds: Record<string, number> = {
    'tyres': 20,
    'battery': 15,
    'clutch_plate': 15,
    'brake_pads': 25,
    'leaf_springs': 20,
    'gearbox': 15,
    'engine_oil': 30,
    'air_filter': 25,
    'fuel_filter': 20,
    'timing_belt': 10,
    'water_pump': 15,
    'alternator': 15,
    'starter_motor': 15,
    'radiator': 10,
    'exhaust_system': 20
  };
  return thresholds[partType] || 20;
};

const getPartTypes = () => [
  { id: 'tyres', name: 'Tyres', icon: '🛞', standardLife: 60000, criticalThreshold: 10000 },
  { id: 'battery', name: 'Battery', icon: '🔋', standardLife: 80000, criticalThreshold: 15000 },
  { id: 'clutch_plate', name: 'Clutch Plate', icon: '⚙️', standardLife: 80000, criticalThreshold: 10000 },
  { id: 'brake_pads', name: 'Brake Pads', icon: '🛑', standardLife: 40000, criticalThreshold: 5000 },
  { id: 'leaf_springs', name: 'Leaf Springs', icon: '🔩', standardLife: 120000, criticalThreshold: 20000 },
  { id: 'gearbox', name: 'Gearbox', icon: '⚡', standardLife: 150000, criticalThreshold: 20000 },
  { id: 'engine_oil', name: 'Engine Oil', icon: '🛢️', standardLife: 10000, criticalThreshold: 2000 },
  { id: 'air_filter', name: 'Air Filter', icon: '🌪️', standardLife: 20000, criticalThreshold: 3000 },
  { id: 'fuel_filter', name: 'Fuel Filter', icon: '⛽', standardLife: 30000, criticalThreshold: 5000 },
  { id: 'timing_belt', name: 'Timing Belt', icon: '⏰', standardLife: 100000, criticalThreshold: 10000 },
  { id: 'water_pump', name: 'Water Pump', icon: '💧', standardLife: 120000, criticalThreshold: 15000 },
  { id: 'alternator', name: 'Alternator', icon: '⚡', standardLife: 150000, criticalThreshold: 20000 },
  { id: 'starter_motor', name: 'Starter Motor', icon: '🚀', standardLife: 150000, criticalThreshold: 20000 },
  { id: 'radiator', name: 'Radiator', icon: '🌡️', standardLife: 200000, criticalThreshold: 25000 },
  { id: 'exhaust_system', name: 'Exhaust System', icon: '💨', standardLife: 100000, criticalThreshold: 15000 }
];

const processPartsData = (
  vehicles: Vehicle[],
  tasks: MaintenanceTask[],
  replacements: PartReplacement[]
): PartHealthData[] => {
  const partsData: PartHealthData[] = [];
  const partTypes = getPartTypes();

  vehicles.forEach(vehicle => {
    partTypes.forEach(partType => {
      // Get replacement history for this vehicle and part type
      const vehicleReplacements = replacements
        .filter(r => r.vehicle_id === vehicle.id && r.part_type === partType.id)
        .sort((a, b) => new Date(b.replacement_date).getTime() - new Date(a.replacement_date).getTime());

      if (vehicleReplacements.length === 0) {
        // No replacement history, create initial entry
        const currentOdometer = vehicle.current_odometer || 0;
        partsData.push({
          vehicleId: vehicle.id,
          vehicleReg: vehicle.registration_number,
          vehicleGVW: vehicle.gvw || 0,
          vehicleMake: vehicle.make || '',
          vehicleModel: vehicle.model || '',
          partType: partType.id,
          partName: partType.name,
          partIcon: partType.icon,
          currentOdometer,
          lastReplacement: 'Never',
          lastReplacementOdometer: 0,
          kmSinceReplacement: currentOdometer,
          remainingLife: Math.max(0, partType.standardLife - currentOdometer),
          lifePercentage: Math.max(0, Math.min(100, ((partType.standardLife - currentOdometer) / partType.standardLife) * 100)),
          status: getPartStatus(Math.max(0, Math.min(100, ((partType.standardLife - currentOdometer) / partType.standardLife) * 100)), partType.id),
          estimatedCost: getEstimatedCost(partType.id),
          history: [],
          avgLifeAchieved: 0,
          trend: 0
        });
        return;
      }

      const lastReplacement = vehicleReplacements[0];
      const currentOdometer = vehicle.current_odometer || lastReplacement.odometer_reading;
      const kmSinceReplacement = currentOdometer - lastReplacement.odometer_reading;
      const remainingLife = partType.standardLife - kmSinceReplacement;
      const lifePercentage = Math.max(0, Math.min(100, (remainingLife / partType.standardLife) * 100));

      // Calculate history and trends
      const history = vehicleReplacements.map((replacement, index) => {
        const nextReplacement = vehicleReplacements[index + 1];
        const lifeAchieved = nextReplacement 
          ? replacement.odometer_reading - nextReplacement.odometer_reading
          : replacement.odometer_reading;
        
        return {
          date: replacement.replacement_date,
          odometer: replacement.odometer_reading,
          cost: replacement.cost || 0,
          brand: replacement.brand || 'Unknown',
          lifeAchieved
        };
      });

      const avgLifeAchieved = history.length > 0 
        ? history.reduce((sum, h) => sum + h.lifeAchieved, 0) / history.length 
        : 0;

      const trend = history.length > 1 
        ? ((history[0].lifeAchieved - history[history.length - 1].lifeAchieved) / history[history.length - 1].lifeAchieved) * 100
        : 0;

      partsData.push({
        vehicleId: vehicle.id,
        vehicleReg: vehicle.registration_number,
        vehicleGVW: vehicle.gvw || 0,
        vehicleMake: vehicle.make || '',
        vehicleModel: vehicle.model || '',
        partType: partType.id,
        partName: partType.name,
        partIcon: partType.icon,
        currentOdometer,
        lastReplacement: lastReplacement.replacement_date,
        lastReplacementOdometer: lastReplacement.odometer_reading,
        kmSinceReplacement,
        remainingLife,
        lifePercentage,
        status: getPartStatus(lifePercentage, partType.id),
        estimatedCost: lastReplacement.cost ? lastReplacement.cost * 1.1 : getEstimatedCost(partType.id),
        history,
        avgLifeAchieved,
        trend
      });
    });
  });

  return partsData;
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

export const getGVWCategory = (gvw: number) => {
  const categories = [
    { id: 'light', name: 'Light (< 5T)', min: 0, max: 5000, color: 'border-blue-300 bg-blue-100/40' },
    { id: 'medium', name: 'Medium (5-10T)', min: 5000, max: 10000, color: 'border-amber-300 bg-amber-100/40' },
    { id: 'heavy', name: 'Heavy (> 10T)', min: 10000, max: Infinity, color: 'border-orange-300 bg-orange-100/40' }
  ];
  return categories.find(cat => gvw >= cat.min && gvw < cat.max);
};

export const getPeerComparison = (
  vehicleId: string,
  partType: string,
  partsData: PartHealthData[],
  vehicles: Vehicle[]
) => {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return null;

  const category = getGVWCategory(vehicle.gvw || 0);
  const peers = partsData.filter(p => 
    p.partType === partType && 
    p.vehicleId !== vehicleId &&
    getGVWCategory(p.vehicleGVW)?.id === category?.id
  );

  if (peers.length === 0) return null;

  const currentVehiclePart = partsData.find(p => 
    p.vehicleId === vehicleId && p.partType === partType
  );

  const avgPeerLife = peers.reduce((sum, p) => sum + p.avgLifeAchieved, 0) / peers.length;
  const comparison = ((currentVehiclePart?.avgLifeAchieved || 0) - avgPeerLife) / avgPeerLife * 100;

  return {
    avgPeerLife: Math.round(avgPeerLife),
    vehicleLife: Math.round(currentVehiclePart?.avgLifeAchieved || 0),
    performanceVsPeers: comparison,
    peerCount: peers.length
  };
};

export const addPartReplacement = async (replacementData: Omit<PartReplacement, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
  try {
    const { data, error } = await supabase
      .from('parts_replacements')
      .insert([replacementData])
      .select()
      .single();

    if (error) {
      console.error('Error adding part replacement:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error adding part replacement:', error);
    throw error;
  }
};

export const updatePartReplacement = async (id: string, updates: Partial<PartReplacement>) => {
  try {
    const { data, error } = await supabase
      .from('parts_replacements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating part replacement:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating part replacement:', error);
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
      console.error('Error deleting part replacement:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting part replacement:', error);
    throw error;
  }
};
