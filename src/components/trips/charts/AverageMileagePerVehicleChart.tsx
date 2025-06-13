import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trip, Vehicle } from '../../../types';
import { format, parseISO, isValid, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import Select from '../../ui/Select';
import Input from '../../ui/Input';

interface AverageMileagePerVehicleChartProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
}

type MileageFilterType = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

const AverageMileagePerVehicleChart: React.FC<AverageMileagePerVehicleChartProps> = ({ trips, vehicles }) => {
  const [filterType, setFilterType] = useState<MileageFilterType>('last7');
  const [customStartDate, setCustomStartDate] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Calculate date range based on filter type
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (filterType) {
      case 'today':
        return {
          start: new Date(now.setHours(0, 0, 0, 0)),
          end: now
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: new Date(yesterday.setHours(0, 0, 0, 0)),
          end: new Date(yesterday.setHours(23, 59, 59, 999))
        };
      case 'last7':
        return {
          start: subDays(now, 7),
          end: now
        };
      case 'thisMonth':
        return {
          start: startOfMonth(now),
          end: now
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'thisYear':
        return {
          start: startOfYear(now),
          end: now
        };
      case 'custom':
        // Validate custom dates
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        
        // Check if dates are valid
        const validStartDate = isValid(startDate) ? startDate : subDays(now, 7);
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
          start: subDays(now, 7),
          end: now
        };
    }
  }, [filterType, customStartDate, customEndDate]);
  
  // Calculate average mileage per vehicle
  const chartData = useMemo(() => {
    if (!Array.isArray(trips) || !Array.isArray(vehicles)) return [];

    // Filter trips by date range
    const filteredTrips = trips.filter(trip => {
      const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
      
      // Validate trip date before using in interval check
      if (!tripDate || !isValid(tripDate)) return false;
      
      return tripDate >= dateRange.start && tripDate <= dateRange.end;
    });

    // Calculate mileage for each vehicle
    const vehicleMileageMap: Record<string, { 
      vehicleId: string, 
      totalDistance: number, 
      totalFuel: number,
      mileage: number 
    }> = {};

    // First pass: calculate total distance and fuel for each vehicle
    filteredTrips.forEach(trip => {
      if (trip.vehicle_id) {
        if (!vehicleMileageMap[trip.vehicle_id]) {
          vehicleMileageMap[trip.vehicle_id] = {
            vehicleId: trip.vehicle_id,
            totalDistance: 0,
            totalFuel: 0,
            mileage: 0
          };
        }
        
        // Add distance
        const distance = trip.end_km - trip.start_km;
        if (distance > 0 && !trip.short_trip) {
          vehicleMileageMap[trip.vehicle_id].totalDistance += distance;
        }
        
        // Add fuel if refueling trip
        if (trip.refueling_done && trip.fuel_quantity && trip.fuel_quantity > 0) {
          vehicleMileageMap[trip.vehicle_id].totalFuel += trip.fuel_quantity;
        }
      }
    });

    // Second pass: calculate mileage for each vehicle
    Object.values(vehicleMileageMap).forEach(vehicle => {
      if (vehicle.totalFuel > 0) {
        vehicle.mileage = vehicle.totalDistance / vehicle.totalFuel;
      } else if (vehicle.totalDistance > 0) {
        // If we have distance but no fuel records, use calculated_kmpl from trips
        const vehicleTrips = filteredTrips.filter(
          trip => trip.vehicle_id === vehicle.vehicleId && 
                 trip.calculated_kmpl !== undefined && 
                 !trip.short_trip
        );
        
        if (vehicleTrips.length > 0) {
          const avgMileage = vehicleTrips.reduce((sum, trip) => 
            sum + (trip.calculated_kmpl || 0), 0) / vehicleTrips.length;
          vehicle.mileage = avgMileage;
        }
      }
    });

    // Convert to array and sort by mileage (descending)
    const sortedData = Object.values(vehicleMileageMap)
      .filter(item => item.mileage > 0) // Only include vehicles with calculated mileage
      .sort((a, b) => b.mileage - a.mileage)
      .map(item => {
        const vehicle = vehicles.find(v => v.id === item.vehicleId);
        return {
          vehicleId: item.vehicleId,
          vehicleNumber: vehicle?.registration_number || 'Unknown',
          mileage: parseFloat(item.mileage.toFixed(2)),
          lowMileage: item.mileage < 6.0
        };
      });

    return sortedData;
  }, [trips, vehicles, dateRange]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Select
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'last7', label: 'Last 7 Days' },
                { value: 'thisMonth', label: 'This Month' },
                { value: 'lastMonth', label: 'Last Month' },
                { value: 'thisYear', label: 'This Year' },
                { value: 'custom', label: 'Custom Range' }
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as MileageFilterType)}
            />
          </div>
          
          {filterType === 'custom' && (
            <>
              <div className="w-32">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="w-32">
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="h-80 overflow-x-auto">
        <div className="min-w-[600px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="vehicleNumber" 
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'km/L', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 12 }
                }}
              />
              <Tooltip
                formatter={(value: number) => [`${value} km/L`, 'Mileage']}
                labelStyle={{ fontWeight: 'bold' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              />
              <Bar 
                dataKey="mileage" 
                name="Mileage"
                label={{ 
                  position: 'top', 
                  formatter: (value: number) => `${value} km/L`,
                  fontSize: 11
                }}
                barSize={30}
                fill={(entry: any) => entry.lowMileage ? '#F59E0B' : '#4CAF50'}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {chartData.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          No mileage data available for the selected period
        </div>
      )}
    </div>
  );
};

export default AverageMileagePerVehicleChart;