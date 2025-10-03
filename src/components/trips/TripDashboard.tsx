import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trip, Vehicle, Driver } from '@/types';
import { Calendar, TrendingUp, Fuel, IndianRupee, Package, MapPin, Truck, AlertTriangle, BarChart2, BarChartHorizontal, Gauge } from 'lucide-react';
import { format, subDays, startOfYear, endOfYear, subYears, isWithinInterval, isValid, parseISO, subMonths, isBefore, isAfter } from 'date-fns';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import StatCard from '../ui/StatCard';
import CollapsibleSection from '../ui/CollapsibleSection';
import MonthlyFuelConsumptionChart from './charts/MonthlyFuelConsumptionChart';
import FuelConsumedByVehicleChart from './charts/FuelConsumedByVehicleChart';
import AverageMileagePerVehicleChart from './charts/AverageMileagePerVehicleChart';
import { NumberFormatter } from '@/utils/numberFormatter';

interface TripDashboardProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
  drivers: Driver[] | null;
}

type DateFilterType = 'lastMonth' | 'last3Months' | 'last6Months' | 'last12Months' | 'allTime' | 'custom';

const TripDashboard: React.FC<TripDashboardProps> = ({ trips, vehicles, drivers }) => {
  const { t } = useTranslation();
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('allTime');
  const [customStartDate, setCustomStartDate] = useState<string>(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Find earliest trip date for "All Time" filter
  const earliestTripDate = useMemo(() => {
    if (!Array.isArray(trips) || trips.length === 0) {
      return subYears(new Date(), 5); // Default to 5 years ago if no trips
    }
    
    const validDates = trips
      .map(trip => trip.trip_start_date ? parseISO(trip.trip_start_date) : null)
      .filter((date): date is Date => date !== null && isValid(date));
    
    if (validDates.length === 0) {
      return subYears(new Date(), 5);
    }
    
    return new Date(Math.min(...validDates.map(date => date.getTime())));
  }, [trips]);
  
  // Calculate effective date range based on the filter type
  const effectiveDateRange = useMemo(() => {
    const now = new Date();
    
    let start: Date;
    let end: Date = now;
    
    switch (dateFilterType) {
      case 'lastMonth':
        start = subMonths(now, 1);
        break;
      case 'last3Months':
        start = subMonths(now, 3);
        break;
      case 'last6Months':
        start = subMonths(now, 6);
        break;
      case 'last12Months':
        start = subMonths(now, 12);
        break;
      case 'allTime':
        start = earliestTripDate;
        break;
      case 'custom':
        // Parse custom dates safely using parseISO
        try {
          const parsedStartDate = customStartDate ? parseISO(customStartDate) : null;
          const parsedEndDate = customEndDate ? parseISO(customEndDate) : null;
          
          // Check if parsed dates are valid
          if (parsedStartDate && isValid(parsedStartDate)) {
            start = parsedStartDate;
          } else {
            start = subMonths(now, 3); // Default fallback
          }
          
          if (parsedEndDate && isValid(parsedEndDate)) {
            end = parsedEndDate;
          } 
          
          // Ensure start date is before end date
          if (isAfter(start, end)) {
            // Swap dates if start is after end
            const temp = start;
            start = end;
            end = temp;
          }
        } catch (error) {
          console.error("Error parsing custom dates:", error);
          start = subMonths(now, 3); // Default fallback on error
        }
        break;
      default:
        start = subMonths(now, 3); // Default to last 3 months
    }
    
    // Final safety check - ensure start is before end
    if (!isBefore(start, end)) {
      start = subMonths(end, 3); // Set start to 3 months before end as a fallback
    }
    
    return { start, end };
  }, [dateFilterType, customStartDate, customEndDate, earliestTripDate]);
  
  // Calculate stats
  const stats = useMemo(() => {
    // Use all trips for calculations
    const regularTrips = Array.isArray(trips) ? trips : [];
    
    // Filter trips based on the selected date range
    const filteredTrips = regularTrips.filter(trip => {
      try {
        const tripDate = trip.trip_start_date ? parseISO(trip.trip_start_date) : null;
        
        // Validate trip date before using in interval check
        if (!tripDate || !isValid(tripDate)) return false;
        
        // Safety check to prevent invalid interval
        if (!isValid(effectiveDateRange.start) || !isValid(effectiveDateRange.end)) return false;
        if (!isBefore(effectiveDateRange.start, effectiveDateRange.end)) return false;
        
        return isWithinInterval(tripDate, effectiveDateRange);
      } catch (error) {
        console.error("Error filtering trip:", error);
        return false;
      }
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
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={t('dashboard.totalTrips')}
          value={stats.totalTrips}
          icon={<BarChart2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
        />
        
        <StatCard
          title={t('dashboard.totalDistance')}
          value={NumberFormatter.large(stats.totalDistance)}
          subtitle="km"
          icon={<TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
        />
        
        <StatCard
          title={t('dashboard.totalFuelUsed')}
          value={NumberFormatter.large(stats.totalFuel)}
          subtitle="L"
          icon={<Fuel className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
        />
        
        <StatCard
          title={t('dashboard.averageMileage')}
          value={stats.avgMileage ? NumberFormatter.display(stats.avgMileage, 2) : "-"}
          subtitle="km/L"
          icon={<Gauge className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
        />
      </div>

      {/* Fuel Consumption AI Analytics Section */}
      <div className="space-y-3 mt-4">
        {/* Section title and date range filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 border-l-2 border-blue-500 pl-2">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <Fuel className="mr-2 h-5 w-5 text-primary-600 dark:text-primary-400" />
            Fuel Consumption AI Analytics
          </h2>
          
          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
            <Select
              options={[
                { value: 'lastMonth', label: 'Last Month' },
                { value: 'last3Months', label: 'Last 3 Months' },
                { value: 'last6Months', label: 'Last 6 Months' },
                { value: 'last12Months', label: 'Last 12 Months' },
                { value: 'allTime', label: 'All Time' },
                { value: 'custom', label: 'Custom Range' }
              ]}
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as DateFilterType)}
              className="w-40 sm:w-44"
            />
            
            {dateFilterType === 'custom' && (
              <div className="flex flex-row flex-wrap items-center gap-2 mt-0">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-auto"
                  inputSize="sm"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-auto"
                  inputSize="sm"
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