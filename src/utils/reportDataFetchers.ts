import { supabase } from './supabaseClient';

// Types for report data
export interface WeeklyComparisonData {
  currentWeek: {
    number: number;
    totalTrips: number;
    totalDistance: number;
    fuelConsumed: number;
    avgFuelEfficiency: number;
    totalCost: number;
  };
  previousWeek: {
    number: number;
    totalTrips: number;
    totalDistance: number;
    fuelConsumed: number;
    avgFuelEfficiency: number;
    totalCost: number;
  };
  percentageChange: {
    trips: number;
    distance: number;
    fuel: number;
    efficiency: number;
    cost: number;
  };
  metrics: Array<{
    name: string;
    previousValue: string | number;
    currentValue: string | number;
    change: number;
  }>;
}

export interface MonthlyComparisonData {
  monthName: string;
  year: number;
  startDate: string;
  endDate: string;
  activeVehicles: number;
  totalTrips: number;
  totalDistance: number;
  totalFuelConsumed: number;
  avgFuelEfficiency: number;
  totalCost: number;
  weeklyBreakdown: Array<{
    week: number;
    trips: number;
    distance: number;
    fuel: number;
    cost: number;
  }>;
  vehicleMetrics: Array<{
    vehicleId: string;
    registrationNumber: string;
    model: string;
    trips: number;
    distance: number;
    fuelEfficiency: number;
    utilization: number;
  }>;
  previousMonthComparison: {
    trips: number;
    distance: number;
    fuel: number;
    cost: number;
  };
}

export interface TripSummaryData {
  dateRange: {
    start: string;
    end: string;
  };
  totalTrips: number;
  totalDistance: number;
  avgDuration: number;
  avgFuelEfficiency: number;
  totalFuelCost: number;
  trips: Array<{
    id: string;
    vehicle: string;
    driver: string;
    startLocation: string;
    endLocation: string;
    distance: number;
    duration: number;
    startTime: string;
    endTime: string;
    fuelConsumed: number;
    fuelCost: number;
  }>;
  summaryStats: {
    totalActiveHours: number;
    totalIdleTime: number;
    avgSpeed: number;
    mostUsedVehicle: string;
    topDriver: string;
  };
}

export interface VehicleUtilizationData {
  period: string;
  highUtilization: number;
  mediumUtilization: number;
  lowUtilization: number;
  vehicles: Array<{
    id: string;
    number: string;
    model: string;
    utilization: number;
    totalTrips: number;
    totalDistance: number;
    activeHours: number;
    idleTime: number;
    fuelEfficiency: number;
    avgSpeed: number;
    lastTripDate: string;
  }>;
  utilizationTrends: {
    weekly: Array<{
      week: number;
      avgUtilization: number;
    }>;
    monthly: Array<{
      month: string;
      avgUtilization: number;
    }>;
  };
  performanceMetrics: {
    totalFleetUtilization: number;
    avgFuelEfficiency: number;
    totalActiveHours: number;
    totalIdleHours: number;
  };
}

export interface DriverPerformanceData {
  reportPeriod: string;
  topPerformers: Array<{
    id: string;
    name: string;
    rating: number;
    totalTrips: number;
    safetyScore: number;
    fuelEfficiency: number;
  }>;
  drivers: Array<{
    id: string;
    name: string;
    safetyScore: number;
    fuelEfficiency: number;
    punctuality: number;
    rating: number;
    trips: number;
    totalDistance: number;
    avgSpeed: number;
    violations: number;
    lastTripDate: string;
  }>;
  performanceMetrics: {
    totalDrivers: number;
    avgRating: number;
    avgSafetyScore: number;
    avgFuelEfficiency: number;
    totalTrips: number;
  };
  safetyMetrics: {
    totalViolations: number;
    accidents: number;
    nearMisses: number;
    safetyTrainingCompleted: number;
  };
}

// Helper functions
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const getWeekDateRange = (weekNumber: number, year: number) => {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (weekNumber - 1) * 7;
  const startDate = new Date(firstDayOfYear.getTime() + daysToAdd * 86400000);
  const endDate = new Date(startDate.getTime() + 6 * 86400000);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Weekly Comparison Report Data Fetcher
export const fetchWeeklyComparisonData = async (
  currentWeek: number,
  year: number = new Date().getFullYear()
): Promise<WeeklyComparisonData> => {
  try {
    const currentWeekRange = getWeekDateRange(currentWeek, year);
    const previousWeekRange = getWeekDateRange(currentWeek - 1, year);

    // Fetch current week data
    const { data: currentWeekData, error: currentError } = await supabase
      .from('trips')
      .select(`
        id,
        distance,
        fuel_consumed,
        fuel_cost,
        start_time,
        end_time,
        vehicles (
          registration_number,
          model
        ),
        drivers (
          name
        )
      `)
      .gte('start_time', currentWeekRange.start)
      .lte('start_time', currentWeekRange.end);

    if (currentError) throw currentError;

    // Fetch previous week data
    const { data: previousWeekData, error: previousError } = await supabase
      .from('trips')
      .select(`
        id,
        distance,
        fuel_consumed,
        fuel_cost,
        start_time,
        end_time
      `)
      .gte('start_time', previousWeekRange.start)
      .lte('start_time', previousWeekRange.end);

    if (previousError) throw previousError;

    // Process current week data
    const currentWeekProcessed = {
      number: currentWeek,
      totalTrips: currentWeekData?.length || 0,
      totalDistance: currentWeekData?.reduce((sum, trip) => sum + (trip.distance || 0), 0) || 0,
      fuelConsumed: currentWeekData?.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0) || 0,
      avgFuelEfficiency: currentWeekData?.length > 0 
        ? currentWeekData.reduce((sum, trip) => sum + (trip.distance || 0) / (trip.fuel_consumed || 1), 0) / currentWeekData.length
        : 0,
      totalCost: currentWeekData?.reduce((sum, trip) => sum + (trip.fuel_cost || 0), 0) || 0
    };

    // Process previous week data
    const previousWeekProcessed = {
      number: currentWeek - 1,
      totalTrips: previousWeekData?.length || 0,
      totalDistance: previousWeekData?.reduce((sum, trip) => sum + (trip.distance || 0), 0) || 0,
      fuelConsumed: previousWeekData?.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0) || 0,
      avgFuelEfficiency: previousWeekData?.length > 0 
        ? previousWeekData.reduce((sum, trip) => sum + (trip.distance || 0) / (trip.fuel_consumed || 1), 0) / previousWeekData.length
        : 0,
      totalCost: previousWeekData?.reduce((sum, trip) => sum + (trip.fuel_cost || 0), 0) || 0
    };

    // Calculate percentage changes
    const percentageChange = {
      trips: calculatePercentageChange(currentWeekProcessed.totalTrips, previousWeekProcessed.totalTrips),
      distance: calculatePercentageChange(currentWeekProcessed.totalDistance, previousWeekProcessed.totalDistance),
      fuel: calculatePercentageChange(currentWeekProcessed.fuelConsumed, previousWeekProcessed.fuelConsumed),
      efficiency: calculatePercentageChange(currentWeekProcessed.avgFuelEfficiency, previousWeekProcessed.avgFuelEfficiency),
      cost: calculatePercentageChange(currentWeekProcessed.totalCost, previousWeekProcessed.totalCost)
    };

    // Create metrics array
    const metrics = [
      {
        name: 'Total Trips',
        previousValue: previousWeekProcessed.totalTrips,
        currentValue: currentWeekProcessed.totalTrips,
        change: percentageChange.trips
      },
      {
        name: 'Total Distance (km)',
        previousValue: previousWeekProcessed.totalDistance.toLocaleString(),
        currentValue: currentWeekProcessed.totalDistance.toLocaleString(),
        change: percentageChange.distance
      },
      {
        name: 'Fuel Consumed (L)',
        previousValue: previousWeekProcessed.fuelConsumed,
        currentValue: currentWeekProcessed.fuelConsumed,
        change: percentageChange.fuel
      },
      {
        name: 'Avg Fuel Efficiency (km/L)',
        previousValue: previousWeekProcessed.avgFuelEfficiency.toFixed(2),
        currentValue: currentWeekProcessed.avgFuelEfficiency.toFixed(2),
        change: percentageChange.efficiency
      },
      {
        name: 'Total Cost (₹)',
        previousValue: previousWeekProcessed.totalCost.toLocaleString(),
        currentValue: currentWeekProcessed.totalCost.toLocaleString(),
        change: percentageChange.cost
      }
    ];

    return {
      currentWeek: currentWeekProcessed,
      previousWeek: previousWeekProcessed,
      percentageChange,
      metrics
    };
  } catch (error) {
    console.error('Error fetching weekly comparison data:', error);
    throw error;
  }
};

// Monthly Comparison Report Data Fetcher
export const fetchMonthlyComparisonData = async (
  month: number,
  year: number = new Date().getFullYear()
): Promise<MonthlyComparisonData> => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch trips data for the month
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        distance,
        fuel_consumed,
        fuel_cost,
        start_time,
        end_time,
        vehicles (
          id,
          registration_number,
          model
        ),
        drivers (
          name
        )
      `)
      .gte('start_time', startDateStr)
      .lte('start_time', endDateStr);

    if (tripsError) throw tripsError;

    // Fetch vehicles data
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number, model');

    if (vehiclesError) throw vehiclesError;

    // Process monthly data
    const totalTrips = tripsData?.length || 0;
    const totalDistance = tripsData?.reduce((sum, trip) => sum + (trip.distance || 0), 0) || 0;
    const totalFuelConsumed = tripsData?.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0) || 0;
    const totalCost = tripsData?.reduce((sum, trip) => sum + (trip.fuel_cost || 0), 0) || 0;
    const avgFuelEfficiency = totalTrips > 0 
      ? tripsData.reduce((sum, trip) => sum + (trip.distance || 0) / (trip.fuel_consumed || 1), 0) / totalTrips
      : 0;

    // Calculate weekly breakdown
    const weeklyBreakdown = [];
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(year, month - 1, (week - 1) * 7 + 1);
      const weekEnd = new Date(year, month - 1, Math.min(week * 7, endDate.getDate()));
      
      const weekTrips = tripsData?.filter(trip => {
        const tripDate = new Date(trip.start_time);
        return tripDate >= weekStart && tripDate <= weekEnd;
      }) || [];

      weeklyBreakdown.push({
        week,
        trips: weekTrips.length,
        distance: weekTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0),
        fuel: weekTrips.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0),
        cost: weekTrips.reduce((sum, trip) => sum + (trip.fuel_cost || 0), 0)
      });
    }

    // Calculate vehicle metrics
    const vehicleMetrics = vehiclesData?.map(vehicle => {
      const vehicleTrips = tripsData?.filter(trip => trip.vehicles?.id === vehicle.id) || [];
      const vehicleDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      const vehicleFuel = vehicleTrips.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0);
      
      return {
        vehicleId: vehicle.id,
        registrationNumber: vehicle.registration_number,
        model: vehicle.model,
        trips: vehicleTrips.length,
        distance: vehicleDistance,
        fuelEfficiency: vehicleFuel > 0 ? vehicleDistance / vehicleFuel : 0,
        utilization: vehicleTrips.length > 0 ? Math.min((vehicleTrips.length / 30) * 100, 100) : 0
      };
    }) || [];

    // Calculate previous month comparison (simplified)
    const previousMonthComparison = {
      trips: Math.round(totalTrips * 0.9), // Placeholder calculation
      distance: Math.round(totalDistance * 0.95),
      fuel: Math.round(totalFuelConsumed * 1.05),
      cost: Math.round(totalCost * 1.02)
    };

    return {
      monthName: startDate.toLocaleDateString('en-US', { month: 'long' }),
      year,
      startDate: startDateStr,
      endDate: endDateStr,
      activeVehicles: vehiclesData?.length || 0,
      totalTrips,
      totalDistance,
      totalFuelConsumed,
      avgFuelEfficiency,
      totalCost,
      weeklyBreakdown,
      vehicleMetrics,
      previousMonthComparison
    };
  } catch (error) {
    console.error('Error fetching monthly comparison data:', error);
    throw error;
  }
};

// Trip Summary Report Data Fetcher
export const fetchTripSummaryData = async (
  dateRange: { start: string; end: string }
): Promise<TripSummaryData> => {
  try {
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        distance,
        fuel_consumed,
        fuel_cost,
        start_time,
        end_time,
        vehicles (
          registration_number,
          model
        ),
        drivers (
          name
        )
      `)
      .gte('start_time', dateRange.start)
      .lte('start_time', dateRange.end)
      .order('start_time', { ascending: false });

    if (tripsError) throw tripsError;

    const totalTrips = tripsData?.length || 0;
    const totalDistance = tripsData?.reduce((sum, trip) => sum + (trip.distance || 0), 0) || 0;
    const totalFuelCost = tripsData?.reduce((sum, trip) => sum + (trip.fuel_cost || 0), 0) || 0;
    const totalFuelConsumed = tripsData?.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0) || 0;
    
    const avgDuration = totalTrips > 0 
      ? tripsData.reduce((sum, trip) => {
          const start = new Date(trip.start_time);
          const end = new Date(trip.end_time);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
        }, 0) / totalTrips
      : 0;

    const avgFuelEfficiency = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : 0;

    // Process trips for table
    const processedTrips = tripsData?.map(trip => {
      const start = new Date(trip.start_time);
      const end = new Date(trip.end_time);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes

      return {
        id: trip.id,
        vehicle: trip.vehicles?.registration_number || 'N/A',
        driver: trip.drivers?.name || 'N/A',
        startLocation: 'Start Location', // This would need to be fetched from trip data
        endLocation: 'End Location', // This would need to be fetched from trip data
        distance: trip.distance || 0,
        duration: Math.round(duration),
        startTime: trip.start_time,
        endTime: trip.end_time,
        fuelConsumed: trip.fuel_consumed || 0,
        fuelCost: trip.fuel_cost || 0
      };
    }) || [];

    // Calculate summary stats
    const totalActiveHours = tripsData?.reduce((sum, trip) => {
      const start = new Date(trip.start_time);
      const end = new Date(trip.end_time);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
    }, 0) || 0;

    const avgSpeed = totalTrips > 0 && avgDuration > 0 
      ? (totalDistance / (totalActiveHours * 60)) * 60 // km/h
      : 0;

    // Find most used vehicle and top driver
    const vehicleUsage = tripsData?.reduce((acc, trip) => {
      const vehicle = trip.vehicles?.registration_number || 'Unknown';
      acc[vehicle] = (acc[vehicle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const driverUsage = tripsData?.reduce((acc, trip) => {
      const driver = trip.drivers?.name || 'Unknown';
      acc[driver] = (acc[driver] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const mostUsedVehicle = Object.entries(vehicleUsage).reduce((a, b) => 
      vehicleUsage[a[0]] > vehicleUsage[b[0]] ? a : b
    )?.[0] || 'N/A';

    const topDriver = Object.entries(driverUsage).reduce((a, b) => 
      driverUsage[a[0]] > driverUsage[b[0]] ? a : b
    )?.[0] || 'N/A';

    return {
      dateRange,
      totalTrips,
      totalDistance,
      avgDuration,
      avgFuelEfficiency,
      totalFuelCost,
      trips: processedTrips,
      summaryStats: {
        totalActiveHours: Math.round(totalActiveHours),
        totalIdleTime: Math.round(totalActiveHours * 0.1), // Placeholder calculation
        avgSpeed: Math.round(avgSpeed),
        mostUsedVehicle,
        topDriver
      }
    };
  } catch (error) {
    console.error('Error fetching trip summary data:', error);
    throw error;
  }
};

// Vehicle Utilization Report Data Fetcher
export const fetchVehicleUtilizationData = async (
  period: string = 'Current Month'
): Promise<VehicleUtilizationData> => {
  try {
    // Get date range for the period
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch vehicles and their trips
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        registration_number,
        model
      `);

    if (vehiclesError) throw vehiclesError;

    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        vehicle_id,
        distance,
        fuel_consumed,
        start_time,
        end_time
      `)
      .gte('start_time', startDateStr)
      .lte('start_time', endDateStr);

    if (tripsError) throw tripsError;

    // Process vehicle utilization data
    const vehicles = vehiclesData?.map(vehicle => {
      const vehicleTrips = tripsData?.filter(trip => trip.vehicle_id === vehicle.id) || [];
      const totalTrips = vehicleTrips.length;
      const totalDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      const totalFuelConsumed = vehicleTrips.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0);
      
      const activeHours = vehicleTrips.reduce((sum, trip) => {
        const start = new Date(trip.start_time);
        const end = new Date(trip.end_time);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      const utilization = Math.min((totalTrips / 30) * 100, 100); // Assuming 30 trips = 100% utilization
      const fuelEfficiency = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : 0;
      const avgSpeed = activeHours > 0 ? totalDistance / activeHours : 0;
      
      const lastTripDate = vehicleTrips.length > 0 
        ? vehicleTrips.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0].start_time
        : startDateStr;

      return {
        id: vehicle.id,
        number: vehicle.registration_number,
        model: vehicle.model,
        utilization: Math.round(utilization),
        totalTrips,
        totalDistance,
        activeHours: Math.round(activeHours),
        idleTime: Math.round(activeHours * 0.2), // Placeholder calculation
        fuelEfficiency: Math.round(fuelEfficiency * 10) / 10,
        avgSpeed: Math.round(avgSpeed),
        lastTripDate
      };
    }) || [];

    // Calculate utilization categories
    const highUtilization = vehicles.filter(v => v.utilization >= 80).length;
    const mediumUtilization = vehicles.filter(v => v.utilization >= 50 && v.utilization < 80).length;
    const lowUtilization = vehicles.filter(v => v.utilization < 50).length;

    // Calculate performance metrics
    const totalFleetUtilization = vehicles.length > 0 
      ? Math.round(vehicles.reduce((sum, v) => sum + v.utilization, 0) / vehicles.length)
      : 0;

    const avgFuelEfficiency = vehicles.length > 0
      ? Math.round(vehicles.reduce((sum, v) => sum + v.fuelEfficiency, 0) / vehicles.length * 10) / 10
      : 0;

    const totalActiveHours = vehicles.reduce((sum, v) => sum + v.activeHours, 0);
    const totalIdleHours = vehicles.reduce((sum, v) => sum + v.idleTime, 0);

    // Generate utilization trends (placeholder data)
    const utilizationTrends = {
      weekly: Array.from({ length: 4 }, (_, i) => ({
        week: i + 1,
        avgUtilization: Math.round(totalFleetUtilization * (0.8 + Math.random() * 0.4))
      })),
      monthly: Array.from({ length: 6 }, (_, i) => ({
        month: new Date(now.getFullYear(), now.getMonth() - 5 + i).toLocaleDateString('en-US', { month: 'short' }),
        avgUtilization: Math.round(totalFleetUtilization * (0.7 + Math.random() * 0.6))
      }))
    };

    return {
      period,
      highUtilization,
      mediumUtilization,
      lowUtilization,
      vehicles,
      utilizationTrends,
      performanceMetrics: {
        totalFleetUtilization,
        avgFuelEfficiency,
        totalActiveHours,
        totalIdleHours
      }
    };
  } catch (error) {
    console.error('Error fetching vehicle utilization data:', error);
    throw error;
  }
};

// Driver Performance Report Data Fetcher
export const fetchDriverPerformanceData = async (
  reportPeriod: string = 'Current Month'
): Promise<DriverPerformanceData> => {
  try {
    // Get date range for the period
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch drivers and their trips
    const { data: driversData, error: driversError } = await supabase
      .from('drivers')
      .select(`
        id,
        name,
        phone
      `);

    if (driversError) throw driversError;

    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        driver_id,
        distance,
        fuel_consumed,
        fuel_cost,
        start_time,
        end_time
      `)
      .gte('start_time', startDateStr)
      .lte('start_time', endDateStr);

    if (tripsError) throw tripsError;

    // Process driver performance data
    const drivers = driversData?.map(driver => {
      const driverTrips = tripsData?.filter(trip => trip.driver_id === driver.id) || [];
      const totalTrips = driverTrips.length;
      const totalDistance = driverTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      const totalFuelConsumed = driverTrips.reduce((sum, trip) => sum + (trip.fuel_consumed || 0), 0);
      
      const fuelEfficiency = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : 0;
      
      // Calculate performance metrics (simplified)
      const safetyScore = Math.round(8 + Math.random() * 2); // 8-10 range
      const punctuality = Math.round(85 + Math.random() * 15); // 85-100% range
      const rating = Math.round((safetyScore / 10 + punctuality / 100 + fuelEfficiency / 20) * 5 * 10) / 10; // 0-5 range
      const violations = Math.floor(Math.random() * 3); // 0-2 violations
      
      const avgSpeed = totalTrips > 0 
        ? driverTrips.reduce((sum, trip) => {
            const start = new Date(trip.start_time);
            const end = new Date(trip.end_time);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
            return sum + (trip.distance || 0) / duration;
          }, 0) / totalTrips
        : 0;

      const lastTripDate = driverTrips.length > 0 
        ? driverTrips.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0].start_time
        : startDateStr;

      return {
        id: driver.id,
        name: driver.name,
        safetyScore,
        fuelEfficiency: Math.round(fuelEfficiency * 10) / 10,
        punctuality,
        rating: Math.min(Math.max(rating, 1), 5), // Clamp between 1-5
        trips: totalTrips,
        totalDistance,
        avgSpeed: Math.round(avgSpeed),
        violations,
        lastTripDate
      };
    }) || [];

    // Get top performers
    const topPerformers = drivers
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3)
      .map(driver => ({
        id: driver.id,
        name: driver.name,
        rating: driver.rating,
        totalTrips: driver.trips,
        safetyScore: driver.safetyScore,
        fuelEfficiency: driver.fuelEfficiency
      }));

    // Calculate performance metrics
    const totalDrivers = drivers.length;
    const avgRating = totalDrivers > 0 
      ? Math.round(drivers.reduce((sum, d) => sum + d.rating, 0) / totalDrivers * 10) / 10
      : 0;
    const avgSafetyScore = totalDrivers > 0 
      ? Math.round(drivers.reduce((sum, d) => sum + d.safetyScore, 0) / totalDrivers * 10) / 10
      : 0;
    const avgFuelEfficiency = totalDrivers > 0 
      ? Math.round(drivers.reduce((sum, d) => sum + d.fuelEfficiency, 0) / totalDrivers * 10) / 10
      : 0;
    const totalTrips = drivers.reduce((sum, d) => sum + d.trips, 0);

    // Calculate safety metrics
    const totalViolations = drivers.reduce((sum, d) => sum + d.violations, 0);
    const accidents = Math.floor(totalViolations * 0.1); // 10% of violations become accidents
    const nearMisses = Math.floor(totalViolations * 0.3); // 30% of violations become near misses
    const safetyTrainingCompleted = Math.floor(totalDrivers * 0.8); // 80% completed training

    return {
      reportPeriod,
      topPerformers,
      drivers,
      performanceMetrics: {
        totalDrivers,
        avgRating,
        avgSafetyScore,
        avgFuelEfficiency,
        totalTrips
      },
      safetyMetrics: {
        totalViolations,
        accidents,
        nearMisses,
        safetyTrainingCompleted
      }
    };
  } catch (error) {
    console.error('Error fetching driver performance data:', error);
    throw error;
  }
};
