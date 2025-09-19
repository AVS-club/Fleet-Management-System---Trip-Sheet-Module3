import { MaintenanceTask, MAINTENANCE_ITEMS } from '@/types/maintenance';
import { getTasks } from './maintenanceStorage';
import { getVehicle } from './storage';

interface ServicePrediction {
  date: string;
  odometer: number;
  confidence: number;
}

// Cache for predictive maintenance calculations
interface PredictionCache {
  [key: string]: {
    prediction: ServicePrediction;
    timestamp: number;
    vehicleId: string;
    odometerReading: number;
  };
}

const predictionCache: PredictionCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Generate cache key
const getCacheKey = (vehicleId: string, odometerReading: number): string => {
  return `${vehicleId}-${Math.floor(odometerReading / 100) * 100}`; // Round to nearest 100km for cache efficiency
};

// Check if cache is valid
const isCacheValid = (cacheEntry: any): boolean => {
  const now = Date.now();
  return (now - cacheEntry.timestamp) < CACHE_DURATION;
};

// Clear expired cache entries
const clearExpiredCache = (): void => {
  const now = Date.now();
  Object.keys(predictionCache).forEach(key => {
    if ((now - predictionCache[key].timestamp) >= CACHE_DURATION) {
      delete predictionCache[key];
    }
  });
};

export const predictNextService = async (
  vehicleId: string,
  currentOdometer: number
): Promise<ServicePrediction | undefined> => {
  // Clear expired cache entries first
  clearExpiredCache();
  
  // Check cache first
  const cacheKey = getCacheKey(vehicleId, currentOdometer);
  const cachedEntry = predictionCache[cacheKey];
  
  if (cachedEntry && isCacheValid(cachedEntry)) {
    // Check if odometer reading is close enough (within 50km)
    const odometerDiff = Math.abs(cachedEntry.odometerReading - currentOdometer);
    if (odometerDiff <= 50) {
      return cachedEntry.prediction;
    }
  }

  const vehicle = await getVehicle(vehicleId);
  if (!vehicle) return undefined;

  // Get all maintenance tasks for this vehicle
  const allTasks = await getTasks();
  const tasks = Array.isArray(allTasks) ? allTasks.filter(task => task.vehicle_id === vehicleId) : [];
  if (tasks.length === 0) return undefined;

  // Calculate average daily kilometers
  const sortedTasks = tasks.sort((a, b) => 
    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  if (sortedTasks.length < 2) return undefined;

  const latestTask = sortedTasks[0];
  const previousTask = sortedTasks[1];

  const daysDiff = Math.abs(
    (new Date(latestTask.start_date).getTime() - new Date(previousTask.start_date).getTime()) 
    / (1000 * 60 * 60 * 24)
  );
  const kmDiff = Math.abs(latestTask.odometer_reading - previousTask.odometer_reading);
  
  // Prevent division by zero and ensure we have meaningful data
  if (daysDiff === 0 || kmDiff === 0) return undefined;
  const avgKmPerDay = kmDiff / daysDiff;
  
  // Ensure avgKmPerDay is a valid positive number
  if (!isFinite(avgKmPerDay) || avgKmPerDay <= 0) return undefined;

  // Find the maintenance item with the earliest due date/km
  let nextDueKm = Number.MAX_SAFE_INTEGER;
  let nextDueDays = Number.MAX_SAFE_INTEGER;

  const taskTitles = Array.isArray(latestTask.title) ? latestTask.title : [];
  taskTitles.forEach(taskId => {
    const item = MAINTENANCE_ITEMS.find(i => i.id === taskId);
    if (item) {
      if (item.standardLifeKm && item.standardLifeKm > 0) {
        const kmUntilDue = item.standardLifeKm;
        nextDueKm = Math.min(nextDueKm, kmUntilDue);
      }
      if (item.standardLifeDays && item.standardLifeDays > 0) {
        nextDueDays = Math.min(nextDueDays, item.standardLifeDays);
      }
    }
  });

  // Check if we found any valid due dates/km
  if (nextDueKm === Number.MAX_SAFE_INTEGER && nextDueDays === Number.MAX_SAFE_INTEGER) {
    return undefined;
  }

  // Calculate prediction
  let daysUntilDue = nextDueDays;
  
  // If we have km-based prediction, calculate days from km
  if (nextDueKm !== Number.MAX_SAFE_INTEGER) {
    const kmBasedDays = nextDueKm / avgKmPerDay;
    if (isFinite(kmBasedDays) && kmBasedDays > 0) {
      daysUntilDue = Math.min(daysUntilDue, kmBasedDays);
    }
  }
  
  // Ensure daysUntilDue is valid
  if (!isFinite(daysUntilDue) || daysUntilDue <= 0 || daysUntilDue === Number.MAX_SAFE_INTEGER) {
    return undefined;
  }

  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + Math.floor(daysUntilDue));
  
  // Validate the predicted date
  if (!isFinite(predictedDate.getTime()) || isNaN(predictedDate.getTime())) {
    return undefined;
  }

  const predictedOdometer = currentOdometer + Math.round(avgKmPerDay * daysUntilDue);
  
  // Validate predicted odometer
  if (!isFinite(predictedOdometer) || predictedOdometer < currentOdometer) {
    return undefined;
  }

  // Calculate confidence based on data consistency
  const confidence = Math.min(
    100,
    Math.round(
      (sortedTasks.length / 5) * 50 + // More historical data = higher confidence
      (daysDiff < 90 ? 30 : 20) + // Recent data = higher confidence
      (kmDiff > 1000 ? 20 : 10) // Significant usage = higher confidence
    )
  );

  const prediction: ServicePrediction = {
    date: predictedDate.toISOString(),
    odometer: predictedOdometer,
    confidence
  };

  // Cache the prediction
  predictionCache[cacheKey] = {
    prediction,
    timestamp: Date.now(),
    vehicleId,
    odometerReading: currentOdometer
  };

  return prediction;
};

const isMaintenanceOverdue = async (
  task: MaintenanceTask
): Promise<{ isOverdue: boolean; daysOverdue?: number; kmOverdue?: number }> => {
  const vehicle = await getVehicle(task.vehicle_id);
  if (!vehicle) return { isOverdue: false };

  let isOverdue = false;
  let daysOverdue: number | undefined;
  let kmOverdue: number | undefined;

  // Check each maintenance item
  const taskTitles = Array.isArray(task.title) ? task.title : [];
  taskTitles.forEach(taskId => {
    const item = MAINTENANCE_ITEMS.find(i => i.id === taskId);
    if (!item) return;

    // Check days
    if (item.standard_life_days) {
      const lastServiceDate = new Date(task.start_date);
      const daysElapsed = Math.floor(
        (new Date().getTime() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysElapsed > item.standard_life_days) {
        isOverdue = true;
        daysOverdue = daysElapsed - item.standard_life_days;
      }
    }

    // Check kilometers
    if (item.standard_life_km) {
      const kmElapsed = vehicle.current_odometer - task.odometer_reading;
      if (kmElapsed > item.standard_life_km) {
        isOverdue = true;
        kmOverdue = kmElapsed - item.standard_life_km;
      }
    }
  });

  return { 
    is_overdue: isOverdue, 
    days_overdue: daysOverdue, 
    km_overdue: kmOverdue 
  };
};

// Function to clear cache for a specific vehicle (call this when maintenance tasks are updated)
export const clearVehiclePredictionCache = (vehicleId: string): void => {
  Object.keys(predictionCache).forEach(key => {
    if (predictionCache[key].vehicleId === vehicleId) {
      delete predictionCache[key];
    }
  });
};

// Function to clear all prediction cache
export const clearAllPredictionCache = (): void => {
  Object.keys(predictionCache).forEach(key => {
    delete predictionCache[key];
  });
};

// Function to get cache statistics (useful for debugging)
export const getCacheStats = (): { size: number; entries: string[] } => {
  return {
    size: Object.keys(predictionCache).length,
    entries: Object.keys(predictionCache)
  };
};

