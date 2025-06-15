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
import { BarChart, Calculator, Truck, Users, TrendingUp, CalendarRange, Fuel, AlertTriangle, IndianRupee, Info, HelpCircle } from 'lucide-react';
import { getMileageInsights } from '../utils/mileageCalculator';

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
    // We'll handle these asynchronously in a separate effect
    
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
      estimatedFuelSaved: mileageInsights.estimatedFuelSaved
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

  // Tooltip content
  const tooltips = {
    avgMileage: "Average kilometers per liter across all trips with refueling data",
    bestDriver: "Driver with the highest average fuel efficiency across all trips",
    potentialSavings: "Estimated monthly savings if all drivers achieved the efficiency of your best driver"
  };
  
  return (
    <Layout 
      title="Dashboard" 
      subtitle={`Updated hourly · Fleet-level summary · Last updated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg shadow-sm">
          <StatCard
            title="Total Trips"
            value={stats.totalTrips}
            icon={<BarChart className="h-5 w-5 text-primary-600" />}
            trend={{
              value: 12,
              label: "vs last month",
              isPositive: true
            }}
            className="bg-white"
          />
          
          <StatCard
            title="Total Distance"
            value={stats.totalDistance.toLocaleString()}
            subtitle="km"
            icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
            className="bg-white"
          />
          
          <StatCard
            title="Average Mileage"
            value={stats.avgMileage ? stats.avgMileage.toFixed(2) : "-"}
            subtitle="km/L"
            icon={<Calculator className="h-5 w-5 text-primary-600" />}
            tooltip={tooltips.avgMileage}
            className="bg-white"
          />
          
          <StatCard
            title="Total Fuel Used"
            value={stats.totalFuel.toLocaleString()}
            subtitle="L"
            icon={<Fuel className="h-5 w-5 text-primary-600" />}
            className="bg-white"
          />
        </div>

        {/* Mileage Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg shadow-sm">
          {bestVehicle && (
            <div className="bg-white p-6 rounded-lg shadow-sm min-h-[180px]">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-gray-900">Best Vehicle</h3>
                <Truck className="h-6 w-6 text-success-500" />
              </div>
              <div className="mt-3">
                <p className="text-xl font-semibold text-gray-900">{bestVehicle.registration_number}</p>
                <p className="text-xs text-gray-500">{bestVehicle.make} {bestVehicle.model}</p>
                <p className="mt-2 text-teal-500 font-medium">
                  {stats.bestVehicleMileage?.toFixed(2)} km/L
                </p>
              </div>
            </div>
          )}

          {bestDriver && (
            <div className="bg-white p-6 rounded-lg shadow-sm min-h-[180px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="text-base font-medium text-gray-900">Best Driver</h3>
                  <button className="ml-1 text-gray-400 hover:text-gray-600" title={tooltips.bestDriver}>
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </div>
                <Users className="h-6 w-6 text-success-500" />
              </div>
              <div className="mt-3">
                <p className="text-xl font-semibold text-gray-900">{bestDriver.name}</p>
                <p className="text-xs text-gray-500">License: {bestDriver.license_number}</p>
                <p className="mt-2 text-teal-500 font-medium">
                  {stats.bestDriverMileage?.toFixed(2)} km/L
                </p>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-sm min-h-[180px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h3 className="text-base font-medium text-gray-900">Potential Savings</h3>
                <button className="ml-1 text-gray-400 hover:text-gray-600" title={tooltips.potentialSavings}>
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>
              <IndianRupee className="h-6 w-6 text-success-500" />
            </div>
            <div className="mt-3">
              <p className="text-xl font-semibold text-green-600">₹{stats.estimatedFuelSaved.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Estimated monthly savings with best practices</p>
              <p className="mt-2 text-xs text-gray-500">
                Based on fleet average vs. best driver performance
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        
        {Array.isArray(trips) && trips.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 bg-gray-50 p-4 rounded-lg shadow-sm">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-blue-800 font-medium">AI Insights</h3>
                  <div className="mt-2 text-blue-700 text-sm">
                    <p>
                      Our AI analysis suggests the following insights:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li className="flex items-start">
                        <Calculator className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>The average fuel efficiency across your fleet is {stats.avgMileage ? stats.avgMileage.toFixed(2) : "calculating"} km/L</span>
                      </li>
                      {bestDriver && (
                        <li className="flex items-start">
                          <Users className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{bestDriver.name} is your most efficient driver with {stats.bestDriverMileage?.toFixed(2)} km/L average</span>
                        </li>
                      )}
                      {bestVehicle && (
                        <li className="flex items-start">
                          <Truck className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{bestVehicle.registration_number} shows the best fuel economy at {stats.bestVehicleMileage?.toFixed(2)} km/L</span>
                        </li>
                      )}
                      {stats.estimatedFuelSaved > 0 && (
                        <li className="flex items-start">
                          <IndianRupee className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Potential monthly savings of ₹{stats.estimatedFuelSaved.toLocaleString()} by adopting best practices</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <AVSChatbot />
            </div>
          </div>
        )}
      </div>
      )}
    </Layout>
  );
};

export default DashboardPage;