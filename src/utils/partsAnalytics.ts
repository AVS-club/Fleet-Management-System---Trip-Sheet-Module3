import { MaintenanceTask, MAINTENANCE_ITEMS } from '@/types/maintenance';
import { Vehicle, Tag } from '@/types';
import { format, differenceInDays, differenceInMonths, subMonths } from 'date-fns';

interface PartDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  standardLifeKm?: number;
  standardLifeDays?: number;
  warrantyPeriod?: number; // in days
  criticalThreshold: number; // percentage below which it's critical
  warningThreshold: number; // percentage below which it needs attention
}

export interface PartHealthMetrics {
  partId: string;
  partName: string;
  category: string;
  icon: string;
  status: 'good' | 'needs_attention' | 'overdue' | 'no_data';
  lastReplacedDate?: string;
  vehiclesAffected: number; // only vehicles that are due/overdue
  totalVehiclesWithData: number; // total vehicles with this part data
  averageCost: number;
  maxKmSinceReplacement: number;
  maxMonthsSinceReplacement: number;
  lifeRemainingPercentage: number;
  warrantyStatus?: 'valid' | 'expiring' | 'expired' | 'unknown';
  warrantyExpiryDate?: string;
  alerts: string[];
  brandPerformance?: {
    bestBrand?: string;
    worstBrand?: string;
    brands: Array<{
      name: string;
      averageCost: number;
      averageLifeKm: number;
      usageCount: number;
    }>;
  };
}

// Enhanced interface for tag-based metrics
export interface TagBasedPartHealthMetrics extends PartHealthMetrics {
  vehicleReg?: string; // Added for vehicle identification
  vehicleLastFourDigits?: string; // Last 4 digits of registration
  tagId?: string;
  tagName?: string;
  tagColor?: string;
  peerComparison?: {
    averageLifeInTag: number;
    performanceVsPeers: 'above_average' | 'average' | 'below_average';
    percentileInTag: number;
    bestPerformingVehicle?: {
      id: string;
      registration: string;
      lifePercentage: number;
    };
    worstPerformingVehicle?: {
      id: string;
      registration: string;
      lifePercentage: number;
    };
    totalVehiclesInTag: number;
  };
}

export interface HistoricalTrendData {
  month: string;
  averagePartLife: number;
  replacementCount: number;
  totalCost: number;
  criticalIssues: number;
  byTag?: {
    tagId: string;
    tagName: string;
    avgLife: number;
    count: number;
  }[];
}

// Comprehensive part definitions for fleet vehicles
const PART_DEFINITIONS: PartDefinition[] = [
  {
    id: 'tyres_front',
    name: 'Tyres (Front)',
    category: 'Tyres & Wheels',
    icon: '🛞',
    standardLifeKm: 60000,
    standardLifeDays: 730, // 2 years
    warrantyPeriod: 365, // 1 year
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'tyres_rear',
    name: 'Tyres (Rear)',
    category: 'Tyres & Wheels',
    icon: '🛞',
    standardLifeKm: 60000,
    standardLifeDays: 730,
    warrantyPeriod: 365,
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'battery',
    name: 'Battery',
    category: 'Electrical',
    icon: '🔋',
    standardLifeKm: 80000,
    standardLifeDays: 1095, // 3 years
    warrantyPeriod: 730, // 2 years
    criticalThreshold: 15,
    warningThreshold: 30
  },
  {
    id: 'brake_pads',
    name: 'Brake Pads',
    category: 'Brakes & Safety',
    icon: '🛑',
    standardLifeKm: 40000,
    standardLifeDays: 365,
    criticalThreshold: 10,
    warningThreshold: 20
  },
  {
    id: 'clutch_plate',
    name: 'Clutch Plate',
    category: 'Transmission',
    icon: '⚙️',
    standardLifeKm: 80000,
    standardLifeDays: 1825, // 5 years
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'timing_belt',
    name: 'Timing Belt',
    category: 'Engine',
    icon: '🔧',
    standardLifeKm: 100000,
    standardLifeDays: 1460, // 4 years
    criticalThreshold: 5,
    warningThreshold: 15
  },
  {
    id: 'shock_absorbers',
    name: 'Shock Absorbers',
    category: 'Suspension',
    icon: '🔩',
    standardLifeKm: 80000,
    standardLifeDays: 1095,
    criticalThreshold: 15,
    warningThreshold: 30
  },
  {
    id: 'air_filter',
    name: 'Air Filter',
    category: 'Engine',
    icon: '🌬️',
    standardLifeKm: 20000,
    standardLifeDays: 180, // 6 months
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'fuel_filter',
    name: 'Fuel Filter',
    category: 'Engine',
    icon: '⛽',
    standardLifeKm: 30000,
    standardLifeDays: 365,
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'alternator',
    name: 'Alternator',
    category: 'Electrical',
    icon: '⚡',
    standardLifeKm: 120000,
    standardLifeDays: 2190, // 6 years
    criticalThreshold: 10,
    warningThreshold: 20
  },
  {
    id: 'engine_mounts',
    name: 'Engine Mounts',
    category: 'Engine',
    icon: '🔧',
    standardLifeKm: 100000,
    standardLifeDays: 1825,
    criticalThreshold: 15,
    warningThreshold: 30
  },
  {
    id: 'leaf_springs',
    name: 'Leaf Springs',
    category: 'Suspension',
    icon: '🔩',
    standardLifeKm: 120000,
    standardLifeDays: 2190,
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'wheel_bearings',
    name: 'Wheel Bearings',
    category: 'Tyres & Wheels',
    icon: '⚙️',
    standardLifeKm: 80000,
    standardLifeDays: 1460,
    criticalThreshold: 10,
    warningThreshold: 20
  },
  {
    id: 'gearbox',
    name: 'Gearbox Overhaul',
    category: 'Transmission',
    icon: '⚙️',
    standardLifeKm: 150000,
    standardLifeDays: 2920, // 8 years
    criticalThreshold: 5,
    warningThreshold: 15
  },
  {
    id: 'differential',
    name: 'Differential Oil',
    category: 'Transmission',
    icon: '🛢️',
    standardLifeKm: 50000,
    standardLifeDays: 730,
    criticalThreshold: 15,
    warningThreshold: 30
  },
  {
    id: 'radiator',
    name: 'Radiator',
    category: 'Cooling',
    icon: '🌡️',
    standardLifeKm: 100000,
    standardLifeDays: 1825,
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'oil_filter',
    name: 'Oil Filter',
    category: 'Engine',
    icon: '🛢️',
    standardLifeKm: 10000,
    standardLifeDays: 90,
    criticalThreshold: 5,
    warningThreshold: 15
  },
  {
    id: 'spark_plugs',
    name: 'Spark Plugs',
    category: 'Engine',
    icon: '⚡',
    standardLifeKm: 40000,
    standardLifeDays: 365,
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'water_pump',
    name: 'Water Pump',
    category: 'Cooling',
    icon: '💧',
    standardLifeKm: 80000,
    standardLifeDays: 1095,
    criticalThreshold: 10,
    warningThreshold: 25
  },
  {
    id: 'starter_motor',
    name: 'Starter Motor',
    category: 'Electrical',
    icon: '🔋',
    standardLifeKm: 100000,
    standardLifeDays: 1825,
    criticalThreshold: 15,
    warningThreshold: 30
  },
  {
    id: 'headlights',
    name: 'Headlights',
    category: 'Electrical',
    icon: '💡',
    standardLifeKm: 50000,
    standardLifeDays: 730,
    criticalThreshold: 20,
    warningThreshold: 40
  },
  {
    id: 'wiper_blades',
    name: 'Wiper Blades',
    category: 'Body',
    icon: '🌧️',
    standardLifeKm: 20000,
    standardLifeDays: 180,
    criticalThreshold: 10,
    warningThreshold: 20
  }
];

// Enhanced mapping function to detect parts from maintenance task names
const mapTaskToPartId = (taskName: string): string | null => {
  const name = taskName.toLowerCase();
  
  // Tyres - Enhanced detection
  if (name.includes('tyre') || name.includes('tire') || name.includes('wheel')) {
    if (name.includes('front') || name.includes('fl') || name.includes('fr')) {
      return 'tyres_front';
    } else if (name.includes('rear') || name.includes('rl') || name.includes('rr')) {
      return 'tyres_rear';
    }
    return 'tyres_front'; // default to front if position not specified
  }
  
  // Battery - Enhanced detection
  if (name.includes('battery') || name.includes('accumulator')) return 'battery';
  
  // Brakes - Enhanced detection
  if (name.includes('brake pad') || name.includes('brake disc') || name.includes('brake shoe') || 
      name.includes('brake lining') || name.includes('brake') && (name.includes('pad') || name.includes('disc'))) {
    return 'brake_pads';
  }
  
  // Clutch - Enhanced detection
  if (name.includes('clutch') || name.includes('clutch plate') || name.includes('clutch disc')) {
    return 'clutch_plate';
  }
  
  // Timing Belt - Enhanced detection
  if (name.includes('timing belt') || name.includes('timing chain') || name.includes('cam belt')) {
    return 'timing_belt';
  }
  
  // Shock Absorbers - Enhanced detection
  if (name.includes('shock absorber') || name.includes('shock') || name.includes('damper') || 
      name.includes('suspension') && name.includes('shock')) {
    return 'shock_absorbers';
  }
  
  // Air Filter - Enhanced detection
  if (name.includes('air filter') || name.includes('air cleaner') || name.includes('filter') && name.includes('air')) {
    return 'air_filter';
  }
  
  // Fuel Filter - Enhanced detection
  if (name.includes('fuel filter') || name.includes('diesel filter') || name.includes('filter') && name.includes('fuel')) {
    return 'fuel_filter';
  }
  
  // Alternator - Enhanced detection
  if (name.includes('alternator') || name.includes('generator') || name.includes('dynamo')) {
    return 'alternator';
  }
  
  // Engine Mounts - Enhanced detection
  if (name.includes('engine mount') || name.includes('motor mount') || name.includes('mount') && name.includes('engine')) {
    return 'engine_mounts';
  }
  
  // Leaf Springs - Enhanced detection
  if (name.includes('leaf spring') || name.includes('spring') && name.includes('leaf') || 
      name.includes('suspension') && name.includes('spring')) {
    return 'leaf_springs';
  }
  
  // Wheel Bearings - Enhanced detection
  if (name.includes('wheel bearing') || name.includes('bearing') && name.includes('wheel') || 
      name.includes('hub bearing')) {
    return 'wheel_bearings';
  }
  
  // Gearbox - Enhanced detection
  if (name.includes('gearbox') || name.includes('transmission') || name.includes('gear box')) {
    return 'gearbox';
  }
  
  // Differential - Enhanced detection
  if (name.includes('differential') || name.includes('diff') || name.includes('rear axle')) {
    return 'differential';
  }
  
  // Radiator - Enhanced detection
  if (name.includes('radiator') || name.includes('cooler') && name.includes('engine')) {
    return 'radiator';
  }
  
  // Oil Filter - New detection
  if (name.includes('oil filter') || name.includes('filter') && name.includes('oil')) {
    return 'oil_filter';
  }
  
  // Spark Plugs - New detection
  if (name.includes('spark plug') || name.includes('plug') && name.includes('spark')) {
    return 'spark_plugs';
  }
  
  // Water Pump - New detection
  if (name.includes('water pump') || name.includes('coolant pump')) {
    return 'water_pump';
  }
  
  // Starter Motor - New detection
  if (name.includes('starter motor') || name.includes('starter') || name.includes('self starter')) {
    return 'starter_motor';
  }
  
  // Headlights - New detection
  if (name.includes('headlight') || name.includes('head lamp') || name.includes('light') && name.includes('head')) {
    return 'headlights';
  }
  
  // Wiper Blades - New detection
  if (name.includes('wiper blade') || name.includes('wiper') || name.includes('windshield wiper')) {
    return 'wiper_blades';
  }
  
  return null;
};

// Calculate warranty status
const calculateWarrantyStatus = (
  replacementDate: string,
  warrantyPeriod: number
): { status: 'valid' | 'expiring' | 'expired'; expiryDate: string } => {
  const replaceDate = new Date(replacementDate);
  const expiryDate = new Date(replaceDate);
  expiryDate.setDate(expiryDate.getDate() + warrantyPeriod);
  
  const today = new Date();
  const daysUntilExpiry = differenceInDays(expiryDate, today);
  
  let status: 'valid' | 'expiring' | 'expired';
  if (daysUntilExpiry < 0) {
    status = 'expired';
  } else if (daysUntilExpiry <= 30) {
    status = 'expiring';
  } else {
    status = 'valid';
  }
  
  return {
    status,
    expiryDate: format(expiryDate, 'yyyy-MM-dd')
  };
};

// Main function to calculate parts health metrics
export const getPartsHealthMetrics = (
  tasks: MaintenanceTask[],
  vehicles: Vehicle[]
): PartHealthMetrics[] => {
  const vehicleMap = new Map<string, Vehicle>();
  vehicles.forEach(vehicle => vehicleMap.set(vehicle.id, vehicle));
  
  const partMetrics: Record<string, PartHealthMetrics> = {};
  
  // Initialize all parts with default values
  PART_DEFINITIONS.forEach(partDef => {
    partMetrics[partDef.id] = {
      partId: partDef.id,
      partName: partDef.name,
      category: partDef.category,
      icon: partDef.icon,
      status: 'no_data',
      vehiclesAffected: 0,
      totalVehiclesWithData: 0,
      averageCost: 0,
      maxKmSinceReplacement: 0,
      maxMonthsSinceReplacement: 0,
      lifeRemainingPercentage: 100,
      alerts: [],
      brandPerformance: {
        brands: []
      }
    };
  });
  
  // Process maintenance tasks
  const partReplacements: Record<string, Array<{
    vehicleId: string;
    date: string;
    cost: number;
    odometerReading: number;
    brand?: string;
    warrantyPeriod?: number;
  }>> = {};
  
  tasks.forEach(task => {
    const vehicle = vehicleMap.get(task.vehicle_id);
    if (!vehicle) return;
    
    // PRIORITY 1: Explicit parts_replaced field (NEW)
    if (task.parts_replaced && Array.isArray(task.parts_replaced)) {
      task.parts_replaced.forEach((part: any) => {
        const partId = mapTaskToPartId(part.partName);
        if (!partId) return;
        
        if (!partReplacements[partId]) partReplacements[partId] = [];
        
        partReplacements[partId].push({
          vehicleId: task.vehicle_id,
          date: part.replacementDate || task.start_date,
          cost: part.cost || 0,
          odometerReading: part.odometerAtReplacement || task.odometer_reading,
          brand: part.brand,
          warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
        });
      });
    }
    
    // PRIORITY 2: Extract parts from service_groups tasks array
    if (Array.isArray(task.service_groups)) {
      task.service_groups.forEach(serviceGroup => {
        if (Array.isArray(serviceGroup.tasks)) {
          serviceGroup.tasks.forEach(serviceName => {
            const partId = mapTaskToPartId(serviceName);
            if (partId) {
              if (!partReplacements[partId]) partReplacements[partId] = [];
              
              partReplacements[partId].push({
                vehicleId: task.vehicle_id,
                date: task.start_date,
                cost: serviceGroup.cost || 0,
                odometerReading: task.odometer_reading,
                brand: serviceGroup.battery_brand || serviceGroup.tyre_brand,
                warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
              });
            }
          });
        }
      });
    }
    
    // PRIORITY 3: Extract parts from parts_required array
    if (Array.isArray(task.parts_required)) {
      task.parts_required.forEach(part => {
        const partId = mapTaskToPartId(part.name);
        if (partId) {
          if (!partReplacements[partId]) partReplacements[partId] = [];
          
          partReplacements[partId].push({
            vehicleId: task.vehicle_id,
            date: task.start_date,
            cost: part.total_cost || part.unit_cost || 0,
            odometerReading: task.odometer_reading,
            brand: part.supplier,
            warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
          });
        }
      });
    }
    
    // PRIORITY 4: Extract parts from title array
    if (Array.isArray(task.title)) {
      task.title.forEach(titleItem => {
        const partId = mapTaskToPartId(titleItem);
        if (partId) {
          if (!partReplacements[partId]) partReplacements[partId] = [];
          
          partReplacements[partId].push({
            vehicleId: task.vehicle_id,
            date: task.start_date,
            cost: task.total_cost || task.estimated_cost || 0,
            odometerReading: task.odometer_reading,
            brand: undefined,
            warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
          });
        }
      });
    }
    
    // PRIORITY 5: Extract parts from description
    if (task.description) {
      const partId = mapTaskToPartId(task.description);
      if (partId) {
        if (!partReplacements[partId]) partReplacements[partId] = [];
        
        partReplacements[partId].push({
          vehicleId: task.vehicle_id,
          date: task.start_date,
          cost: task.total_cost || task.estimated_cost || 0,
          odometerReading: task.odometer_reading,
          brand: undefined,
          warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
        });
      }
    }
    
    // PRIORITY 6: Process service groups for battery and tyre tracking (legacy)
    if (Array.isArray(task.service_groups)) {
      task.service_groups.forEach(group => {
        // Battery replacement
        if (group.battery_tracking && group.battery_data) {
          const partId = 'battery';
          if (!partReplacements[partId]) partReplacements[partId] = [];
          
          partReplacements[partId].push({
            vehicleId: task.vehicle_id,
            date: task.start_date,
            cost: typeof group.cost === 'number' ? group.cost : 0,
            odometerReading: task.odometer_reading,
            brand: group.battery_data.brand,
            warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
          });
        }
        
        // Tyre replacement
        if (group.tyre_tracking && group.tyre_data) {
          const positions = group.tyre_data.positions || [];
          const costPerTyre = positions.length > 0 ? (typeof group.cost === 'number' ? group.cost : 0) / positions.length : 0;
          
          if (positions.some(pos => ['FL', 'FR'].includes(pos))) {
            const partId = 'tyres_front';
            if (!partReplacements[partId]) partReplacements[partId] = [];
            
            partReplacements[partId].push({
              vehicleId: task.vehicle_id,
              date: task.start_date,
              cost: costPerTyre,
              odometerReading: task.odometer_reading,
              brand: group.tyre_data.brand,
              warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
            });
          }
          
          if (positions.some(pos => ['RL', 'RR'].includes(pos))) {
            const partId = 'tyres_rear';
            if (!partReplacements[partId]) partReplacements[partId] = [];
            
            partReplacements[partId].push({
              vehicleId: task.vehicle_id,
              date: task.start_date,
              cost: costPerTyre,
              odometerReading: task.odometer_reading,
              brand: group.tyre_data.brand,
              warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
            });
          }
        }
        
        // Other parts from task list
        if (Array.isArray(group.tasks)) {
          group.tasks.forEach(taskId => {
            const maintenanceItem = MAINTENANCE_ITEMS.find(item => item.id === taskId);
            if (!maintenanceItem) return;
            
            // Handle i18n object in maintenanceItem.name
            let taskName = maintenanceItem.name;
            if (typeof taskName === 'object' && taskName !== null) {
              taskName = taskName.en || taskName.hi || Object.values(taskName)[0] || '';
            }
            const partId = mapTaskToPartId(taskName);
            if (!partId) return;
            
            if (!partReplacements[partId]) partReplacements[partId] = [];
            
            const costPerTask = group.tasks.length > 0 ? (typeof group.cost === 'number' ? group.cost : 0) / group.tasks.length : 0;
            
            partReplacements[partId].push({
              vehicleId: task.vehicle_id,
              date: task.start_date,
              cost: costPerTask,
              odometerReading: task.odometer_reading,
              warrantyPeriod: PART_DEFINITIONS.find(p => p.id === partId)?.warrantyPeriod
            });
          });
        }
      });
    }
  });
  
  // Calculate metrics for each part
  Object.entries(partReplacements).forEach(([partId, replacements]) => {
    const partDef = PART_DEFINITIONS.find(p => p.id === partId);
    if (!partDef || !partMetrics[partId]) return;
    
    const metrics = partMetrics[partId];
    
    // Sort replacements by date (newest first)
    const sortedReplacements = replacements.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    if (sortedReplacements.length === 0) return;
    
    // Get most recent replacement
    const latestReplacement = sortedReplacements[0];
    metrics.lastReplacedDate = latestReplacement.date;
    metrics.totalVehiclesWithData = new Set(replacements.map(r => r.vehicleId)).size;
    
    // Calculate average cost
    const totalCost = replacements.reduce((sum, r) => sum + r.cost, 0);
    metrics.averageCost = replacements.length > 0 ? totalCost / replacements.length : 0;
    
    // Calculate life remaining for each vehicle
    const today = new Date();
    let vehiclesNeedingAttention = 0;
    let minLifeRemaining = 100;
    
    // Group by vehicle to get latest replacement per vehicle
    const vehicleReplacements = new Map<string, typeof latestReplacement>();
    replacements.forEach(replacement => {
      const existing = vehicleReplacements.get(replacement.vehicleId);
      if (!existing || new Date(replacement.date) > new Date(existing.date)) {
        vehicleReplacements.set(replacement.vehicleId, replacement);
      }
    });
    
    vehicleReplacements.forEach((replacement, vehicleId) => {
      const vehicle = vehicleMap.get(vehicleId);
      if (!vehicle) return;
      
      // Calculate km since replacement
      const kmSinceReplacement = vehicle.current_odometer - replacement.odometerReading;
      metrics.maxKmSinceReplacement = Math.max(metrics.maxKmSinceReplacement, kmSinceReplacement);
      
      // Calculate months since replacement
      const monthsSinceReplacement = differenceInMonths(today, new Date(replacement.date));
      metrics.maxMonthsSinceReplacement = Math.max(metrics.maxMonthsSinceReplacement, monthsSinceReplacement);
      
      // Calculate life remaining percentage
      let lifeRemainingKm = 100;
      let lifeRemainingTime = 100;
      
      if (partDef.standardLifeKm) {
        lifeRemainingKm = Math.max(0, 100 - (kmSinceReplacement / partDef.standardLifeKm) * 100);
      }
      
      if (partDef.standardLifeDays) {
        const daysSinceReplacement = differenceInDays(today, new Date(replacement.date));
        lifeRemainingTime = Math.max(0, 100 - (daysSinceReplacement / partDef.standardLifeDays) * 100);
      }
      
      // Use the lower of the two percentages
      const vehicleLifeRemaining = Math.min(lifeRemainingKm, lifeRemainingTime);
      minLifeRemaining = Math.min(minLifeRemaining, vehicleLifeRemaining);
      
      // Count vehicles needing attention
      if (vehicleLifeRemaining < partDef.warningThreshold) {
        vehiclesNeedingAttention++;
      }
      
      // Add alerts for critical vehicles
      if (vehicleLifeRemaining < partDef.criticalThreshold) {
        metrics.alerts.push(
          `${vehicle.registration_number}: ${partDef.name} critically low (${vehicleLifeRemaining.toFixed(0)}% remaining)`
        );
      }
      
      // Check warranty status for batteries and tyres
      if ((partId === 'battery' || partId.includes('tyres')) && replacement.warrantyPeriod) {
        const warranty = calculateWarrantyStatus(replacement.date, replacement.warrantyPeriod);
        if (warranty.status === 'expiring') {
          metrics.alerts.push(
            `${vehicle.registration_number}: ${partDef.name} warranty expiring on ${format(new Date(warranty.expiryDate), 'dd MMM yyyy')}`
          );
        }
        
        if (!metrics.warrantyStatus || warranty.status === 'expiring' || warranty.status === 'expired') {
          metrics.warrantyStatus = warranty.status;
          metrics.warrantyExpiryDate = warranty.expiryDate;
        }
      }
    });
    
    metrics.lifeRemainingPercentage = minLifeRemaining;
    metrics.vehiclesAffected = vehiclesNeedingAttention;
    
    // Determine overall status
    if (minLifeRemaining < partDef.criticalThreshold) {
      metrics.status = 'overdue';
    } else if (minLifeRemaining < partDef.warningThreshold) {
      metrics.status = 'needs_attention';
    } else {
      metrics.status = 'good';
    }
    
    // Calculate brand performance
    const brandStats = new Map<string, { totalCost: number; totalKm: number; count: number }>();
    
    replacements.forEach(replacement => {
      if (!replacement.brand) return;
      
      const vehicle = vehicleMap.get(replacement.vehicleId);
      if (!vehicle) return;
      
      const kmSinceReplacement = vehicle.current_odometer - replacement.odometerReading;
      
      if (!brandStats.has(replacement.brand)) {
        brandStats.set(replacement.brand, { totalCost: 0, totalKm: 0, count: 0 });
      }
      
      const stats = brandStats.get(replacement.brand)!;
      stats.totalCost += replacement.cost;
      stats.totalKm += kmSinceReplacement;
      stats.count += 1;
    });
    
    const brands = Array.from(brandStats.entries()).map(([name, stats]) => ({
      name,
      averageCost: stats.count > 0 ? stats.totalCost / stats.count : 0,
      averageLifeKm: stats.count > 0 ? stats.totalKm / stats.count : 0,
      usageCount: stats.count
    }));
    
    // Sort brands by performance (cost per km)
    brands.sort((a, b) => {
      const aCostPerKm = a.averageLifeKm > 0 ? a.averageCost / a.averageLifeKm : Infinity;
      const bCostPerKm = b.averageLifeKm > 0 ? b.averageCost / b.averageLifeKm : Infinity;
      return aCostPerKm - bCostPerKm;
    });
    
    metrics.brandPerformance = {
      bestBrand: brands.length > 0 ? brands[0].name : undefined,
      worstBrand: brands.length > 1 ? brands[brands.length - 1].name : undefined,
      brands
    };
  });
  
  return Object.values(partMetrics).filter(metric => metric.status !== 'no_data' || metric.totalVehiclesWithData > 0);
};

// Get parts by category for organized display
export const getPartsByCategory = (partsMetrics: PartHealthMetrics[]): Record<string, PartHealthMetrics[]> => {
  const categories: Record<string, PartHealthMetrics[]> = {};
  
  partsMetrics.forEach(part => {
    if (!categories[part.category]) {
      categories[part.category] = [];
    }
    categories[part.category].push(part);
  });
  
  // Sort parts within each category by status (overdue first, then needs attention, then good)
  Object.keys(categories).forEach(category => {
    categories[category].sort((a, b) => {
      const statusOrder = { overdue: 0, needs_attention: 1, good: 2, no_data: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  });
  
  return categories;
};

// Calculate fleet-wide part health summary
export const getFleetPartHealthSummary = (partsMetrics: PartHealthMetrics[]) => {
  const summary = {
    totalParts: partsMetrics.length,
    overdueParts: 0,
    needsAttentionParts: 0,
    goodParts: 0,
    totalVehiclesAffected: 0,
    totalAlertsCount: 0,
    estimatedUpcomingCosts: 0
  };
  
  partsMetrics.forEach(part => {
    switch (part.status) {
      case 'overdue':
        summary.overdueParts++;
        break;
      case 'needs_attention':
        summary.needsAttentionParts++;
        break;
      case 'good':
        summary.goodParts++;
        break;
    }
    
    summary.totalVehiclesAffected += part.vehiclesAffected;
    summary.totalAlertsCount += part.alerts.length;
    
    // Estimate upcoming costs for parts needing attention
    if (part.status === 'overdue' || part.status === 'needs_attention') {
      summary.estimatedUpcomingCosts += part.averageCost * part.vehiclesAffected;
    }
  });
  
  return summary;
};

// Helper to get last 4 digits of registration
export const getLastFourDigits = (registration: string): string => {
  return registration.slice(-4);
};

// Calculate tag-based metrics
export const getTagBasedPartsHealthMetrics = (
  tasks: MaintenanceTask[],
  vehicles: Vehicle[],
  selectedTagIds?: string[] // Optional filter
): TagBasedPartHealthMetrics[] => {
  
  // Group vehicles by their tags
  const vehiclesByTag = new Map<string, Vehicle[]>();
  const untaggedVehicles: Vehicle[] = [];
  
  vehicles.forEach(vehicle => {
    if (vehicle.tags && vehicle.tags.length > 0) {
      vehicle.tags.forEach(tag => {
        // Filter by selected tags if provided
        if (selectedTagIds && selectedTagIds.length > 0 && !selectedTagIds.includes(tag.id)) {
          return;
        }
        
        if (!vehiclesByTag.has(tag.id)) {
          vehiclesByTag.set(tag.id, []);
        }
        vehiclesByTag.get(tag.id)!.push(vehicle);
      });
    } else {
      untaggedVehicles.push(vehicle);
    }
  });

  const allMetrics: TagBasedPartHealthMetrics[] = [];

  // Process tagged vehicles
  vehiclesByTag.forEach((tagVehicles, tagId) => {
    const tag = tagVehicles[0]?.tags?.find(t => t.id === tagId);
    
    // Get base metrics for this tag group
    const baseMetrics = getPartsHealthMetrics(tasks, tagVehicles);
    
    // Enhance each metric with tag and peer comparison
    baseMetrics.forEach(metric => {
      const enhancedMetric: TagBasedPartHealthMetrics = {
        ...metric,
        tagId: tagId,
        tagName: tag?.name || 'Unknown',
        tagColor: tag?.color_hex || '#3B82F6',
        peerComparison: calculatePeerComparison(
          metric.partId,
          tagVehicles,
          tasks
        )
      };
      allMetrics.push(enhancedMetric);
    });
  });

  // Process untagged vehicles if no filter is applied
  if (!selectedTagIds || selectedTagIds.length === 0) {
    if (untaggedVehicles.length > 0) {
      const untaggedMetrics = getPartsHealthMetrics(tasks, untaggedVehicles);
      untaggedMetrics.forEach(metric => {
        const enhancedMetric: TagBasedPartHealthMetrics = {
          ...metric,
          tagName: 'Untagged',
          peerComparison: calculatePeerComparison(
            metric.partId,
            untaggedVehicles,
            tasks
          )
        };
        allMetrics.push(enhancedMetric);
      });
    }
  }

  return allMetrics;
};

// Calculate peer comparison within a tag group
function calculatePeerComparison(
  partId: string,
  peerVehicles: Vehicle[],
  tasks: MaintenanceTask[]
): TagBasedPartHealthMetrics['peerComparison'] {
  
  const partLifespans: Array<{
    vehicleId: string;
    registration: string;
    lifePercentage: number;
  }> = [];
  
  peerVehicles.forEach(vehicle => {
    const vehicleTasks = tasks.filter(t => t.vehicle_id === vehicle.id);
    const partTasks = vehicleTasks.filter(t => 
      t.task_type === 'part_replacement' && 
      detectPartType(t.item_name || '') === partId
    );
    
    if (partTasks.length > 0) {
      const latestTask = partTasks.sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0];
      
      const kmSince = (vehicle.current_odometer || 0) - (latestTask.odometer_reading || 0);
      const standardLife = PART_DEFINITIONS.find(p => p.id === partId)?.standardLifeKm || 50000;
      const lifePercentage = Math.max(0, Math.min(100, 
        ((standardLife - kmSince) / standardLife) * 100
      ));
      
      partLifespans.push({
        vehicleId: vehicle.id,
        registration: vehicle.registration_number,
        lifePercentage
      });
    }
  });

  if (partLifespans.length === 0) {
    return {
      averageLifeInTag: 0,
      performanceVsPeers: 'average',
      percentileInTag: 50,
      totalVehiclesInTag: peerVehicles.length
    };
  }

  const averageLife = partLifespans.reduce((sum, p) => sum + p.lifePercentage, 0) / partLifespans.length;
  
  // Sort to find best and worst
  const sorted = [...partLifespans].sort((a, b) => b.lifePercentage - a.lifePercentage);
  
  return {
    averageLifeInTag: Math.round(averageLife),
    performanceVsPeers: 'average', // This will be set per vehicle
    percentileInTag: 50, // This will be calculated per vehicle
    bestPerformingVehicle: sorted.length > 0 ? {
      id: sorted[0].vehicleId,
      registration: sorted[0].registration,
      lifePercentage: sorted[0].lifePercentage
    } : undefined,
    worstPerformingVehicle: sorted.length > 0 ? {
      id: sorted[sorted.length - 1].vehicleId,
      registration: sorted[sorted.length - 1].registration,
      lifePercentage: sorted[sorted.length - 1].lifePercentage
    } : undefined,
    totalVehiclesInTag: peerVehicles.length
  };
}

// Helper function to detect part type from task name
function detectPartType(taskName: string): string | null {
  return mapTaskToPartId(taskName);
}

// Calculate historical trends
export const calculateHistoricalTrends = (
  tasks: MaintenanceTask[],
  vehicles: Vehicle[],
  monthsBack: number = 12
): HistoricalTrendData[] => {
  const trends: HistoricalTrendData[] = [];
  const today = new Date();
  
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthDate = subMonths(today, i);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    const monthTasks = tasks.filter(t => {
      const taskDate = new Date(t.start_date);
      return taskDate >= monthStart && taskDate <= monthEnd;
    });
    
    // Calculate metrics for the month
    const replacementTasks = monthTasks.filter(t => t.task_type === 'part_replacement');
    const totalCost = replacementTasks.reduce((sum, t) => sum + (t.cost || 0), 0);
    const criticalCount = monthTasks.filter(t => t.priority === 'high').length;
    
    // Calculate by tag
    const tagMetrics = new Map<string, { name: string; avgLife: number; count: number; color: string }>();
    
    vehicles.forEach(vehicle => {
      if (vehicle.tags && vehicle.tags.length > 0) {
        const vehicleTasks = replacementTasks.filter(t => t.vehicle_id === vehicle.id);
        
        vehicle.tags.forEach(tag => {
          if (!tagMetrics.has(tag.id)) {
            tagMetrics.set(tag.id, { 
              name: tag.name, 
              avgLife: 0, 
              count: 0,
              color: tag.color_hex 
            });
          }
          
          const existing = tagMetrics.get(tag.id)!;
          existing.count += vehicleTasks.length;
        });
      }
    });
    
    trends.push({
      month: format(monthDate, 'MMM yyyy'),
      averagePartLife: replacementTasks.length > 0 ? 75 : 0, // Simplified
      replacementCount: replacementTasks.length,
      totalCost,
      criticalIssues: criticalCount,
      byTag: Array.from(tagMetrics.entries()).map(([tagId, data]) => ({
        tagId,
        tagName: data.name,
        avgLife: data.avgLife,
        count: data.count
      }))
    });
  }
  
  return trends;
};

// Get vehicle-specific part health with enhanced info
export const getVehiclePartHealth = (
  vehicleId: string,
  tasks: MaintenanceTask[],
  vehicles: Vehicle[]
): Array<{
  partName: string;
  status: 'good' | 'needs_attention' | 'overdue';
  lifePercentage: number;
  kmSinceReplacement: number;
  lastReplacement?: string;
  cost?: number;
}> => {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return [];
  
  const vehicleTasks = tasks.filter(t => t.vehicle_id === vehicleId);
  const parts: any[] = [];
  
  PART_DEFINITIONS.forEach(partDef => {
    const partTasks = vehicleTasks.filter(t => 
      detectPartType(t.item_name || '') === partDef.id
    );
    
    if (partTasks.length > 0) {
      const latestTask = partTasks.sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0];
      
      const kmSince = (vehicle.current_odometer || 0) - (latestTask.odometer_reading || 0);
      const standardLife = partDef.standardLifeKm || 50000;
      const remainingLife = standardLife - kmSince;
      const lifePercentage = Math.max(0, Math.min(100, (remainingLife / standardLife) * 100));
      
      let status: 'good' | 'needs_attention' | 'overdue';
      if (lifePercentage < 20) status = 'overdue';
      else if (lifePercentage < 50) status = 'needs_attention';
      else status = 'good';
      
      parts.push({
        partName: partDef.name,
        status,
        lifePercentage: Math.round(lifePercentage),
        kmSinceReplacement: kmSince,
        lastReplacement: latestTask.start_date,
        cost: latestTask.cost
      });
    }
  });
  
  return parts.sort((a, b) => a.lifePercentage - b.lifePercentage);
};