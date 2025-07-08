import { MaintenanceTask, Vehicle } from '../types';
import { supabase } from './supabaseClient';
import { format, parseISO, isValid, isWithinInterval, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { AIAlert } from '../types';

type DateRange = {
  start: Date;
  end: Date;
};

type MaintenanceMetrics = {
  totalTasks: number;
  pendingTasks: number;
  completedTasksThisMonth: number;
  averageCompletionTime: number;
  averageCost: number;
  totalExpenditure: number;
  documentationCost: number; // Added for documentation cost insights
  monthlyExpenditure: { month: string; cost: number }[];
  expenditureByVehicle: { vehicleId: string; registration: string; cost: number }[];
  expenditureByVendor: { vendorId: string; name: string; cost: number }[];
  taskTypeDistribution: { type: string; count: number }[];
  vehicleDowntime: { vehicleId: string; registration: string; downtime: number }[];
  kmBetweenMaintenance: { vehicleId: string; registration: string; kmReadings: number[] }[];
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
    case 'allTime':
      return {
        start: new Date('2020-01-01'),
        end: now
      };
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
  
  // Calculate documentation cost
  let documentationCost = 0;
  
  // Sum up all documentation-related costs from vehicles
  if (Array.isArray(vehicles)) {
    vehicles.forEach(vehicle => {
      // Add insurance premium
      if (vehicle.insurance_premium_amount) {
        documentationCost += vehicle.insurance_premium_amount;
      }
      
      // Add fitness certificate cost
      if (vehicle.fitness_cost) {
        documentationCost += vehicle.fitness_cost;
      }
      
      // Add permit cost
      if (vehicle.permit_cost) {
        documentationCost += vehicle.permit_cost;
      }
      
      // Add PUC cost
      if (vehicle.puc_cost) {
        documentationCost += vehicle.puc_cost;
      }
      
      // Add tax amount
      if (vehicle.tax_amount) {
        documentationCost += vehicle.tax_amount;
      }
      
      // Add costs from other documents
      if (vehicle.other_documents && Array.isArray(vehicle.other_documents)) {
        vehicle.other_documents.forEach(doc => {
          if (doc.cost) {
            documentationCost += doc.cost;
          }
        });
      }
    });
  }
  
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
  
  // Calculate task type distribution - improved to use service_groups.tasks
  const taskTypeMap: Record<string, number> = {};
  
  filteredTasks.forEach(task => {
    // First try to get tasks from service_groups
    if (Array.isArray(task.service_groups) && task.service_groups.length > 0) {
      task.service_groups.forEach(group => {
        if (Array.isArray(group.tasks)) {
          group.tasks.forEach(taskId => {
            // Find the task in MAINTENANCE_ITEMS to get its group
            const maintenanceItem = MAINTENANCE_ITEMS.find(item => item.id === taskId);
            if (maintenanceItem) {
              const groupName = MAINTENANCE_GROUPS[maintenanceItem.group]?.title || maintenanceItem.group;
              taskTypeMap[groupName] = (taskTypeMap[groupName] || 0) + 1;
            }
          });
        }
      });
    } else {
      // Fallback to task_type if no service_groups
      const taskType = task.task_type;
      taskTypeMap[taskType] = (taskTypeMap[taskType] || 0) + 1;
    }
  });
  
  const taskTypeDistribution = Object.entries(taskTypeMap)
    .map(([type, count]) => ({
      type,
      count
    }))
    .sort((a, b) => b.count - a.count); // Sort by highest count first
  
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
  
  return {
    totalTasks,
    pendingTasks,
    completedTasksThisMonth,
    averageCompletionTime,
    averageCost,
    totalExpenditure,
    documentationCost,
    monthlyExpenditure,
    expenditureByVehicle,
    expenditureByVendor,
    taskTypeDistribution,
    vehicleDowntime,
    kmBetweenMaintenance
  };
};

/**
 * Check for rising maintenance costs and create an AI alert if necessary
 * @param currentMonthExpenditure Current month's total maintenance expenditure
 * @param previousMonthExpenditure Previous month's total maintenance expenditure
 * @param dateRange Current date range being analyzed
 * @returns An AIAlert object if an alert was created, null otherwise
 */
const checkRisingCosts = async (
  currentMonthExpenditure: number,
  previousMonthExpenditure: number,
  dateRange: DateRange
): Promise<AIAlert | null> => {
  // Only create alert if we have valid data for both periods
  if (!currentMonthExpenditure || !previousMonthExpenditure || previousMonthExpenditure === 0) {
    return null;
  }
  
  // Calculate percentage increase
  const percentageIncrease = ((currentMonthExpenditure - previousMonthExpenditure) / previousMonthExpenditure) * 100;
  
  // Only create alert if increase is more than 20%
  if (percentageIncrease <= 20) {
    return null;
  }
  
  // Format date range for alert
  const startMonth = format(dateRange.start, 'MMMM yyyy');
  const endMonth = format(dateRange.end, 'MMMM yyyy');
  const monthKey = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
  
  // Check if an alert already exists for this period
  const { data: existingAlerts, error: checkError } = await supabase
    .from('ai_alerts')
    .select('*')
    .eq('alert_type', 'rising_maintenance_costs')
    .eq('metadata->>period', monthKey)
    .limit(1);
    
  if (checkError) {
    console.error('Error checking for existing maintenance cost alerts:', checkError);
    return null;
  }
  
  // If an alert already exists for this period, don't create another one
  if (existingAlerts && existingAlerts.length > 0) {
    console.log(`Alert for rising maintenance costs already exists for period ${monthKey}`);
    return null;
  }
  
  // Determine severity based on percentage increase
  const severity = percentageIncrease > 35 ? 'high' : 'medium';
  
  // Create alert data
  const alertData: Omit<AIAlert, 'id' | 'updated_at'> = {
    alert_type: 'rising_maintenance_costs',
    severity,
    status: 'pending',
    title: `Maintenance costs increased by ${percentageIncrease.toFixed(1)}%`,
    description: `Maintenance expenditure for ${monthKey} (₹${currentMonthExpenditure.toLocaleString()}) is ${percentageIncrease.toFixed(1)}% higher than the previous period (₹${previousMonthExpenditure.toLocaleString()}).`,
    affected_entity: {
      type: 'maintenance',
      id: 'cost_analysis'
    },
    metadata: {
      current_value: currentMonthExpenditure,
      previous_value: previousMonthExpenditure,
      percentage_increase: percentageIncrease,
      period: monthKey,
      recommendations: [
        'Review maintenance tasks for potential cost optimization',
        'Check for duplicate or unnecessary maintenance work',
        'Compare vendor pricing for similar services',
        'Investigate if any vehicles are requiring excessive maintenance'
      ]
    },
    created_at: new Date().toISOString()
  };
  
  try {
    // Insert the alert into Supabase
    const { data, error } = await supabase
      .from('ai_alerts')
      .insert(alertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating rising maintenance costs alert:', error);
      return null;
    }

    console.log('Created rising maintenance costs alert:', data);
    return data;
  } catch (error) {
    console.error('Exception creating rising maintenance costs alert:', error);
    return null;
  }
};

/**
 * Check for non-optimal vendor rates and create an AI alert if necessary
 * @param tasks Maintenance tasks to analyze
 * @param dateRange Current date range being analyzed
 * @returns An AIAlert object if an alert was created, null otherwise
 */
const checkNonOptimalVendorRates = async (
  tasks: MaintenanceTask[],
  dateRange: DateRange
): Promise<AIAlert | null> => {
  // Group tasks by task type and vendor
  const tasksByTypeAndVendor: Record<string, Record<string, { count: number; totalCost: number }>> = {};
  
  // Filter tasks by date range
  const filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.start_date);
    return isValid(taskDate) && isWithinInterval(taskDate, dateRange);
  });
  
  // Process each task
  filteredTasks.forEach(task => {
    if (!Array.isArray(task.service_groups) || task.service_groups.length === 0) {
      return;
    }
    
    // Process each service group
    task.service_groups.forEach(group => {
      if (!group.vendor_id || !Array.isArray(group.tasks) || group.tasks.length === 0) {
        return;
      }
      
      // Process each task in the service group
      group.tasks.forEach(taskId => {
        // Initialize task type if not exists
        if (!tasksByTypeAndVendor[taskId]) {
          tasksByTypeAndVendor[taskId] = {};
        }
        
        // Initialize vendor if not exists
        if (!tasksByTypeAndVendor[taskId][group.vendor_id]) {
          tasksByTypeAndVendor[taskId][group.vendor_id] = {
            count: 0,
            totalCost: 0
          };
        }
        
        // Update count and cost
        tasksByTypeAndVendor[taskId][group.vendor_id].count += 1;
        tasksByTypeAndVendor[taskId][group.vendor_id].totalCost += (typeof group.cost === 'number' ? group.cost : 0);
      });
    });
  });
  
  // Find task types with multiple vendors
  const taskTypesWithMultipleVendors = Object.entries(tasksByTypeAndVendor)
    .filter(([_, vendors]) => Object.keys(vendors).length > 1);
  
  // If no task types have multiple vendors, no comparison can be made
  if (taskTypesWithMultipleVendors.length === 0) {
    return null;
  }
  
  // Find vendors with significantly higher rates
  const nonOptimalVendors: Array<{
    taskType: string;
    vendorId: string;
    avgCost: number;
    bestVendorId: string;
    bestVendorAvgCost: number;
    percentageDifference: number;
  }> = [];
  
  taskTypesWithMultipleVendors.forEach(([taskType, vendors]) => {
    // Calculate average cost per vendor
    const vendorAvgCosts = Object.entries(vendors).map(([vendorId, data]) => ({
      vendorId,
      avgCost: data.totalCost / data.count
    }));
    
    // Sort by average cost (lowest first)
    vendorAvgCosts.sort((a, b) => a.avgCost - b.avgCost);
    
    // Get the best (lowest cost) vendor
    const bestVendor = vendorAvgCosts[0];
    
    // Check other vendors against the best vendor
    vendorAvgCosts.slice(1).forEach(vendor => {
      const percentageDifference = ((vendor.avgCost - bestVendor.avgCost) / bestVendor.avgCost) * 100;
      
      // If the vendor's rate is at least 20% higher than the best vendor
      if (percentageDifference >= 20) {
        nonOptimalVendors.push({
          taskType,
          vendorId: vendor.vendorId,
          avgCost: vendor.avgCost,
          bestVendorId: bestVendor.vendorId,
          bestVendorAvgCost: bestVendor.avgCost,
          percentageDifference
        });
      }
    });
  });
  
  // If no non-optimal vendors found, no alert needed
  if (nonOptimalVendors.length === 0) {
    return null;
  }
  
  // Sort by percentage difference (highest first)
  nonOptimalVendors.sort((a, b) => b.percentageDifference - a.percentageDifference);
  
  // Take the top 3 most significant differences
  const topDifferences = nonOptimalVendors.slice(0, 3);
  
  // Format date range for alert
  const startMonth = format(dateRange.start, 'MMMM yyyy');
  const endMonth = format(dateRange.end, 'MMMM yyyy');
  const periodKey = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
  
  // Check if an alert already exists for this period
  const { data: existingAlerts, error: checkError } = await supabase
    .from('ai_alerts')
    .select('*')
    .eq('alert_type', 'non_optimal_vendor_rates')
    .eq('metadata->>period', periodKey)
    .limit(1);
    
  if (checkError) {
    console.error('Error checking for existing vendor rate alerts:', checkError);
    return null;
  }
  
  // If an alert already exists for this period, don't create another one
  if (existingAlerts && existingAlerts.length > 0) {
    console.log(`Alert for non-optimal vendor rates already exists for period ${periodKey}`);
    return null;
  }
  
  // Determine severity based on highest percentage difference
  const severity = topDifferences[0].percentageDifference > 35 ? 'high' : 'medium';
  
  // Create alert data
  const alertData: Omit<AIAlert, 'id' | 'updated_at'> = {
    alert_type: 'non_optimal_vendor_rates',
    severity,
    status: 'pending',
    title: `Non-optimal vendor rates detected`,
    description: `Some vendors are charging significantly higher rates for the same maintenance tasks. The highest difference is ${topDifferences[0].percentageDifference.toFixed(1)}% more expensive.`,
    affected_entity: {
      type: 'maintenance',
      id: 'vendor_analysis'
    },
    metadata: {
      period: periodKey,
      non_optimal_vendors: topDifferences,
      recommendations: [
        'Review vendor pricing for similar services',
        'Consider negotiating rates with higher-cost vendors',
        'Consolidate maintenance work with more cost-effective vendors',
        'Request detailed breakdowns for higher-cost services'
      ]
    },
    created_at: new Date().toISOString()
  };
  
  try {
    // Insert the alert into Supabase
    const { data, error } = await supabase
      .from('ai_alerts')
      .insert(alertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating non-optimal vendor rates alert:', error);
      return null;
    }

    console.log('Created non-optimal vendor rates alert:', data);
    return data;
  } catch (error) {
    console.error('Exception creating non-optimal vendor rates alert:', error);
    return null;
  }
};

export const getMaintenanceMetricsWithComparison = async (
  currentDateRange: DateRange,
  tasksData?: MaintenanceTask[],
  vehiclesData?: Vehicle[]
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
    
    // If tasks and vehicles are provided, use them
    let tasks: MaintenanceTask[] = [];
    let vehicles: Vehicle[] = [];
    
    if (tasksData && vehiclesData) {
      tasks = tasksData;
      vehicles = vehiclesData;
    } else {
      // Otherwise fetch from Supabase
      // Fetch all maintenance tasks from both time periods
      const { data: fetchedTasks, error: tasksError } = await supabase
        .from('maintenance_tasks')
        .select('*, service_groups:maintenance_service_tasks(*)')
        .gte('start_date', previousStart.toISOString());
        
      if (tasksError) {
        console.error('Error fetching maintenance tasks:', tasksError);
        throw tasksError;
      }
      
      // Fetch all vehicles
      const { data: fetchedVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*');
        
      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
        throw vehiclesError;
      }
      
      tasks = fetchedTasks || [];
      vehicles = fetchedVehicles || [];
    }
    
    // Filter tasks for current period
    const currentTasks = Array.isArray(tasks) ? tasks.filter(task => {
      const taskDate = new Date(task.start_date);
      return isValid(taskDate) && isWithinInterval(taskDate, currentDateRange);
    }) : [];
    
    // Filter tasks for previous period
    const previousTasks = Array.isArray(tasks) ? tasks.filter(task => {
      const taskDate = new Date(task.start_date);
      return isValid(taskDate) && isWithinInterval(taskDate, previousDateRange);
    }) : [];
    
    // Calculate metrics for current period
    const currentMetrics = calculateMaintenanceMetrics(
      currentTasks,
      Array.isArray(vehicles) ? vehicles : [],
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
    
    // Check for rising costs and create alert if necessary
    if (Math.abs(percentChange) > 20) {
      await checkRisingCosts(currentMetrics.totalExpenditure, previousExpenditure, currentDateRange);
    }
    
    // Check for non-optimal vendor rates
    await checkNonOptimalVendorRates(tasks, currentDateRange);
    
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
  format: 'csv' | 'pdf' = 'csv',
  dateRange?: DateRange
) => {
  // Filter tasks by date range if provided
  const filteredTasks = dateRange 
    ? tasks.filter(task => {
        const taskDate = new Date(task.start_date);
        return isValid(taskDate) && isWithinInterval(taskDate, dateRange);
      })
    : tasks;
    
  console.log(`Exporting ${filteredTasks.length} maintenance tasks in ${format} format`);
  // Implementation details would depend on the specific libraries used
};

// Import MAINTENANCE_ITEMS and MAINTENANCE_GROUPS for task type distribution
import { MAINTENANCE_ITEMS, MAINTENANCE_GROUPS } from '../types/maintenance';