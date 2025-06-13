import React, { useState, useMemo } from 'react';
import { Trip, Vehicle, Driver } from '../../types';
import { Calendar, TrendingUp, Fuel, IndianRupee, Package, MapPin, Truck, AlertTriangle, BarChart2, BarChartHorizontal, Gauge } from 'lucide-react';
import { format, subDays, startOfYear, endOfYear, subYears, isWithinInterval, isValid, parseISO } from 'date-fns';
import Select from '../ui/Select';
import Input from '../ui/Input';
import StatCard from '../dashboard/StatCard';
import CollapsibleSection from '../ui/CollapsibleSection';
import MonthlyFuelConsumptionChart from './charts/MonthlyFuelConsumptionChart';
import FuelConsumedByVehicleChart from './charts/FuelConsumedByVehicleChart';
import AverageMileagePerVehicleChart from './charts/AverageMileagePerVehicleChart';

interface TripDashboardProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
  drivers: Driver[] | null;
}

type DateFilterType = 'last7' | 'last30' | 'thisYear' | 'lastYear' | 'custom';

const TripDashboard: React.FC<TripDashboardProps> = ({ trips, vehicles, drivers }) => {
  const [filterType, setFilterType] = useState<DateFilterType>('last30');
  const [customStartDate, setCustomStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Calculate date range based on filter type
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (filterType) {
      case 'last7':
        return {
          start: subDays(now, 7),
          end: now
        };
      case 'last30':
        return {
          start: subDays(now, 30),
          end: now
        };
      case 'thisYear':
        return {
          start: startOfYear(now),
          end: now
        };
      case 'lastYear':
        return {
          start: startOfYear(subYears(now, 1)),
          end: endOfYear(subYears(now, 1))
        };
      case 'custom':
        // Validate custom dates and ensure valid interval
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        
        // Check if dates are valid
        const validStartDate = isValid(startDate) ? startDate : subDays(now, 30);
        const validEndDate = isValid(endDate) ? endDate : now;
        
        // Ensure start date is not after end date
        if (validStartDate > validEndDate) {
          return {
            start: validEndDate,
            end: validStartDate
          };
        }
        
        return {
          start: validStartDate,
          end: validEndDate
        };
      default:
        return {
          start: subDays(now, 30),
          end: now
        };
    }
  }, [filterType, customStartDate, customEndDate]);
  
  // Filter trips based on date range
  const filteredTrips = useMemo(() => {
    if (!Array.isArray(trips)) return [];

    return trips.filter(trip => {
      // Safely parse the date
      const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;

      // Validate trip date before using in interval check
      if (!tripDate || !isValid(tripDate)) return false;

      return isWithinInterval(tripDate, {
        start: dateRange.start,
        end: dateRange.end
      });
    });
  }, [trips, dateRange]);
  
  // Calculate previous period for comparison
  const previousPeriodRange = useMemo(() => {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - duration),
      end: new Date(dateRange.end.getTime() - duration)
    };
  }, [dateRange]);
  
  // Filter trips for previous period
  const previousPeriodTrips = useMemo(() => {
    if (!Array.isArray(trips)) return [];
    
    return trips.filter(trip => {
      // Safely parse the date
      const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
      
      // Validate trip date before using in interval check
      if (!tripDate || !isValid(tripDate)) return false;
      
      return isWithinInterval(tripDate, {
        start: previousPeriodRange.start,
        end: previousPeriodRange.end
      });
    });
  }, [trips, previousPeriodRange]);
  
  // Calculate metrics
  const metrics = useMemo(() => {
    // Total trips
    const totalTrips = filteredTrips.length;
    const prevTotalTrips = previousPeriodTrips.length;
    const tripsTrend = prevTotalTrips > 0 
      ? ((totalTrips - prevTotalTrips) / prevTotalTrips) * 100 
      : 0;
    
    // Total distance
    const totalDistance = filteredTrips.reduce((sum, trip) => 
      sum + (trip.end_km - trip.start_km), 0);
    const prevTotalDistance = previousPeriodTrips.reduce((sum, trip) => 
      sum + (trip.end_km - trip.start_km), 0);
    const distanceTrend = prevTotalDistance > 0 
      ? ((totalDistance - prevTotalDistance) / prevTotalDistance) * 100 
      : 0;
    
    // Fuel consumed
    const fuelConsumed = filteredTrips
      .filter(trip => trip.refueling_done && trip.fuel_quantity)
      .reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);
    const prevFuelConsumed = previousPeriodTrips
      .filter(trip => trip.refueling_done && trip.fuel_quantity)
      .reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);
    const fuelTrend = prevFuelConsumed > 0 
      ? ((fuelConsumed - prevFuelConsumed) / prevFuelConsumed) * 100 
      : 0;
    
    // Average mileage
    const avgMileage = fuelConsumed > 0 ? totalDistance / fuelConsumed : 0;
    const prevAvgMileage = prevFuelConsumed > 0 ? prevTotalDistance / prevFuelConsumed : 0;
    const mileageTrend = prevAvgMileage > 0 
      ? ((avgMileage - prevAvgMileage) / prevAvgMileage) * 100 
      : 0;
    const mileageWarning = prevAvgMileage > 0 && avgMileage < prevAvgMileage * 0.85;
    
    // Load delivered
    const loadDelivered = filteredTrips.reduce((sum, trip) => 
      sum + (trip.gross_weight || 0), 0);
    const prevLoadDelivered = previousPeriodTrips.reduce((sum, trip) => 
      sum + (trip.gross_weight || 0), 0);
    const loadTrend = prevLoadDelivered > 0 
      ? ((loadDelivered - prevLoadDelivered) / prevLoadDelivered) * 100 
      : 0;
    
    // Fuel cost
    const fuelCost = filteredTrips
      .filter(trip => trip.refueling_done && trip.total_fuel_cost)
      .reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0);
    const prevFuelCost = previousPeriodTrips
      .filter(trip => trip.refueling_done && trip.total_fuel_cost)
      .reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0);
    const fuelCostTrend = prevFuelCost > 0 
      ? ((fuelCost - prevFuelCost) / prevFuelCost) * 100 
      : 0;
    
    // Trip expenses
    const tripExpenses = filteredTrips.reduce((sum, trip) => 
      sum + (trip.total_road_expenses || 0), 0);
    const prevTripExpenses = previousPeriodTrips.reduce((sum, trip) => 
      sum + (trip.total_road_expenses || 0), 0);
    const expensesTrend = prevTripExpenses > 0 
      ? ((tripExpenses - prevTripExpenses) / prevTripExpenses) * 100 
      : 0;
    
    // Unique destinations
    const uniqueDestinations = new Set<string>();
    filteredTrips.forEach(trip => {
      if (Array.isArray(trip.destinations)) {
        trip.destinations.forEach(dest => uniqueDestinations.add(dest));
      }
    });
    const destinationsCount = uniqueDestinations.size;
    
    const prevUniqueDestinations = new Set<string>();
    previousPeriodTrips.forEach(trip => {
      if (Array.isArray(trip.destinations)) {
        trip.destinations.forEach(dest => prevUniqueDestinations.add(dest));
      }
    });
    const prevDestinationsCount = prevUniqueDestinations.size;
    const destinationsTrend = prevDestinationsCount > 0 
      ? ((destinationsCount - prevDestinationsCount) / prevDestinationsCount) * 100 
      : 0;
    
    return {
      totalTrips,
      tripsTrend,
      totalDistance,
      distanceTrend,
      fuelConsumed,
      fuelTrend,
      avgMileage,
      mileageTrend,
      mileageWarning,
      loadDelivered,
      loadTrend,
      fuelCost,
      fuelCostTrend,
      tripExpenses,
      expensesTrend,
      destinationsCount,
      destinationsTrend
    };
  }, [filteredTrips, previousPeriodTrips]);
  
  return (
    <div className="space-y-6">
      {/* Sticky Date Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm sticky top-16 z-10 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select
              label="Date Range"
              options={[
                { value: 'last7', label: 'Last 7 Days' },
                { value: 'last30', label: 'Last 30 Days' },
                { value: 'thisYear', label: 'This Year' },
                { value: 'lastYear', label: 'Last Year' },
                { value: 'custom', label: 'Custom Range' }
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as DateFilterType)}
            />
          </div>
          
          {filterType === 'custom' && (
            <>
              <div className="w-40">
                <Input
                  label="Start Date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  label="End Date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
          
          <div className="ml-auto text-sm text-gray-500 flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Movement + Efficiency */}
        <StatCard
          title="Total Trips"
          value={metrics.totalTrips}
          icon={<Truck className="h-5 w-5 text-primary-600" />}
          trend={metrics.tripsTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.tripsTrend)),
            label: "vs previous period",
            isPositive: metrics.tripsTrend > 0
          } : undefined}
        />
        
        <StatCard
          title="KM Covered"
          value={metrics.totalDistance.toLocaleString()}
          subtitle="km"
          icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
          trend={metrics.distanceTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.distanceTrend)),
            label: "vs previous period",
            isPositive: metrics.distanceTrend > 0
          } : undefined}
        />
        
        <StatCard
          title="Fuel Consumed"
          value={metrics.fuelConsumed.toLocaleString()}
          subtitle="L"
          icon={<Fuel className="h-5 w-5 text-primary-600" />}
          trend={metrics.fuelTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.fuelTrend)),
            label: "vs previous period",
            isPositive: metrics.fuelTrend > 0
          } : undefined}
        />
        
        <StatCard
          title="Average Mileage"
          value={metrics.avgMileage.toFixed(2)}
          subtitle="km/L"
          icon={metrics.mileageWarning ? 
            <AlertTriangle className="h-5 w-5 text-warning-500" /> : 
            <Fuel className="h-5 w-5 text-primary-600" />
          }
          trend={metrics.mileageTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.mileageTrend)),
            label: "vs previous period",
            isPositive: metrics.mileageTrend > 0
          } : undefined}
          className={metrics.mileageWarning ? "border-l-4 border-warning-500" : ""}
        />
        
        {/* Load + Cost */}
        <StatCard
          title="Load Delivered"
          value={(metrics.loadDelivered / 1000).toFixed(1)}
          subtitle="tons"
          icon={<Package className="h-5 w-5 text-primary-600" />}
          trend={metrics.loadTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.loadTrend)),
            label: "vs previous period",
            isPositive: metrics.loadTrend > 0
          } : undefined}
        />
        
        <StatCard
          title="Fuel Cost"
          value={`₹${Math.round(metrics.fuelCost).toLocaleString()}`}
          icon={<IndianRupee className="h-5 w-5 text-primary-600" />}
          trend={metrics.fuelCostTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.fuelCostTrend)),
            label: "vs previous period",
            isPositive: metrics.fuelCostTrend < 0 // Lower cost is positive
          } : undefined}
        />
        
        <StatCard
          title="Trip Expenses"
          value={`₹${Math.round(metrics.tripExpenses).toLocaleString()}`}
          icon={<IndianRupee className="h-5 w-5 text-primary-600" />}
          trend={metrics.expensesTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.expensesTrend)),
            label: "vs previous period",
            isPositive: metrics.expensesTrend < 0 // Lower expenses is positive
          } : undefined}
        />
        
        <StatCard
          title="Destinations Visited"
          value={metrics.destinationsCount}
          icon={<MapPin className="h-5 w-5 text-primary-600" />}
          trend={metrics.destinationsTrend !== 0 ? {
            value: Math.abs(Math.round(metrics.destinationsTrend)),
            label: "vs previous period",
            isPositive: metrics.destinationsTrend > 0
          } : undefined}
        />
      </div>

      {/* Charts Section */}
      <div className="space-y-4 mt-8">
        {/* Monthly Fuel Consumption Chart */}
        <CollapsibleSection 
          title="Fuel Consumption – Last 12 Months" 
          icon={<BarChart2 className="h-5 w-5" />}
          iconColor="text-green-600"
          defaultExpanded={false}
        >
          <MonthlyFuelConsumptionChart trips={trips} />
        </CollapsibleSection>

        {/* Fuel Consumed By Vehicle Chart */}
        <CollapsibleSection 
          title="Fuel Consumption by Vehicle – Last 12 Months" 
          icon={<BarChartHorizontal className="h-5 w-5" />}
          iconColor="text-blue-600"
          defaultExpanded={false}
        >
          <FuelConsumedByVehicleChart trips={trips} vehicles={vehicles} />
        </CollapsibleSection>

        {/* Average Mileage Per Vehicle Chart */}
        <CollapsibleSection 
          title="Average Mileage per Vehicle" 
          icon={<Gauge className="h-5 w-5" />}
          iconColor="text-amber-600"
          defaultExpanded={false}
        >
          <AverageMileagePerVehicleChart trips={trips} vehicles={vehicles} />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default TripDashboard;