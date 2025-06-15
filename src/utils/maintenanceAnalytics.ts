import { MaintenanceTask, MaintenanceServiceGroup } from '../types/maintenance';
import { Vehicle } from '../types';
import { supabase } from './supabaseClient';
import { format, parseISO, isValid, isWithinInterval, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

export type DateRange = {
  start: Date;
  end: Date;
};

export type MaintenanceMetrics = {
  totalTasks: number;
  pendingTasks: number;
  completedTasksThisMonth: number;
  averageCompletionTime: number;
  averageCost: number;
  totalExpenditure: number;
  monthlyExpenditure: { month: string; cost: number }[];
  expenditureByVehicle: { vehicleId: string; registration: string; cost: number }[];
  expenditureByVendor: { vendorId: string; name: string; cost: number }[];
  taskTypeDistribution: { type: string; count: number }[];
  vehicleDowntime: { vehicleId: string; registration: string; downtime: number }[];
  kmBetweenMaintenance: { vehicleId: string; registration: string; kmReadings: number[] }[];
  topMaintenanceCategories: { category: string; cost: number }[];
  filteredTasks: MaintenanceTask[];
};

export const getDateRangeForFilter = (filterType: string, customStart?: string, customEnd?: string): DateRange => {
  const now = new Date();
  
  switch (filterType) {
    case 'today':
      return {
        start: new Date(now.setHours(0, 0, 0, 0)),
        end: now
      };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return {
        start: new Date(yesterday.setHours(0, 0, 0, 0)),
        end: new Date(yesterday.setHours(23, 59, 59, 999))
      };
    }
    case 'last7Days':
      return {
        start: subDays(now, 7),
        end: now
      };
    case 'thisMonth':
      return {
        start: startOfMonth(now),
        end: now
      };
    case 'lastMonth': {
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };
    }
    case 'thisYear':
      return {
        start: startOfYear(now),
        end: now
      };
    case 'lastYear': {
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear)
      };
    }
    case 'custom':
      if (customStart && customEnd) {
        return {
          start: new Date(customStart),
          end: new Date(customEnd)
        };
      }
      // Fallback to last 30 days if custom dates are invalid
      return {
        start: subDays(now, 30),
        end: now
      };
    default:
      // Default to last 30 days
      return {
        start: subDays(now, 30),
        end: now
      };
  }
};

export const calculateMaintenanceMetrics = (
  tasks: MaintenanceTask[],
  vehicles: Vehicle[],
  dateRange: DateRange
): MaintenanceMetrics => {
  // Filter tasks by date range
  const filteredTasks = Array.isArray(tasks) ? tasks.filter(task => {
    const taskDate = new Date(task.start_date);
    return isValid(taskDate) && isWithinInterval(taskDate, dateRange);
  }) : [];
  
  // Create vehicle lookup map
  const vehicleMap: Record<string, Vehicle> = {};
  if (Array.isArray(vehicles)) {
    vehicles.forEach(vehicle => {
      vehicleMap[vehicle.id] = vehicle;
    });
  }
  
  // Calculate total tasks
  const totalTasks = filteredTasks.length;
  
  // Calculate pending tasks
  const pendingTasks = filteredTasks.filter(task => 
    task.status === 'open' || task.status === 'in_progress' || task.status === 'escalated'
  ).length;
  
  // Calculate completed tasks this month
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const completedTasksThisMonth = filteredTasks.filter(task => 
    task.status === 'resolved' && 
    new Date(task.start_date) >= thisMonthStart
  ).length;
  
  // Calculate average completion time (in days)
  const completedTasks = filteredTasks.filter(task => 
    task.status === 'resolved' && task.start_date && task.end_date
  );
  
  const totalCompletionTime = completedTasks.reduce((sum, task) => {
    const start = new Date(task.start_date);
    const end = new Date(task.end_date!);
    return sum + ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, 0);
  
  const averageCompletionTime = completedTasks.length > 0 
    ? Math.round((totalCompletionTime / completedTasks.length) * 10) / 10 
    : 0;
  
  // Calculate total expenditure and average cost
  const costsFromServiceGroups = filteredTasks.reduce((sum, task) => {
    if (Array.isArray(task.service_groups)) {
      return sum + task.service_groups.reduce((groupSum, group) => 
        groupSum + (typeof group.cost === 'number' ? group.cost : 0), 0);
    }
    return sum;
  }, 0);
  
  const costsFromTasks = filteredTasks.reduce((sum, task) => 
    sum + (task.actual_cost || task.estimated_cost || 0), 0);
  
  const totalExpenditure = Math.max(costsFromServiceGroups, costsFromTasks);
  const averageCost = totalTasks > 0 ? totalExpenditure / totalTasks : 0;
  
  // Calculate monthly expenditure
  const monthlyExpenditure: { month: string; cost: number }[] = [];
  const monthlyData: Record<string, number> = {};
  
  filteredTasks.forEach(task => {
    const date = new Date(task.start_date);
    if (!isValid(date)) return;
    
    const monthKey = format(date, 'MMM yyyy');
    const cost = task.actual_cost || task.estimated_cost || 0;
    
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + cost;
  });
  
  // Convert to array and sort chronologically
  Object.entries(monthlyData).forEach(([month, cost]) => {
    monthlyExpenditure.push({ month, cost });
  });
  
  monthlyExpenditure.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Calculate expenditure by vehicle
  const vehicleExpenditureMap: Record<string, number> = {};
  
  filteredTasks.forEach(task => {
    const vehicleId = task.vehicle_id;
    if (!vehicleId) return;
    
    const cost = task.actual_cost || task.estimated_cost || 0;
    vehicleExpenditureMap[vehicleId] = (vehicleExpenditureMap[vehicleId] || 0) + cost;
  });
  
  const expenditureByVehicle = Object.entries(vehicleExpenditureMap)
    .map(([vehicleId, cost]) => ({
      vehicleId,
      registration: vehicleMap[vehicleId]?.registration_number || 'Unknown',
      cost
    }))
    .sort((a, b) => b.cost - a.cost); // Sort by highest cost first
  
  // Calculate expenditure by vendor
  const vendorExpenditureMap: Record<string, { name: string; cost: number }> = {};
  
  filteredTasks.forEach(task => {
    if (Array.isArray(task.service_groups)) {
      task.service_groups.forEach(group => {
        const vendorId = group.vendor_id;
        if (!vendorId) return;
        
        if (!vendorExpenditureMap[vendorId]) {
          vendorExpenditureMap[vendorId] = {
            name: vendorId, // Would be replaced by actual vendor name if available
            cost: 0
          };
        }
        
        vendorExpenditureMap[vendorId].cost += (typeof group.cost === 'number' ? group.cost : 0);
      });
    }
  });
  
  const expenditureByVendor = Object.entries(vendorExpenditureMap)
    .map(([vendorId, data]) => ({
      vendorId,
      name: data.name,
      cost: data.cost
    }))
    .sort((a, b) => b.cost - a.cost); // Sort by highest cost first
  
  // Calculate task type distribution
  const taskTypeMap: Record<string, number> = {};
  
  filteredTasks.forEach(task => {
    const taskType = task.task_type;
    taskTypeMap[taskType] = (taskTypeMap[taskType] || 0) + 1;
  });
  
  const taskTypeDistribution = Object.entries(taskTypeMap)
    .map(([type, count]) => ({
      type,
      count
    }));
  
  // Calculate vehicle downtime
  const vehicleDowntimeMap: Record<string, number> = {};
  
  filteredTasks.forEach(task => {
    const vehicleId = task.vehicle_id;
    if (!vehicleId) return;
    
    const downtime = task.downtime_days || 0;
    vehicleDowntimeMap[vehicleId] = (vehicleDowntimeMap[vehicleId] || 0) + downtime;
  });
  
  const vehicleDowntime = Object.entries(vehicleDowntimeMap)
    .map(([vehicleId, downtime]) => ({
      vehicleId,
      registration: vehicleMap[vehicleId]?.registration_number || 'Unknown',
      downtime
    }))
    .sort((a, b) => b.downtime - a.downtime); // Sort by highest downtime first
  
  // Calculate KM between maintenance
  const vehicleMaintenanceMap: Record<string, number[]> = {};
  
  // Group tasks by vehicle
  const tasksByVehicle: Record<string, MaintenanceTask[]> = {};
  filteredTasks.forEach(task => {
    const vehicleId = task.vehicle_id;
    if (!vehicleId || !task.odometer_reading) return;
    
    if (!tasksByVehicle[vehicleId]) {
      tasksByVehicle[vehicleId] = [];
    }
    
    tasksByVehicle[vehicleId].push(task);
  });
  
  // Sort tasks by date and calculate differences
  Object.entries(tasksByVehicle).forEach(([vehicleId, vehicleTasks]) => {
    const sortedTasks = [...vehicleTasks].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    
    if (sortedTasks.length < 2) return;
    
    const kmReadings: number[] = [];
    
    for (let i = 1; i < sortedTasks.length; i++) {
      const current = sortedTasks[i].odometer_reading;
      const previous = sortedTasks[i - 1].odometer_reading;
      
      if (current && previous) {
        const difference = current - previous;
        if (difference > 0) {
          kmReadings.push(difference);
        }
      }
    }
    
    if (kmReadings.length > 0) {
      vehicleMaintenanceMap[vehicleId] = kmReadings;
    }
  });
  
  const kmBetweenMaintenance = Object.entries(vehicleMaintenanceMap)
    .map(([vehicleId, kmReadings]) => ({
      vehicleId,
      registration: vehicleMap[vehicleId]?.registration_number || 'Unknown',
      kmReadings
    }));
  
  // Calculate top maintenance categories by spend
  const categorySpendMap: Record<string, number> = {};
  
  filteredTasks.forEach(task => {
    if (Array.isArray(task.service_groups)) {
      task.service_groups.forEach(group => {
        // Use task.category if available, otherwise use a default category
        const category = task.category || 'General Service / Multi-System';
        categorySpendMap[category] = (categorySpendMap[category] || 0) + (group.cost || 0);
      });
    }
  });
  
  const topMaintenanceCategories = Object.entries(categorySpendMap)
    .map(([category, cost]) => ({
      category,
      cost
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 20); // Limit to top 20 categories
  
  return {
    totalTasks,
    pendingTasks,
    completedTasksThisMonth,
    averageCompletionTime,
    averageCost,
    totalExpenditure,
    monthlyExpenditure,
    expenditureByVehicle,
    expenditureByVendor,
    taskTypeDistribution,
    vehicleDowntime,
    kmBetweenMaintenance,
    topMaintenanceCategories,
    filteredTasks
  };
};

export const getMaintenanceMetricsWithComparison = async (
  currentDateRange: DateRange,
  allTasks: MaintenanceTask[] = [],
  allVehicles: Vehicle[] = []
): Promise<MaintenanceMetrics & { 
  previousPeriodComparison: { 
    totalTasks: number;
    totalExpenditure: number; 
    percentChange: number;
  }
}> => {
  try {
    // Calculate previous period date range (same duration, earlier time period)
    const currentDuration = currentDateRange.end.getTime() - currentDateRange.start.getTime();
    const previousStart = new Date(currentDateRange.start.getTime() - currentDuration);
    const previousEnd = new Date(currentDateRange.end.getTime() - currentDuration);
    
    const previousDateRange = {
      start: previousStart,
      end: previousEnd
    };
    
    // Fetch all maintenance tasks from both time periods if not provided
    let tasksData = allTasks;
    let vehiclesData = allVehicles;
    
    if (!tasksData.length || !vehiclesData.length) {
      const [tasksResponse, vehiclesResponse] = await Promise.all([
        supabase
          .from('maintenance_tasks')
          .select('*, service_groups:maintenance_service_tasks(*)')
          .gte('start_date', previousStart.toISOString()),
        supabase
          .from('vehicles')
          .select('*')
      ]);
      
      if (tasksResponse.error) {
        console.error('Error fetching maintenance tasks:', tasksResponse.error);
        throw tasksResponse.error;
      }
      
      if (vehiclesResponse.error) {
        console.error('Error fetching vehicles:', vehiclesResponse.error);
        throw vehiclesResponse.error;
      }
      
      tasksData = tasksResponse.data || [];
      vehiclesData = vehiclesResponse.data || [];
    }
    
    // Filter tasks for current period
    const currentTasks = Array.isArray(tasksData) ? tasksData.filter(task => {
      const taskDate = new Date(task.start_date);
      return isValid(taskDate) && isWithinInterval(taskDate, currentDateRange);
    }) : [];
    
    // Filter tasks for previous period
    const previousTasks = Array.isArray(tasksData) ? tasksData.filter(task => {
      const taskDate = new Date(task.start_date);
      return isValid(taskDate) && isWithinInterval(taskDate, previousDateRange);
    }) : [];
    
    // Calculate metrics for current period
    const currentMetrics = calculateMaintenanceMetrics(
      currentTasks,
      Array.isArray(vehiclesData) ? vehiclesData : [],
      currentDateRange
    );
    
    // Calculate total tasks and expenditure for previous period
    const previousTotalTasks = previousTasks.length;
    
    const previousExpenditure = previousTasks.reduce((sum, task) => {
      if (Array.isArray(task.service_groups)) {
        return sum + task.service_groups.reduce((groupSum, group) => 
          groupSum + (typeof group.cost === 'number' ? group.cost : 0), 0);
      }
      return sum + (task.actual_cost || task.estimated_cost || 0);
    }, 0);
    
    // Calculate percent change in expenditure
    const percentChange = previousExpenditure > 0
      ? ((currentMetrics.totalExpenditure - previousExpenditure) / previousExpenditure) * 100
      : 0;
    
    return {
      ...currentMetrics,
      previousPeriodComparison: {
        totalTasks: previousTotalTasks,
        totalExpenditure: previousExpenditure,
        percentChange
      }
    };
  } catch (error) {
    console.error('Error calculating maintenance metrics with comparison:', error);
    throw error;
  }
};

export const exportMaintenanceReport = (
  tasks: MaintenanceTask[],
  vehicles: Vehicle[],
  format: 'csv' | 'pdf' = 'csv'
) => {
  // This function would be implemented to export the report data
  // For CSV, you would use a library like PapaParse
  // For PDF, you would use jsPDF or another PDF generation library
  console.log(`Exporting maintenance report in ${format} format`);
  // Implementation details would depend on the specific libraries used
};