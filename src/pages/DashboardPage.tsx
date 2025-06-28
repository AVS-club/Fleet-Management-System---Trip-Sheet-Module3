import AVSChatbot from '../components/AVSChatbot';
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getTrips, getVehicles, getDrivers, getDriver, getVehicle, getVehicleStats } from '../utils/storage';
import { format } from 'date-fns';
import { Trip, Vehicle, Driver } from '../types';
import StatCard from '../components/dashboard/StatCard';
import MileageChart from '../components/dashboard/MileageChart';
import VehicleStatsList from '../components/dashboard/VehicleStatsList';
import RecentTripsTable from '../components/dashboard/RecentTripsTable';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import DashboardTip from '../components/dashboard/DashboardTip';
import EmptyState from '../components/dashboard/EmptyState';
import { BarChart, Calculator, Truck, Users, TrendingUp, CalendarRange, Fuel, AlertTriangle, IndianRupee, Bell } from 'lucide-react';
import { getMileageInsights } from '../utils/mileageCalculator';
import NotificationsPanel from '../components/common/NotificationsPanel';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showChatbot, setShowChatbot] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tripsData, vehiclesData, driversData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers()
        ]);
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Initialize with empty arrays if fetch fails
        setTrips([]);
        setVehicles([]);
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Calculate stats
  const stats = useMemo(() => {
    // Filter out short trips for most calculations
    const regularTrips = Array.isArray(trips) ? trips.filter(trip => !trip.short_trip) : [];
    
    // Total distance
    const totalDistance = regularTrips.reduce(
      (sum, trip) => sum + (trip.end_km - trip.start_km), 
      0
    );
    
    // Total fuel
    const totalFuel = regularTrips
      .filter(trip => trip.refueling_done && trip.fuel_quantity)
      .reduce((sum, trip) => sum + (trip.fuel_quantity || 0), 0);
    
    // Average mileage
    const tripsWithKmpl = regularTrips.filter(trip => trip.calculated_kmpl);
    const avgMileage = tripsWithKmpl.length > 0
      ? tripsWithKmpl.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / tripsWithKmpl.length
      : 0;
    
    // Activity this month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const tripsThisMonth = Array.isArray(trips) ? trips.filter(trip => {
      const tripDate = new Date(trip.trip_start_date);
      return tripDate.getMonth() === currentMonth && tripDate.getFullYear() === currentYear;
    }) : [];
    
    // Get mileage insights
    const mileageInsights = getMileageInsights(trips);
    
    // Calculate date range for summary
    const tripDates = Array.isArray(trips) && trips.length > 0 
      ? trips.map(t => new Date(t.trip_start_date || new Date()).getTime())
      : [];
    
    const earliestTripDate = tripDates.length > 0 ? new Date(Math.min(...tripDates)) : undefined;
    const latestTripDate = tripDates.length > 0 ? new Date(Math.max(...tripDates)) : undefined;
    
    return {
      totalTrips: trips.length,
      totalDistance,
      totalFuel,
      avgMileage,
      tripsThisMonth: tripsThisMonth.length,
      lastTripDate: trips.length > 0 
        ? new Date(Math.max(...trips.map(t => new Date(t.trip_start_date || new Date()).getTime())))
        : undefined,
      bestVehicle: null,
      bestVehicleMileage: mileageInsights.bestVehicleMileage,
      bestDriver: null,
      bestDriverMileage: mileageInsights.bestDriverMileage,
      estimatedFuelSaved: mileageInsights.estimatedFuelSaved,
      earliestTripDate,
      latestTripDate
    };
  }, [trips]);

  // Fetch best vehicle and driver data
  const [bestVehicle, setBestVehicle] = useState<Vehicle | null>(null);
  const [bestDriver, setBestDriver] = useState<Driver | null>(null);
  
  useEffect(() => {
    const fetchBestPerformers = async () => {
      const insights = getMileageInsights(trips);
      
      if (insights.bestVehicle) {
        try {
          const vehicle = await getVehicle(insights.bestVehicle);
          setBestVehicle(vehicle);
        } catch (error) {
          console.error('Error fetching best vehicle:', error);
        }
      }
      
      if (insights.bestDriver) {
        try {
          const driver = await getDriver(insights.bestDriver);
          setBestDriver(driver);
        } catch (error) {
          console.error('Error fetching best driver:', error);
        }
      }
    };
    
    if (Array.isArray(trips) && trips.length > 0) {
      fetchBestPerformers();
    }
  }, [trips]);
  
  const handleSelectTrip = (trip: Trip) => {
    navigate(`/trips/${trip.id}`);
  };
  
  const handleSelectVehicle = (vehicle: Vehicle) => {
    navigate(`/vehicles/${vehicle.id}`);
  };

  // Check if we have enough data to show insights
  const hasEnoughData = Array.isArray(trips) && trips.length > 0;
  const hasRefuelingData = Array.isArray(trips) && trips.some(trip => trip.refueling_done && trip.fuel_quantity);
  
  return (
    <Layout 
      title="Dashboard" 
      subtitle={`Last updated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Date Range Summary */}
        {hasEnoughData && (
          <DashboardSummary 
            earliestTripDate={stats.earliestTripDate}
            latestTripDate={stats.latestTripDate}
            vehicleCount={vehicles.filter(v => v.status !== 'archived').length}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Trips"
            value={stats.totalTrips}
            icon={<BarChart className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
            trend={stats.tripsThisMonth > 0 ? {
              value: 12,
              label: "vs last month",
              isPositive: true
            } : undefined}
          />
          
          <StatCard
            title="Total Distance"
            value={stats.totalDistance.toLocaleString()}
            subtitle="km"
            icon={<TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
          />
          
          {hasRefuelingData ? (
            <>
              <StatCard
                title="Average Mileage"
                value={stats.avgMileage ? stats.avgMileage.toFixed(2) : "-"}
                subtitle="km/L"
                icon={<Calculator className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
              />
              
              <StatCard
                title="Total Fuel Used"
                value={stats.totalFuel.toLocaleString()}
                subtitle="L"
                icon={<Fuel className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
              />
            </>
          ) : (
            <>
              <div className="col-span-2 bg-slate-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center">
                <Fuel className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Fuel Insights</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mileage and fuel consumption insights will appear after trips with refueling are logged.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mileage Insights */}
        {hasRefuelingData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {bestVehicle && (
              <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Best Vehicle</h3>
                  <Truck className="h-6 w-6 text-success-500 dark:text-success-400" />
                </div>
                <div className="mt-3 sm:mt-4">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{bestVehicle.registration_number}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{bestVehicle.make} {bestVehicle.model}</p>
                  <p className="mt-1 sm:mt-2 text-success-600 dark:text-success-400 font-medium text-sm sm:text-base">
                    {stats.bestVehicleMileage?.toFixed(2)} km/L
                  </p>
                </div>
              </div>
            )}

            {bestDriver && (
              <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Best Driver</h3>
                  <Users className="h-6 w-6 text-success-500 dark:text-success-400" />
                </div>
                <div className="mt-3 sm:mt-4">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{bestDriver.name}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">License: {bestDriver.license_number}</p>
                  <p className="mt-1 sm:mt-2 text-success-600 dark:text-success-400 font-medium text-sm sm:text-base">
                    {stats.bestDriverMileage?.toFixed(2)} km/L
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Potential Savings</h3>
                <IndianRupee className="h-6 w-6 text-success-500 dark:text-success-400" />
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="text-xl sm:text-2xl font-bold text-success-600 dark:text-success-400">₹{stats.estimatedFuelSaved.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Estimated monthly savings with best practices</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <MileageChart trips={trips} />
          </div>
          
          <VehicleStatsList 
            vehicles={vehicles} 
            trips={trips} 
            onSelectVehicle={handleSelectVehicle} 
          />
        </div>
        
        <div className="mt-6">
          <RecentTripsTable
            trips={trips}
            vehicles={vehicles}
            drivers={drivers}
            onSelectTrip={handleSelectTrip}
          />
        </div>
        
        {/* Dashboard Tip */}
        {hasEnoughData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-blue-800 dark:text-blue-300 font-medium">AI Insights</h3>
                  <div className="mt-2 text-blue-700 dark:text-blue-400 text-sm">
                    <p>
                      Our AI analysis suggests the following insights:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>The average fuel efficiency across your fleet is {stats.avgMileage ? stats.avgMileage.toFixed(2) : "calculating"} km/L</li>
                      {bestDriver && (
                        <li>{bestDriver.name} is your most efficient driver with {stats.bestDriverMileage?.toFixed(2)} km/L average</li>
                      )}
                      {bestVehicle && (
                        <li>{bestVehicle.registration_number} shows the best fuel economy at {stats.bestVehicleMileage?.toFixed(2)} km/L</li>
                      )}
                      {stats.estimatedFuelSaved > 0 && (
                        <li>Potential monthly savings of ₹{stats.estimatedFuelSaved.toLocaleString()} by adopting best practices</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <section className="mt-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <Bell className="h-5 w-5 text-primary-500 dark:text-primary-400 mr-2" />
                  Notifications & Reminders
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <NotificationsPanel 
                    module="vehicles" 
                    onClose={() => {}} 
                    maxItems={5} 
                    scrollable={true} 
                    height={180} 
                    showViewAll={true} 
                  />
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Tip Section */}
        {hasEnoughData && (
          <DashboardTip 
            title="Did you know?"
            content="You can track insurance, permit, and PUC expiry reminders for every vehicle."
            link={{
              text: "Go to Vehicles → Edit → Enable Reminders",
              url: "/vehicles"
            }}
          />
        )}

        {/* Empty Dashboard State */}
        {!hasEnoughData && (
          <div className="mt-8">
            <EmptyState 
              type="generic"
              message="Start by adding vehicles and recording trips to unlock insights and analytics on your fleet performance."
              showAction={true}
            />
          </div>
        )}
      </div>
      )}
    </Layout>
  );
};

export default DashboardPage;