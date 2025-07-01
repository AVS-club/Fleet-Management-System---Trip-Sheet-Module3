import React, { useState, useMemo } from 'react';
import { Trip, Vehicle, Driver } from '../../types';
import { Calendar, TrendingUp, Fuel, IndianRupee, Package, MapPin, Truck, AlertTriangle, BarChart2, BarChartHorizontal, Gauge } from 'lucide-react';
import { format, subDays, startOfYear, endOfYear, subYears, isWithinInterval, isValid, parseISO, subMonths } from 'date-fns';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
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

type DateFilterType = 'lastMonth' | 'last3Months' | 'last6Months' | 'last12Months' | 'custom';

const TripDashboard: React.FC<TripDashboardProps> = ({ trips, vehicles, drivers }) => {
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('last3Months');
  const [customStartDate, setCustomStartDate] = useState<string>(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Calculate effective date range based on the filter type
  const effectiveDateRange = useMemo(() => {
    const now = new Date();
    
    switch (dateFilterType) {
      case 'lastMonth':
        return {
          start: subMonths(now, 1),
          end: now
        };
      case 'last3Months':
        return {
          start: subMonths(now, 3),
          end: now
        };
      case 'last6Months':
        return {
          start: subMonths(now, 6),
          end: now
        };
      case 'last12Months':
        return {
          start: subMonths(now, 12),
          end: now
        };
      case 'custom':
        // Parse custom dates safely using parseISO and validate them
        const parsedStartDate = customStartDate ? parseISO(customStartDate) : null;
        const parsedEndDate = customEndDate ? parseISO(customEndDate) : null;
        
        // Check if parsed dates are valid, fall back to defaults if not
        const validStartDate = parsedStartDate && isValid(parsedStartDate) 
          ? parsedStartDate 
          : subMonths(now, 3);
        const validEndDate = parsedEndDate && isValid(parsedEndDate) 
          ? parsedEndDate 
          : now;
        
        return {
          start: validStartDate,
          end: validEndDate
        };
      default:
        return {
          start: subMonths(now, 3),
          end: now
        };
    }
  }, [dateFilterType, customStartDate, customEndDate]);
  
  // Calculate stats
  const stats = useMemo(() => {
    // Filter out short trips for most calculations
    const regularTrips = Array.isArray(trips) ? trips.filter(trip => !trip.short_trip) : [];
    
    // Filter trips based on the selected date range
    const filteredTrips = regularTrips.filter(trip => {
      const tripDate = trip.trip_start_date ? parseISO(trip.trip_start_date) : null;
      
      // Validate trip date before using in interval check
      if (!tripDate || !isValid(tripDate)) return false;
      
      return isWithinInterval(tripDate, effectiveDateRange);
    });
    
    // Total distance
    const totalDistance = filteredTrips.reduce(
      (sum, trip) => sum + (trip.end_km - trip.start_km), 
      0
    );
    
    // Total fuel
    const totalFuel = filteredTrips
      .filter(trip => trip.refueling_done && trip.fuel_quantity)
      .reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);
    
    // Average mileage
    const tripsWithKmpl = filteredTrips.filter(trip => trip.calculated_kmpl);
    const avgMileage = tripsWithKmpl.length > 0
      ? tripsWithKmpl.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithKmpl.length
      : 0;
    
    return {
      totalTrips: filteredTrips.length,
      totalDistance,
      totalFuel,
      avgMileage
    };
  }, [trips, effectiveDateRange]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Trips"
          value={stats.totalTrips}
          icon={<BarChart2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
        />
        
        <StatCard
          title="Total Distance"
          value={stats.totalDistance.toLocaleString()}
          subtitle="km"
          icon={<TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
        />
        
        <StatCard
          title="Total Fuel"
          value={stats.totalFuel.toLocaleString()}
          subtitle="L"
          icon={<Fuel className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
        />
        
        <StatCard
          title="Average Mileage"
          value={stats.avgMileage ? stats.avgMileage.toFixed(2) : "-"}
          subtitle="km/L"
          icon={<Gauge className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
        />
      </div>

      {/* Fuel Consumption AI Analytics Section */}
      <div className="space-y-4 mt-8">
        {/* Section title and date range filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <Fuel className="mr-2 h-5 w-5 text-primary-600 dark:text-primary-400" />
            Fuel Consumption AI Analytics
          </h2>
          
          <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
            <Select
              options={[
                { value: 'lastMonth', label: 'Last Month' },
                { value: 'last3Months', label: 'Last 3 Months' },
                { value: 'last6Months', label: 'Last 6 Months' },
                { value: 'last12Months', label: 'Last 12 Months' },
                { value: 'custom', label: 'Custom Range' }
              ]}
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as DateFilterType)}
              className="w-40 sm:w-48"
            />
            
            {dateFilterType === 'custom' && (
              <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full sm:w-auto"
                  size="sm"
                />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full sm:w-auto"
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Monthly Fuel Consumption Chart */}
        <CollapsibleSection 
          key="fuel-trend-section"
          title="Fuel Consumption Trend" 
          icon={<BarChart2 className="h-5 w-5" />}
          iconColor="text-green-600"
          defaultExpanded={true}
        >
          <MonthlyFuelConsumptionChart 
            trips={trips} 
            dateRange={effectiveDateRange}
          />
        </CollapsibleSection>

        {/* Fuel Consumed By Vehicle Chart */}
        <CollapsibleSection
          key="fuel-by-vehicle-section" 
          title="Fuel Consumption by Vehicle" 
          icon={<BarChartHorizontal className="h-5 w-5" />}
          iconColor="text-blue-600"
          defaultExpanded={true}
        >
          <FuelConsumedByVehicleChart 
            trips={trips} 
            vehicles={vehicles}
            dateRange={effectiveDateRange}
          />
        </CollapsibleSection>

        {/* Average Mileage Per Vehicle Chart */}
        <CollapsibleSection
          key="mileage-per-vehicle-section" 
          title="Average Mileage per Vehicle" 
          icon={<Gauge className="h-5 w-5" />}
          iconColor="text-amber-600"
          defaultExpanded={false}
        >
          <AverageMileagePerVehicleChart 
            trips={trips} 
            vehicles={vehicles}
            dateRange={effectiveDateRange} 
          />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default TripDashboard;