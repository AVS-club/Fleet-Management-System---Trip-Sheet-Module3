// Filename: src/pages/drivers/DriverInsightsPage.tsx

// Objective: Expand this page into the full analytics hub for driver performance with:
// - Advanced Metrics
// - Drilldown views
// - AI insights
// - Integration with AI Alerts tab

// PART 1: Import Dependencies
import React, { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Driver, Trip, Vehicle } from '@/types';
import { MaintenanceTask } from '@/types/maintenance';
import { getDriverPerformanceMetrics, getFleetAverageCostPerKm, getMileageDropInsight, getBreakdownInsight, getCostComparisonInsight, getMaintenanceCostInsight } from '@/utils/driverAnalytics';
import DriverSummaryModal from '@/components/drivers/DriverSummaryModal';
import DriverAIInsights from '@/components/ai/DriverAIInsights';
import StatCard from '@/components/ui/StatCard';
import DriverTable from '@/components/drivers/DriverTable';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import DriverOfMonthCard from '@/components/ui/DriverOfMonthCard';

// PART 2: Component Definition
const DriverInsightsPage = () => {
  const supabase = useSupabaseClient();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
    end: new Date(),
  });

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [driversRes, tripsRes, vehiclesRes, maintenanceRes] = await Promise.all([
        supabase.from('drivers').select('*'),
        supabase.from('trips').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('maintenance_tasks').select('*'),
      ]);
      if (driversRes.data) setDrivers(driversRes.data);
      if (tripsRes.data) setTrips(tripsRes.data);
      if (vehiclesRes.data) setVehicles(vehiclesRes.data);
      if (maintenanceRes.data) setMaintenanceTasks(maintenanceRes.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const driverMetrics = getDriverPerformanceMetrics(drivers, trips, vehicles, maintenanceTasks, dateRange);
  const fleetCostPerKm = getFleetAverageCostPerKm(driverMetrics);

  // PART 3: Render UI
  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Driver Insights Dashboard</h1>
        <DateRangeFilter dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Drivers" value={drivers.length} icon="users" />
        <StatCard title="Fleet Avg Cost/KM" value={`₹${fleetCostPerKm.toFixed(2)}`} icon="trending-up" />
        <StatCard title="Avg Load/Trip" value={`${(driverMetrics.reduce((a, b) => a + b.avgLoadPerTrip, 0) / driverMetrics.length).toFixed(2)} kg`} icon="truck" />
        <StatCard title="Driver Utilization" value={`${(driverMetrics.reduce((a, b) => a + b.driverUtilizationPercentage, 0) / driverMetrics.length).toFixed(1)}%`} icon="clock" />
      </div>

      {/* Driver Table with Drilldown Button */}
      <DriverTable
        drivers={driverMetrics}
        onDrilldown={(driverId: string) => {
          const match = drivers.find(d => d.id === driverId);
          if (match) setSelectedDriver(match);
        }}
      />

      {/* Driver Drilldown Modal */}
      {selectedDriver && (
        <DriverSummaryModal
          driver={selectedDriver}
          trips={trips}
          vehicles={vehicles}
          maintenanceTasks={maintenanceTasks}
          onClose={() => setSelectedDriver(null)}
          dateRange={dateRange}
        />
      )}

      {/* Driver of the Month + Toggle Logic */}
      <div className="mt-6">
        <DriverOfMonthCard drivers={driverMetrics} logicType="most_trips" />
      </div>

      {/* AI Insights Section */}
      <div className="mt-6">
        <DriverAIInsights
          drivers={drivers}
          trips={trips}
          vehicles={vehicles}
          maintenanceTasks={maintenanceTasks}
          dateRange={dateRange}
        />
      </div>
    </div>
  );
};

export default DriverInsightsPage;
