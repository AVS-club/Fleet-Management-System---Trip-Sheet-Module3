import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trip, Vehicle } from '../../../types';
import { parseISO, isValid, isWithinInterval, format, isBefore } from 'date-fns';

interface AverageMileagePerVehicleChartProps {
  trips: Trip[];
  vehicles: Vehicle[] | null;
  dateRange: { start: Date; end: Date };
}

const AverageMileagePerVehicleChart: React.FC<AverageMileagePerVehicleChartProps> = ({ 
  trips, 
  vehicles,
  dateRange
}) => {  
  // Calculate average mileage per vehicle
  const chartData = useMemo(() => {
    if (!Array.isArray(trips) || !Array.isArray(vehicles)) return [];
    
    // Safety check for date range validity
    if (!isValid(dateRange.start) || !isValid(dateRange.end) || !isBefore(dateRange.start, dateRange.end)) {
      console.warn('Invalid date range:', dateRange);
      return [];
    }

    // Filter trips by date range
    const filteredTrips = trips.filter(trip => {
      try {
        const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
        
        // Validate trip date before using in interval check
        if (!tripDate || !isValid(tripDate)) return false;
        
        return isWithinInterval(tripDate, dateRange);
      } catch (error) {
        console.warn('Error filtering trip by date:', error);
        return false;
      }
    });
    
    // Create vehicle lookup map
    const vehicleMap: Record<string, Vehicle> = {};
    vehicles.forEach(vehicle => {
      vehicleMap[vehicle.id] = vehicle;
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
        const vehicle = vehicleMap[item.vehicleId];
        return {
          vehicleId: item.vehicleId,
          vehicleNumber: vehicle?.registration_number || 'Unknown',
          mileage: parseFloat(item.mileage.toFixed(2)),
          totalDistance: Math.round(item.totalDistance),
          totalFuel: Math.round(item.totalFuel),
          lowMileage: item.mileage < 6.0
        };
      });

    return sortedData;
  }, [trips, vehicles, dateRange]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-md shadow-sm">
          <p className="font-medium text-base">{label}</p>
          <p className="text-base text-primary-600 font-bold mt-1">
            {data.mileage.toFixed(2)} km/L
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Distance: {data.totalDistance.toLocaleString()} km
          </p>
          <p className="text-sm text-gray-600">
            Fuel: {data.totalFuel.toLocaleString()} L
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Period: {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <div className="h-72 overflow-x-auto scroll-indicator">
        <div className="min-w-[600px] h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 10, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="vehicleNumber" 
                tick={{ fontSize: 11, fontWeight: 500 }}
                tickLine={false}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                label={{ 
                  value: 'km/L', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 10 }
                }}
              />
              <Tooltip content={(props) => <CustomTooltip {...props} />} />
              <Bar 
                dataKey="mileage" 
                name="Mileage"
                label={{
                  position: 'top',
                  formatter: (value: number) => `${value.toFixed(1)}`,
                  fontSize: 10,
                  fontWeight: 500,
                  fill: '#4B5563',
                  dy: -4 
                }}
                barSize={32}
                fill={(entry: any) => entry.lowMileage ? '#F59E0B' : '#0277BD'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {chartData.length === 0 && (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
          No mileage data available for the selected period
        </div>
      )}
    </div>
  );
};

export default AverageMileagePerVehicleChart;