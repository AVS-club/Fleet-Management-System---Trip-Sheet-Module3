import { MaintenanceTask, MAINTENANCE_ITEMS } from '@/types/maintenance';
import { Vehicle } from '@/types';
import { format, differenceInDays, differenceInMonths } from 'date-fns';

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
  }
];

// Map maintenance task names to part IDs
const mapTaskToPartId = (taskName: string): string | null => {
  const name = taskName.toLowerCase();
  
  if (name.includes('tyre') || name.includes('tire')) {
    if (name.includes('front') || name.includes('fl') || name.includes('fr')) {
      return 'tyres_front';
    } else if (name.includes('rear') || name.includes('rl') || name.includes('rr')) {
      return 'tyres_rear';
    }
    return 'tyres_front'; // default to front if position not specified
  }
  
  if (name.includes('battery')) return 'battery';
  if (name.includes('brake pad')) return 'brake_pads';
  if (name.includes('clutch')) return 'clutch_plate';
  if (name.includes('timing belt')) return 'timing_belt';
  if (name.includes('shock absorber')) return 'shock_absorbers';
  if (name.includes('air filter')) return 'air_filter';
  if (name.includes('fuel filter')) return 'fuel_filter';
  if (name.includes('alternator')) return 'alternator';
  if (name.includes('engine mount')) return 'engine_mounts';
  if (name.includes('leaf spring')) return 'leaf_springs';
  if (name.includes('wheel bearing')) return 'wheel_bearings';
  if (name.includes('gearbox')) return 'gearbox';
  if (name.includes('differential')) return 'differential';
  if (name.includes('radiator')) return 'radiator';
  
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
    
    // Process service groups for battery and tyre tracking
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
            
            const partId = mapTaskToPartId(maintenanceItem.name);
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