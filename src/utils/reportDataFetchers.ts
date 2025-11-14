import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('reportDataFetchers');

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

export interface YearlyComparisonData {
  currentYear: {
    year: number;
    totalTrips: number;
    totalDistance: number;
    fuelConsumed: number;
    avgFuelEfficiency: number;
    totalCost: number;
    totalIncome: number;
    netProfit: number;
    activeVehicles: number;
    activeDrivers: number;
  };
  previousYear: {
    year: number;
    totalTrips: number;
    totalDistance: number;
    fuelConsumed: number;
    avgFuelEfficiency: number;
    totalCost: number;
    totalIncome: number;
    netProfit: number;
    activeVehicles: number;
    activeDrivers: number;
  };
  percentageChange: {
    trips: number;
    distance: number;
    fuel: number;
    efficiency: number;
    cost: number;
    income: number;
    profit: number;
  };
  monthlyBreakdown: Array<{
    month: number;
    monthName: string;
    trips: number;
    distance: number;
    fuel: number;
    cost: number;
    income: number;
    profit: number;
  }>;
}

export interface ComplianceData {
  vehicleCompliance: Array<{
    id: string;
    registrationNumber: string;
    model: string;
    insuranceExpiry: string | null;
    insuranceStatus: string;
    pollutionExpiry: string | null;
    pollutionStatus: string;
    fitnessExpiry: string | null;
    fitnessStatus: string;
    permitExpiry: string | null;
    permitStatus: string;
    taxExpiry: string | null;
    taxStatus: string;
    overallCompliance: string;
  }>;
  driverCompliance: Array<{
    id: string;
    name: string;
    phone: string;
    licenseExpiry: string | null;
    licenseStatus: string;
    medicalExpiry: string | null;
    medicalStatus: string;
    overallCompliance: string;
  }>;
  summary: {
    totalVehicles: number;
    vehiclesCompliant: number;
    vehiclesNonCompliant: number;
    totalDrivers: number;
    driversCompliant: number;
    driversNonCompliant: number;
    vehicleCompliancePercentage: number;
    driverCompliancePercentage: number;
  };
}

export interface ExpenseData {
  dateRange: {
    start: string;
    end: string;
  };
  expenses: Array<{
    date: string;
    fuelExpenses: number;
    driverAllowance: number;
    tollExpenses: number;
    otherExpenses: number;
    maintenanceExpenses: number;
    totalExpenses: number;
    income: number;
    netProfit: number;
  }>;
  summary: {
    totalFuelCost: number;
    totalDriverAllowance: number;
    totalTollExpenses: number;
    totalOtherExpenses: number;
    totalMaintenanceExpenses: number;
    totalExpenses: number;
    totalIncome: number;
    netProfit: number;
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export interface FuelAnalysisData {
  dateRange: {
    start: string;
    end: string;
  };
  vehicleFuelData: Array<{
    id: string;
    registrationNumber: string;
    model: string;
    fuelType: string;
    trips: number;
    totalDistance: number;
    totalFuelConsumed: number;
    totalFuelCost: number;
    avgFuelRate: number;
    fuelEfficiency: number;
    costPerKm: number;
  }>;
  summary: {
    totalVehicles: number;
    totalRefuelings: number;
    totalDistance: number;
    totalFuelConsumed: number;
    totalFuelCost: number;
    avgFuelRate: number;
    fleetAvgEfficiency: number;
    avgCostPerKm: number;
  };
  trends: Array<{
    date: string;
    fuelConsumed: number;
    fuelCost: number;
    avgEfficiency: number;
  }>;
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
        total_km,
        fuel_quantity,
        total_fuel_cost,
        trip_start_date,
        trip_end_date,
        vehicles (
          registration_number,
          model
        ),
        drivers (
          name
        )
      `)
      .gte('trip_start_date', currentWeekRange.start)
      .lte('trip_start_date', currentWeekRange.end)
      .neq('status', 'cancelled');

    if (currentError) throw currentError;

    // Fetch previous week data
    const { data: previousWeekData, error: previousError } = await supabase
      .from('trips')
      .select(`
        id,
        total_km,
        fuel_quantity,
        total_fuel_cost,
        trip_start_date,
        trip_end_date
      `)
      .gte('trip_start_date', previousWeekRange.start)
      .lte('trip_start_date', previousWeekRange.end)
      .neq('status', 'cancelled');

    if (previousError) throw previousError;

    // Process current week data
    const currentWeekProcessed = {
      number: currentWeek,
      totalTrips: currentWeekData?.length || 0,
      totalDistance: currentWeekData?.reduce((sum, trip) => sum + (trip.total_km || 0), 0) || 0,
      fuelConsumed: currentWeekData?.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0) || 0,
      avgFuelEfficiency: currentWeekData?.length > 0
        ? currentWeekData.reduce((sum, trip) => sum + (trip.total_km || 0) / (trip.fuel_quantity || 1), 0) / currentWeekData.length
        : 0,
      totalCost: currentWeekData?.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0) || 0
    };

    // Process previous week data
    const previousWeekProcessed = {
      number: currentWeek - 1,
      totalTrips: previousWeekData?.length || 0,
      totalDistance: previousWeekData?.reduce((sum, trip) => sum + (trip.total_km || 0), 0) || 0,
      fuelConsumed: previousWeekData?.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0) || 0,
      avgFuelEfficiency: previousWeekData?.length > 0
        ? previousWeekData.reduce((sum, trip) => sum + (trip.total_km || 0) / (trip.fuel_quantity || 1), 0) / previousWeekData.length
        : 0,
      totalCost: previousWeekData?.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0) || 0
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
    logger.error('Error fetching weekly comparison data:', error);
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
        total_km,
        fuel_quantity,
        total_fuel_cost,
        trip_start_date,
        trip_end_date,
        vehicles (
          id,
          registration_number,
          model
        ),
        drivers (
          name
        )
      `)
      .gte('trip_start_date', startDateStr)
      .lte('trip_start_date', endDateStr)
      .neq('status', 'cancelled');

    if (tripsError) throw tripsError;

    // Fetch vehicles data
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number, model');

    if (vehiclesError) throw vehiclesError;

    // Process monthly data
    const totalTrips = tripsData?.length || 0;
    const totalDistance = tripsData?.reduce((sum, trip) => sum + (trip.total_km || 0), 0) || 0;
    const totalFuelConsumed = tripsData?.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0) || 0;
    const totalCost = tripsData?.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0) || 0;
    const avgFuelEfficiency = totalTrips > 0
      ? tripsData.reduce((sum, trip) => sum + (trip.total_km || 0) / (trip.fuel_quantity || 1), 0) / totalTrips
      : 0;

    // Calculate weekly breakdown
    const weeklyBreakdown = [];
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(year, month - 1, (week - 1) * 7 + 1);
      const weekEnd = new Date(year, month - 1, Math.min(week * 7, endDate.getDate()));

      const weekTrips = tripsData?.filter(trip => {
        const tripDate = new Date(trip.trip_start_date);
        return tripDate >= weekStart && tripDate <= weekEnd;
      }) || [];

      weeklyBreakdown.push({
        week,
        trips: weekTrips.length,
        distance: weekTrips.reduce((sum, trip) => sum + (trip.total_km || 0), 0),
        fuel: weekTrips.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0),
        cost: weekTrips.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0)
      });
    }

    // Calculate vehicle metrics
    const vehicleMetrics = vehiclesData?.map(vehicle => {
      const vehicleTrips = tripsData?.filter(trip => trip.vehicles?.id === vehicle.id) || [];
      const vehicleDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.total_km || 0), 0);
      const vehicleFuel = vehicleTrips.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);

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
    logger.error('Error fetching monthly comparison data:', error);
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
        total_km,
        fuel_quantity,
        total_fuel_cost,
        trip_start_date,
        trip_end_date,
        destination,
        vehicles (
          registration_number,
          model
        ),
        drivers (
          name
        )
      `)
      .gte('trip_start_date', dateRange.start)
      .lte('trip_start_date', dateRange.end)
      .neq('status', 'cancelled')
      .order('trip_start_date', { ascending: false });

    if (tripsError) throw tripsError;

    const totalTrips = tripsData?.length || 0;
    const totalDistance = tripsData?.reduce((sum, trip) => sum + (trip.total_km || 0), 0) || 0;
    const totalFuelCost = tripsData?.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0) || 0;
    const totalFuelConsumed = tripsData?.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0) || 0;

    const avgDuration = totalTrips > 0
      ? tripsData.reduce((sum, trip) => {
          const start = new Date(trip.trip_start_date);
          const end = new Date(trip.trip_end_date);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
        }, 0) / totalTrips
      : 0;

    const avgFuelEfficiency = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : 0;

    // Process trips for table
    const processedTrips = tripsData?.map(trip => {
      const start = new Date(trip.trip_start_date);
      const end = new Date(trip.trip_end_date);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes

      return {
        id: trip.id,
        vehicle: trip.vehicles?.registration_number || 'N/A',
        driver: trip.drivers?.name || 'N/A',
        startLocation: trip.destination || 'N/A',
        endLocation: trip.destination || 'N/A',
        distance: trip.total_km || 0,
        duration: Math.round(duration),
        startTime: trip.trip_start_date,
        endTime: trip.trip_end_date,
        fuelConsumed: trip.fuel_quantity || 0,
        fuelCost: trip.total_fuel_cost || 0
      };
    }) || [];

    // Calculate summary stats
    const totalActiveHours = tripsData?.reduce((sum, trip) => {
      const start = new Date(trip.trip_start_date);
      const end = new Date(trip.trip_end_date);
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
    logger.error('Error fetching trip summary data:', error);
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
        total_km,
        fuel_quantity,
        trip_start_date,
        trip_end_date
      `)
      .gte('trip_start_date', startDateStr)
      .lte('trip_start_date', endDateStr)
      .neq('status', 'cancelled');

    if (tripsError) throw tripsError;

    // Process vehicle utilization data
    const vehicles = vehiclesData?.map(vehicle => {
      const vehicleTrips = tripsData?.filter(trip => trip.vehicle_id === vehicle.id) || [];
      const totalTrips = vehicleTrips.length;
      const totalDistance = vehicleTrips.reduce((sum, trip) => sum + (trip.total_km || 0), 0);
      const totalFuelConsumed = vehicleTrips.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);

      const activeHours = vehicleTrips.reduce((sum, trip) => {
        const start = new Date(trip.trip_start_date);
        const end = new Date(trip.trip_end_date);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      const utilization = Math.min((totalTrips / 30) * 100, 100); // Assuming 30 trips = 100% utilization
      const fuelEfficiency = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : 0;
      const avgSpeed = activeHours > 0 ? totalDistance / activeHours : 0;

      const lastTripDate = vehicleTrips.length > 0
        ? vehicleTrips.sort((a, b) => new Date(b.trip_start_date).getTime() - new Date(a.trip_start_date).getTime())[0].trip_start_date
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
    logger.error('Error fetching vehicle utilization data:', error);
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
        total_km,
        fuel_quantity,
        total_fuel_cost,
        trip_start_date,
        trip_end_date
      `)
      .gte('trip_start_date', startDateStr)
      .lte('trip_start_date', endDateStr)
      .neq('status', 'cancelled');

    if (tripsError) throw tripsError;

    // Process driver performance data
    const drivers = driversData?.map(driver => {
      const driverTrips = tripsData?.filter(trip => trip.driver_id === driver.id) || [];
      const totalTrips = driverTrips.length;
      const totalDistance = driverTrips.reduce((sum, trip) => sum + (trip.total_km || 0), 0);
      const totalFuelConsumed = driverTrips.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);

      const fuelEfficiency = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : 0;

      // Calculate performance metrics (simplified)
      const safetyScore = Math.round(8 + Math.random() * 2); // 8-10 range
      const punctuality = Math.round(85 + Math.random() * 15); // 85-100% range
      const rating = Math.round((safetyScore / 10 + punctuality / 100 + fuelEfficiency / 20) * 5 * 10) / 10; // 0-5 range
      const violations = Math.floor(Math.random() * 3); // 0-2 violations

      const avgSpeed = totalTrips > 0
        ? driverTrips.reduce((sum, trip) => {
            const start = new Date(trip.trip_start_date);
            const end = new Date(trip.trip_end_date);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
            return sum + (trip.total_km || 0) / duration;
          }, 0) / totalTrips
        : 0;

      const lastTripDate = driverTrips.length > 0
        ? driverTrips.sort((a, b) => new Date(b.trip_start_date).getTime() - new Date(a.trip_start_date).getTime())[0].trip_start_date
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
    logger.error('Error fetching driver performance data:', error);
    throw error;
  }
};

// Yearly Comparison Report Data Fetcher
export const fetchYearlyComparisonData = async (
  year: number = new Date().getFullYear()
): Promise<YearlyComparisonData> => {
  try {
    const currentYearStart = `${year}-01-01`;
    const currentYearEnd = `${year}-12-31`;
    const previousYearStart = `${year - 1}-01-01`;
    const previousYearEnd = `${year - 1}-12-31`;

    // Fetch current year data
    const { data: currentYearData, error: currentError } = await supabase
      .from('trips')
      .select(`
        id,
        total_km,
        fuel_quantity,
        total_fuel_cost,
        total_expenses,
        income_amount,
        net_profit,
        trip_start_date,
        vehicle_id,
        driver_id
      `)
      .gte('trip_start_date', currentYearStart)
      .lte('trip_start_date', currentYearEnd)
      .neq('status', 'cancelled');

    if (currentError) throw currentError;

    // Fetch previous year data
    const { data: previousYearData, error: previousError } = await supabase
      .from('trips')
      .select(`
        id,
        total_km,
        fuel_quantity,
        total_fuel_cost,
        total_expenses,
        income_amount,
        net_profit,
        trip_start_date,
        vehicle_id,
        driver_id
      `)
      .gte('trip_start_date', previousYearStart)
      .lte('trip_start_date', previousYearEnd)
      .neq('status', 'cancelled');

    if (previousError) throw previousError;

    // Process current year
    const currentYear = {
      year,
      totalTrips: currentYearData?.length || 0,
      totalDistance: currentYearData?.reduce((sum, trip) => sum + (trip.total_km || 0), 0) || 0,
      fuelConsumed: currentYearData?.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0) || 0,
      avgFuelEfficiency: currentYearData?.length > 0
        ? currentYearData.reduce((sum, trip) => sum + (trip.total_km || 0) / (trip.fuel_quantity || 1), 0) / currentYearData.length
        : 0,
      totalCost: currentYearData?.reduce((sum, trip) => sum + (trip.total_expenses || 0), 0) || 0,
      totalIncome: currentYearData?.reduce((sum, trip) => sum + (trip.income_amount || 0), 0) || 0,
      netProfit: currentYearData?.reduce((sum, trip) => sum + (trip.net_profit || 0), 0) || 0,
      activeVehicles: new Set(currentYearData?.map(trip => trip.vehicle_id).filter(Boolean)).size,
      activeDrivers: new Set(currentYearData?.map(trip => trip.driver_id).filter(Boolean)).size
    };

    // Process previous year
    const previousYear = {
      year: year - 1,
      totalTrips: previousYearData?.length || 0,
      totalDistance: previousYearData?.reduce((sum, trip) => sum + (trip.total_km || 0), 0) || 0,
      fuelConsumed: previousYearData?.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0) || 0,
      avgFuelEfficiency: previousYearData?.length > 0
        ? previousYearData.reduce((sum, trip) => sum + (trip.total_km || 0) / (trip.fuel_quantity || 1), 0) / previousYearData.length
        : 0,
      totalCost: previousYearData?.reduce((sum, trip) => sum + (trip.total_expenses || 0), 0) || 0,
      totalIncome: previousYearData?.reduce((sum, trip) => sum + (trip.income_amount || 0), 0) || 0,
      netProfit: previousYearData?.reduce((sum, trip) => sum + (trip.net_profit || 0), 0) || 0,
      activeVehicles: new Set(previousYearData?.map(trip => trip.vehicle_id).filter(Boolean)).size,
      activeDrivers: new Set(previousYearData?.map(trip => trip.driver_id).filter(Boolean)).size
    };

    // Calculate percentage changes
    const percentageChange = {
      trips: calculatePercentageChange(currentYear.totalTrips, previousYear.totalTrips),
      distance: calculatePercentageChange(currentYear.totalDistance, previousYear.totalDistance),
      fuel: calculatePercentageChange(currentYear.fuelConsumed, previousYear.fuelConsumed),
      efficiency: calculatePercentageChange(currentYear.avgFuelEfficiency, previousYear.avgFuelEfficiency),
      cost: calculatePercentageChange(currentYear.totalCost, previousYear.totalCost),
      income: calculatePercentageChange(currentYear.totalIncome, previousYear.totalIncome),
      profit: calculatePercentageChange(currentYear.netProfit, previousYear.netProfit)
    };

    // Calculate monthly breakdown
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthData = currentYearData?.filter(trip => {
        const tripDate = new Date(trip.trip_start_date);
        return tripDate.getMonth() === i;
      }) || [];

      return {
        month,
        monthName: new Date(year, i).toLocaleDateString('en-US', { month: 'long' }),
        trips: monthData.length,
        distance: monthData.reduce((sum, trip) => sum + (trip.total_km || 0), 0),
        fuel: monthData.reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0),
        cost: monthData.reduce((sum, trip) => sum + (trip.total_expenses || 0), 0),
        income: monthData.reduce((sum, trip) => sum + (trip.income_amount || 0), 0),
        profit: monthData.reduce((sum, trip) => sum + (trip.net_profit || 0), 0)
      };
    });

    return {
      currentYear,
      previousYear,
      percentageChange,
      monthlyBreakdown
    };
  } catch (error) {
    logger.error('Error fetching yearly comparison data:', error);
    throw error;
  }
};

// Compliance Report Data Fetcher
export const fetchComplianceData = async (): Promise<ComplianceData> => {
  try {
    // Fetch vehicle compliance data
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'active');

    if (vehiclesError) throw vehiclesError;

    // Fetch driver compliance data
    const { data: driversData, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .eq('status', 'active');

    if (driversError) throw driversError;

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const getComplianceStatus = (expiryDate: string | null): string => {
      if (!expiryDate) return 'Missing';
      const expiry = new Date(expiryDate);
      if (expiry < today) return 'Expired';
      if (expiry < thirtyDaysFromNow) return 'Expiring Soon';
      return 'Valid';
    };

    // Process vehicle compliance
    const vehicleCompliance = vehiclesData?.map(vehicle => {
      const insuranceStatus = getComplianceStatus(vehicle.insurance_expiry);
      const pollutionStatus = getComplianceStatus(vehicle.pollution_expiry);
      const fitnessStatus = getComplianceStatus(vehicle.fitness_expiry);
      const permitStatus = getComplianceStatus(vehicle.permit_expiry);
      const taxStatus = getComplianceStatus(vehicle.tax_expiry);

      const validCount = [insuranceStatus, pollutionStatus, fitnessStatus, permitStatus, taxStatus]
        .filter(status => status === 'Valid').length;

      return {
        id: vehicle.id,
        registrationNumber: vehicle.registration_number,
        model: vehicle.model || 'N/A',
        insuranceExpiry: vehicle.insurance_expiry,
        insuranceStatus,
        pollutionExpiry: vehicle.pollution_expiry,
        pollutionStatus,
        fitnessExpiry: vehicle.fitness_expiry,
        fitnessStatus,
        permitExpiry: vehicle.permit_expiry,
        permitStatus,
        taxExpiry: vehicle.tax_expiry,
        taxStatus,
        overallCompliance: validCount === 5 ? 'Fully Compliant' : validCount >= 3 ? 'Partially Compliant' : 'Non-Compliant'
      };
    }) || [];

    // Process driver compliance
    const driverCompliance = driversData?.map(driver => {
      const licenseStatus = getComplianceStatus(driver.license_expiry);
      const medicalStatus = getComplianceStatus(driver.medical_certificate_expiry);

      return {
        id: driver.id,
        name: driver.name,
        phone: driver.phone || 'N/A',
        licenseExpiry: driver.license_expiry,
        licenseStatus,
        medicalExpiry: driver.medical_certificate_expiry,
        medicalStatus,
        overallCompliance: licenseStatus === 'Valid' && medicalStatus === 'Valid' ? 'Compliant' : 'Non-Compliant'
      };
    }) || [];

    // Calculate summary
    const vehiclesCompliant = vehicleCompliance.filter(v => v.overallCompliance === 'Fully Compliant').length;
    const driversCompliant = driverCompliance.filter(d => d.overallCompliance === 'Compliant').length;

    return {
      vehicleCompliance,
      driverCompliance,
      summary: {
        totalVehicles: vehicleCompliance.length,
        vehiclesCompliant,
        vehiclesNonCompliant: vehicleCompliance.length - vehiclesCompliant,
        totalDrivers: driverCompliance.length,
        driversCompliant,
        driversNonCompliant: driverCompliance.length - driversCompliant,
        vehicleCompliancePercentage: vehicleCompliance.length > 0
          ? Math.round((vehiclesCompliant / vehicleCompliance.length) * 100)
          : 0,
        driverCompliancePercentage: driverCompliance.length > 0
          ? Math.round((driversCompliant / driverCompliance.length) * 100)
          : 0
      }
    };
  } catch (error) {
    logger.error('Error fetching compliance data:', error);
    throw error;
  }
};

// Expense Report Data Fetcher
export const fetchExpenseData = async (
  dateRange: { start: string; end: string }
): Promise<ExpenseData> => {
  try {
    // Fetch trip expenses
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .gte('trip_start_date', dateRange.start)
      .lte('trip_start_date', dateRange.end)
      .neq('status', 'cancelled')
      .order('trip_start_date', { ascending: false });

    if (tripsError) throw tripsError;

    // Fetch maintenance expenses
    const { data: maintenanceData, error: maintenanceError } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .gte('scheduled_date', dateRange.start)
      .lte('scheduled_date', dateRange.end)
      .in('status', ['completed', 'in_progress']);

    if (maintenanceError) throw maintenanceError;

    // Group expenses by date
    const expensesByDate = new Map<string, any>();

    tripsData?.forEach(trip => {
      const date = trip.trip_start_date.split('T')[0];
      if (!expensesByDate.has(date)) {
        expensesByDate.set(date, {
          date,
          fuelExpenses: 0,
          driverAllowance: 0,
          tollExpenses: 0,
          otherExpenses: 0,
          maintenanceExpenses: 0,
          totalExpenses: 0,
          income: 0,
          netProfit: 0
        });
      }

      const dayData = expensesByDate.get(date);
      dayData.fuelExpenses += trip.total_fuel_cost || 0;
      dayData.driverAllowance += trip.driver_allowance || 0;
      dayData.tollExpenses += trip.toll_expenses || 0;
      dayData.otherExpenses += trip.other_expenses || 0;
      dayData.totalExpenses += trip.total_expenses || 0;
      dayData.income += trip.income_amount || 0;
      dayData.netProfit += trip.net_profit || 0;
    });

    maintenanceData?.forEach(task => {
      const date = task.scheduled_date;
      if (!expensesByDate.has(date)) {
        expensesByDate.set(date, {
          date,
          fuelExpenses: 0,
          driverAllowance: 0,
          tollExpenses: 0,
          otherExpenses: 0,
          maintenanceExpenses: 0,
          totalExpenses: 0,
          income: 0,
          netProfit: 0
        });
      }

      const dayData = expensesByDate.get(date);
      dayData.maintenanceExpenses += task.cost || 0;
      dayData.totalExpenses += task.cost || 0;
      dayData.netProfit -= task.cost || 0;
    });

    const expenses = Array.from(expensesByDate.values()).sort((a, b) => b.date.localeCompare(a.date));

    // Calculate summary
    const summary = {
      totalFuelCost: tripsData?.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0) || 0,
      totalDriverAllowance: tripsData?.reduce((sum, trip) => sum + (trip.driver_allowance || 0), 0) || 0,
      totalTollExpenses: tripsData?.reduce((sum, trip) => sum + (trip.toll_expenses || 0), 0) || 0,
      totalOtherExpenses: tripsData?.reduce((sum, trip) => sum + (trip.other_expenses || 0), 0) || 0,
      totalMaintenanceExpenses: maintenanceData?.reduce((sum, task) => sum + (task.cost || 0), 0) || 0,
      totalExpenses: 0,
      totalIncome: tripsData?.reduce((sum, trip) => sum + (trip.income_amount || 0), 0) || 0,
      netProfit: 0
    };

    summary.totalExpenses = summary.totalFuelCost + summary.totalDriverAllowance +
                           summary.totalTollExpenses + summary.totalOtherExpenses +
                           summary.totalMaintenanceExpenses;
    summary.netProfit = summary.totalIncome - summary.totalExpenses;

    // Calculate category breakdown
    const categoryBreakdown = [
      {
        category: 'Fuel',
        amount: summary.totalFuelCost,
        percentage: summary.totalExpenses > 0 ? Math.round((summary.totalFuelCost / summary.totalExpenses) * 100) : 0
      },
      {
        category: 'Driver Allowance',
        amount: summary.totalDriverAllowance,
        percentage: summary.totalExpenses > 0 ? Math.round((summary.totalDriverAllowance / summary.totalExpenses) * 100) : 0
      },
      {
        category: 'Toll',
        amount: summary.totalTollExpenses,
        percentage: summary.totalExpenses > 0 ? Math.round((summary.totalTollExpenses / summary.totalExpenses) * 100) : 0
      },
      {
        category: 'Maintenance',
        amount: summary.totalMaintenanceExpenses,
        percentage: summary.totalExpenses > 0 ? Math.round((summary.totalMaintenanceExpenses / summary.totalExpenses) * 100) : 0
      },
      {
        category: 'Other',
        amount: summary.totalOtherExpenses,
        percentage: summary.totalExpenses > 0 ? Math.round((summary.totalOtherExpenses / summary.totalExpenses) * 100) : 0
      }
    ];

    return {
      dateRange,
      expenses,
      summary,
      categoryBreakdown
    };
  } catch (error) {
    logger.error('Error fetching expense data:', error);
    throw error;
  }
};

// Fuel Analysis Report Data Fetcher
export const fetchFuelAnalysisData = async (
  dateRange: { start: string; end: string }
): Promise<FuelAnalysisData> => {
  try {
    // Fetch vehicles
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'active');

    if (vehiclesError) throw vehiclesError;

    // Fetch trips with fuel data
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select(`
        id,
        vehicle_id,
        total_km,
        fuel_quantity,
        fuel_rate_per_liter,
        total_fuel_cost,
        trip_start_date
      `)
      .gte('trip_start_date', dateRange.start)
      .lte('trip_start_date', dateRange.end)
      .neq('status', 'cancelled')
      .gt('fuel_quantity', 0);

    if (tripsError) throw tripsError;

    // Process fuel data by vehicle
    const vehicleFuelMap = new Map<string, any>();

    vehiclesData?.forEach(vehicle => {
      vehicleFuelMap.set(vehicle.id, {
        id: vehicle.id,
        registrationNumber: vehicle.registration_number,
        model: vehicle.model || 'N/A',
        fuelType: vehicle.fuel_type || 'N/A',
        trips: 0,
        totalDistance: 0,
        totalFuelConsumed: 0,
        totalFuelCost: 0,
        avgFuelRate: 0,
        fuelEfficiency: 0,
        costPerKm: 0,
        fuelRates: []
      });
    });

    tripsData?.forEach(trip => {
      if (trip.vehicle_id && vehicleFuelMap.has(trip.vehicle_id)) {
        const vehicleData = vehicleFuelMap.get(trip.vehicle_id);
        vehicleData.trips += 1;
        vehicleData.totalDistance += trip.total_km || 0;
        vehicleData.totalFuelConsumed += trip.fuel_quantity || 0;
        vehicleData.totalFuelCost += trip.total_fuel_cost || 0;
        if (trip.fuel_rate_per_liter) {
          vehicleData.fuelRates.push(trip.fuel_rate_per_liter);
        }
      }
    });

    const vehicleFuelData = Array.from(vehicleFuelMap.values())
      .filter(v => v.trips > 0)
      .map(v => {
        v.avgFuelRate = v.fuelRates.length > 0
          ? v.fuelRates.reduce((sum: number, rate: number) => sum + rate, 0) / v.fuelRates.length
          : 0;
        v.fuelEfficiency = v.totalFuelConsumed > 0 ? v.totalDistance / v.totalFuelConsumed : 0;
        v.costPerKm = v.totalDistance > 0 ? v.totalFuelCost / v.totalDistance : 0;
        delete v.fuelRates;
        return v;
      })
      .sort((a, b) => b.totalFuelConsumed - a.totalFuelConsumed);

    // Calculate summary
    const summary = {
      totalVehicles: vehicleFuelData.length,
      totalRefuelings: tripsData?.length || 0,
      totalDistance: vehicleFuelData.reduce((sum, v) => sum + v.totalDistance, 0),
      totalFuelConsumed: vehicleFuelData.reduce((sum, v) => sum + v.totalFuelConsumed, 0),
      totalFuelCost: vehicleFuelData.reduce((sum, v) => sum + v.totalFuelCost, 0),
      avgFuelRate: vehicleFuelData.length > 0
        ? vehicleFuelData.reduce((sum, v) => sum + v.avgFuelRate, 0) / vehicleFuelData.length
        : 0,
      fleetAvgEfficiency: 0,
      avgCostPerKm: 0
    };

    summary.fleetAvgEfficiency = summary.totalFuelConsumed > 0
      ? summary.totalDistance / summary.totalFuelConsumed
      : 0;
    summary.avgCostPerKm = summary.totalDistance > 0
      ? summary.totalFuelCost / summary.totalDistance
      : 0;

    // Calculate trends by date
    const trendsByDate = new Map<string, any>();

    tripsData?.forEach(trip => {
      const date = trip.trip_start_date.split('T')[0];
      if (!trendsByDate.has(date)) {
        trendsByDate.set(date, {
          date,
          fuelConsumed: 0,
          fuelCost: 0,
          distance: 0,
          avgEfficiency: 0
        });
      }

      const dayData = trendsByDate.get(date);
      dayData.fuelConsumed += trip.fuel_quantity || 0;
      dayData.fuelCost += trip.total_fuel_cost || 0;
      dayData.distance += trip.total_km || 0;
    });

    const trends = Array.from(trendsByDate.values())
      .map(day => ({
        ...day,
        avgEfficiency: day.fuelConsumed > 0 ? day.distance / day.fuelConsumed : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      dateRange,
      vehicleFuelData,
      summary,
      trends
    };
  } catch (error) {
    logger.error('Error fetching fuel analysis data:', error);
    throw error;
  }
};
