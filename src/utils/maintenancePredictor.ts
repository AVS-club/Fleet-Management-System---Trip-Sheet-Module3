import { MaintenanceTask, MAINTENANCE_ITEMS } from '../types/maintenance';
import { getTasks } from './maintenanceStorage';
import { getVehicle } from './storage';

interface ServicePrediction {
  date: string;
  odometer: number;
  confidence: number;
}

export const predictNextService = async (
  vehicleId: string,
  currentOdometer: number
): Promise<ServicePrediction | undefined> => {
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
  
  // Check for invalid calculations
  if (daysDiff === 0 || !isFinite(daysDiff) || !isFinite(kmDiff)) {
    return undefined;
  }
  
  const avgKmPerDay = kmDiff / daysDiff;
  
  // Check if avgKmPerDay is valid
  if (!isFinite(avgKmPerDay) || avgKmPerDay <= 0) {
    return undefined;
  }

  // Find the maintenance item with the earliest due date/km
  let nextDueKm = Infinity;
  let nextDueDays = Infinity;

  const taskTitles = Array.isArray(latestTask.title) ? latestTask.title : [];
  taskTitles.forEach(taskId => {
    const item = MAINTENANCE_ITEMS.find(i => i.id === taskId);
    if (item) {
      if (item.standardLifeKm && isFinite(item.standardLifeKm)) {
        const kmUntilDue = item.standardLifeKm;
        nextDueKm = Math.min(nextDueKm, kmUntilDue);
      }
      if (item.standardLifeDays && isFinite(item.standardLifeDays)) {
        nextDueDays = Math.min(nextDueDays, item.standardLifeDays);
      }
    }
  });

  // Check if we have valid due dates/km
  if (!isFinite(nextDueKm) && !isFinite(nextDueDays)) {
    return undefined;
  }

  // Calculate prediction
  const daysUntilDue = isFinite(nextDueKm) ? nextDueKm / avgKmPerDay : nextDueDays;
  const finalDaysUntilDue = isFinite(nextDueDays) ? Math.min(daysUntilDue, nextDueDays) : daysUntilDue;
  
  // Check if final calculation is valid
  if (!isFinite(finalDaysUntilDue) || finalDaysUntilDue <= 0) {
    return undefined;
  }

  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + finalDaysUntilDue);
  
  // Check if the predicted date is valid
  if (!isFinite(predictedDate.getTime())) {
    return undefined;
  }

  const predictedOdometer = currentOdometer + (avgKmPerDay * finalDaysUntilDue);
  
  // Check if predicted odometer is valid
  if (!isFinite(predictedOdometer)) {
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

  return {
    date: predictedDate.toISOString(),
    odometer: Math.round(predictedOdometer),
    confidence
  };
};

export const isMaintenanceOverdue = async (
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
    if (item.standardLifeDays) {
      const lastServiceDate = new Date(task.start_date);
      const daysElapsed = Math.floor(
        (new Date().getTime() - lastServiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysElapsed > item.standardLifeDays) {
        isOverdue = true;
        daysOverdue = daysElapsed - item.standardLifeDays;
      }
    }

    // Check kilometers
    if (item.standardLifeKm) {
      const kmElapsed = vehicle.current_odometer - task.odometer_reading;
      if (kmElapsed > item.standardLifeKm) {
        isOverdue = true;
        kmOverdue = kmElapsed - item.standardLifeKm;
      }
    }
  });

  return { 
    is_overdue: isOverdue, 
    days_overdue: daysOverdue, 
    km_overdue: kmOverdue 
  };
};

export default {
  predictNextService,
  isMaintenanceOverdue
};