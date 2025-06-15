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
import { BarChart, Calculator, Truck, Users, TrendingUp, CalendarRange, Fuel, AlertTriangle, IndianRupee } from 'lucide-react';
import { getMileageInsights } from '../utils/mileageCalculator';
import { useTranslation } from '../utils/translationUtils';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showChatbot, setShowChatbot] = useState(false);
  const [loading, setLoading] = useState(true);

  // Translate page title and subtitle
  const dashboardTitle = useTranslation('Dashboard');
  const lastUpdatedText = useTranslation('Last updated');
  const totalTripsLabel = useTranslation('Total Trips');
  const totalDistanceLabel = useTranslation('Total Distance');
  const averageMileageLabel = useTranslation('Average Mileage');
  const totalFuelUsedLabel = useTranslation('Total Fuel Used');
  const bestVehicleLabel = useTranslation('Best Vehicle');
  const bestDriverLabel = useTranslation('Best Driver');
  const potentialSavingsLabel = useTranslation('Potential Savings');
  const aiInsightsLabel = useTranslation('AI Insights');
  
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

  // Translation for formatted date
  const formattedDate = format(new Date(), 'MMMM dd, yyyy HH:mm');
  const formattedDateWithLabel = `${lastUpdatedText}: ${formattedDate}`;
  
  return (
    <Layout 
      title={dashboardTitle}
      subtitle={formattedDateWithLabel}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={totalTripsLabel}
            value={stats.totalTrips}
            icon={<BarChart className="h-5 w-5 text-primary-600" />}
            trend={{
              value: 12,
              label: useTranslation("vs last month"),
              isPositive: true
            }}
          />
          
          <StatCard
            title={totalDistanceLabel}
            value={stats.totalDistance.toLocaleString()}
            subtitle="km"
            icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
          />
          
          <StatCard
            title={averageMileageLabel}
            value={stats.avgMileage ? stats.avgMileage.toFixed(2) : "-"}
            subtitle="km/L"
            icon={<Calculator className="h-5 w-5 text-primary-600" />}
          />
          
          <StatCard
            title={totalFuelUsedLabel}
            value={stats.totalFuel.toLocaleString()}
            subtitle="L"
            icon={<Fuel className="h-5 w-5 text-primary-600" />}
          />
        </div>

        {/* Mileage Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bestVehicle && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{bestVehicleLabel}</h3>
                <Truck className="h-6 w-6 text-success-500" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{bestVehicle.registration_number}</p>
                <p className="text-sm text-gray-500">{bestVehicle.make} {bestVehicle.model}</p>
                <p className="mt-2 text-success-600 font-medium">
                  {stats.bestVehicleMileage?.toFixed(2)} km/L
                </p>
              </div>
            </div>
          )}

          {bestDriver && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{bestDriverLabel}</h3>
                <Users className="h-6 w-6 text-success-500" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{bestDriver.name}</p>
                <p className="text-sm text-gray-500">{useTranslation("License")}: {bestDriver.license_number}</p>
                <p className="mt-2 text-success-600 font-medium">
                  {stats.bestDriverMileage?.toFixed(2)} km/L
                </p>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{potentialSavingsLabel}</h3>
              <IndianRupee className="h-6 w-6 text-success-500" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-success-600">₹{stats.estimatedFuelSaved.toLocaleString()}</p>
              <p className="text-sm text-gray-500">{useTranslation("Estimated monthly savings with best practices")}</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <div className="ml-3">
                <h3 className="text-blue-800 font-medium">{aiInsightsLabel}</h3>
                <div className="mt-2 text-blue-700 text-sm">
                  <p>
                    {useTranslation("Our AI analysis suggests the following insights:")}
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{useTranslation("The average fuel efficiency across your fleet is")} {stats.avgMileage ? stats.avgMileage.toFixed(2) : "calculating"} km/L</li>
                    {bestDriver && (
                      <li>{bestDriver.name} {useTranslation("is your most efficient driver with")} {stats.bestDriverMileage?.toFixed(2)} km/L {useTranslation("average")}</li>
                    )}
                    {bestVehicle && (
                      <li>{bestVehicle.registration_number} {useTranslation("shows the best fuel economy at")} {stats.bestVehicleMileage?.toFixed(2)} km/L</li>
                    )}
                    {stats.estimatedFuelSaved > 0 && (
                      <li>{useTranslation("Potential monthly savings of")} ₹{stats.estimatedFuelSaved.toLocaleString()} {useTranslation("by adopting best practices")}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
            </div>
            
            <div className="lg:col-span-1">
              {/* Chatbot placeholder */}
            </div>
          </div>
        )}
      </div>
      )}
    </Layout>
  );
};

export default DashboardPage;