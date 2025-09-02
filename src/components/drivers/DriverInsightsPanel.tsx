import React, { useState, useMemo } from 'react';
import { 
  Driver, 
  Trip, 
  Vehicle 
} from '@/types';
import { IndianRupee, Calendar, Fuel, TrendingUp, PenTool as Tool, AlertTriangle, BarChart2 } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subMonths, startOfMonth, parseISO, isValid, isWithinInterval } from 'date-fns';
import CollapsibleSection from '../../components/ui/CollapsibleSection';
import Select from '../../components/ui/Select';

interface DriverInsightsPanelProps {
  driver: Driver;
  trips: Trip[];
}

const DriverInsightsPanel: React.FC<DriverInsightsPanelProps> = ({
  driver,
  trips
}) => {
  const [timeFilter, setTimeFilter] = useState<'lastThreeMonths' | 'thisMonth' | 'allTime'>('allTime');
  
  // Define date range based on time filter
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (timeFilter) {
      case 'thisMonth':
        return {
          start: startOfMonth(now),
          end: now
        };
      case 'lastThreeMonths':
        return {
          start: subMonths(now, 3),
          end: now
        };
      case 'allTime':
        return {
          start: new Date(0), // January 1, 1970
          end: now
        };
    }
  }, [timeFilter]);
  
  // Filter trips based on date range and driver
  const filteredTrips = useMemo(() => {
    return Array.isArray(trips) ? trips.filter(trip => {
      // Only include trips assigned to this driver
      if (trip.driver_id !== driver.id) return false;
      
      // Filter by date range
      const tripDate = parseISO(trip.trip_start_date);
      return isValid(tripDate) && isWithinInterval(tripDate, dateRange);
    }) : [];
  }, [trips, driver.id, dateRange]);
  
  // Calculate metrics
  const metrics = useMemo(() => {
    if (!Array.isArray(filteredTrips) || filteredTrips.length === 0) {
      return {
        totalTrips: 0,
        totalFuel: 0,
        totalDistance: 0,
        totalExpenses: 0,
        costPerKm: 0,
        maintenanceCount: 0,
        kmPerDay: []
      };
    }
    
    // Sort trips by date
    const sortedTrips = [...filteredTrips].sort((a, b) => 
      new Date(a.trip_start_date).getTime() - new Date(b.trip_start_date).getTime()
    );
    
    // Calculate total fuel
    const totalFuel = sortedTrips.reduce((sum, trip) => 
      sum + (trip.refueling_done && trip.fuel_quantity ? trip.fuel_quantity : 0), 0);
    
    // Calculate total distance
    const totalDistance = sortedTrips.reduce((sum, trip) => 
      sum + (trip.end_km - trip.start_km), 0);
    
    // Calculate total expenses
    const totalExpenses = sortedTrips.reduce((sum, trip) => {
      const fuelCost = trip.total_fuel_cost || 0;
      const roadExpenses = trip.total_road_expenses || 0;
      return sum + fuelCost + roadExpenses;
    }, 0);
    
    // Calculate cost per km
    const costPerKm = totalDistance > 0 ? totalExpenses / totalDistance : 0;
    
    // Calculate km per day data for the chart
    const kmPerDayData: Array<{ date: string; km: number }> = [];
    const dateMap: Record<string, { totalKm: number; count: number }> = {};
    
    sortedTrips.forEach(trip => {
      const tripDate = parseISO(trip.trip_start_date);
      const formattedDate = format(tripDate, 'MMM dd');
      const distance = trip.end_km - trip.start_km;
      
      if (!dateMap[formattedDate]) {
        dateMap[formattedDate] = { totalKm: 0, count: 0 };
      }
      
      dateMap[formattedDate].totalKm += distance;
      dateMap[formattedDate].count += 1;
    });
    
    // Convert map to array and calculate average km per day
    Object.entries(dateMap).forEach(([date, data]) => {
      kmPerDayData.push({
        date,
        km: Math.round(data.totalKm)
      });
    });
    
    return {
      totalTrips: sortedTrips.length,
      totalFuel,
      totalDistance,
      totalExpenses,
      costPerKm,
      maintenanceCount: 0, // Placeholder for now
      kmPerDay: kmPerDayData
    };
  }, [filteredTrips]);
  
  return (
    <div className="space-y-6">
      <CollapsibleSection 
        title="Driver Insights" 
        icon={<BarChart2 className="h-5 w-5" />}
        iconColor="text-indigo-600"
        defaultExpanded={true}
      >
        <div className="mb-4 flex justify-end">
          <div className="w-48">
            <Select 
              options={[
                { value: 'lastThreeMonths', label: 'Last 3 Months' },
                { value: 'thisMonth', label: 'This Month' },
                { value: 'allTime', label: 'All Time' }
              ]}
              value={timeFilter}
              onChange={(e) =>
                setTimeFilter(
                  e.target.value as 'lastThreeMonths' | 'thisMonth' | 'allTime'
                )
              }
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Total Fuel Used</p>
                <p className="text-xl font-bold text-gray-900">{metrics.totalFuel.toFixed(2)} L</p>
                {metrics.totalTrips > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Across {metrics.totalTrips} trips
                  </p>
                )}
              </div>
              <Fuel className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-xl font-bold text-gray-900">₹{metrics.totalExpenses.toLocaleString('en-IN')}</p>
                {metrics.totalDistance > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    For {metrics.totalDistance.toLocaleString('en-IN')} km driven
                  </p>
                )}
              </div>
              <IndianRupee className="h-5 w-5 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Cost per KM</p>
                <p className="text-xl font-bold text-gray-900">₹{metrics.costPerKm.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Based on {timeFilter === 'thisMonth' ? 'this month' : 
                            timeFilter === 'lastThreeMonths' ? 'last 3 months' : 'all time'}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Maintenance During Assignment</p>
                <p className="text-xl font-bold text-gray-900">Coming Soon</p>
                <p className="text-xs text-gray-500 mt-1">
                  Maintenance impact tracking
                </p>
              </div>
              <Tool className="h-5 w-5 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Trip Miss Rate</p>
                <p className="text-xl font-bold text-gray-900">Coming Soon</p>
                <p className="text-xs text-gray-500 mt-1">
                  Trip reliability metrics
                </p>
              </div>
              <Calendar className="h-5 w-5 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Complaint Rate</p>
                <p className="text-xl font-bold text-gray-900">Coming Soon</p>
                <p className="text-xs text-gray-500 mt-1">
                  Customer satisfaction metrics
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
        </div>
      </CollapsibleSection>
      
      <CollapsibleSection
        title="KM/Day Trend" 
        icon={<TrendingUp className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={false}
      >
        <div className="bg-white p-4 rounded-lg shadow-sm">
          {metrics.kmPerDay.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={metrics.kmPerDay}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value} km`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number | string) => [`${value} km`, 'Distance']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="km"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-60">
              <BarChart2 className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">No trip data available</p>
              <p className="text-gray-400 text-sm mt-2">
                KM/Day trend will appear here once trips are recorded
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default DriverInsightsPanel;