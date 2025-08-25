import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { Vehicle, Driver, Trip } from "../types"; // Import the Vehicle interface

interface VehicleWithStats extends Vehicle {
  stats: {
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
  };
}

import {
  getVehicles,
  getAllVehicleStats,
  createVehicle,
  getTrips,
  getDrivers,
} from "../utils/storage";
import { supabase } from "../utils/supabaseClient";
import { uploadVehicleDocument } from "../utils/supabaseStorage";
import { format, parseISO, isValid } from "date-fns";
import {
  Truck, Users,
  Calendar,
  PenTool as PenToolIcon,
  PlusCircle,
  FileText,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Archive,
  MessageSquare,
  Medal,
  MapPin,
  NotebookTabs,
  Route,
  X,
  User,
  Fuel,
} from "lucide-react";
import Button from "../components/ui/Button";
import VehicleForm from "../components/vehicles/VehicleForm";
import { toast } from "react-toastify";
import StatCard from "../components/ui/StatCard";
import DocumentSummaryPanel from "../components/vehicles/DocumentSummaryPanel";
import VehicleWhatsAppShareModal from "../components/vehicles/VehicleWhatsAppShareModal";
import VehicleSummaryChips from "../components/vehicles/VehicleSummaryChips";
import WhatsAppButton from "../components/vehicles/WhatsAppButton";
import TopDriversModal from "../components/vehicles/TopDriversModal";
import VehicleActivityLogTable from "../components/admin/VehicleActivityLogTable";

const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTopDriversModal, setShowTopDriversModal] = useState(false);
  const [selectedVehicleForShare, setSelectedVehicleForShare] =
    useState<Vehicle | null>(null);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [selectedVehicleForLog, setSelectedVehicleForLog] = useState<Vehicle | null>(null);
  const [topDriverLogic, setTopDriverLogic] = useState<'cost_per_km' | 'mileage' | 'trips'>('mileage');

  // Create a drivers lookup map for efficient driver assignment display
  const driversById = useMemo(() => {
    const map: Record<string, Driver> = {};
    if (Array.isArray(drivers)) {
      drivers.forEach(driver => {
        if (driver.id) {
          map[driver.id] = driver;
        }
      });
    }
    return map;
  }, [drivers]);

  // Stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [vehiclesZeroTrips, setVehiclesZeroTrips] = useState(0);
  const [docsPendingVehicles, setDocsPendingVehicles] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setStatsLoading(true);
      try {
        // const userdetails = localStorage.getItem("user");
        // if (!userdetails) throw new Error("Cannot get user details");
        // const user = JSON.parse(userdetails);
        // if (user) setUser(user);
        const [vehiclesData, driversData, tripsData] = await Promise.all([
          getVehicles(),
          getDrivers(), // TODO: Ensure this fetches ALL drivers including inactive/archived ones for proper driver assignment display
          getTrips(),
        ]);

        const vehiclesArray = Array.isArray(vehiclesData) ? vehiclesData : [];
        const driversArray = Array.isArray(driversData) ? driversData : [];
        const tripsArray = Array.isArray(tripsData) ? tripsData : [];

        // Debug: Log driver count and any missing assignments
        console.log('Fetched drivers count:', driversArray.length);
        const vehiclesWithDriverIds = vehiclesArray.filter(v => v.primary_driver_id);
        const missingDriverAssignments = vehiclesWithDriverIds.filter(v => 
          !driversArray.find(d => d.id === v.primary_driver_id)
        );
        if (missingDriverAssignments.length > 0) {
          console.warn('Vehicles with missing driver assignments:', missingDriverAssignments.map(v => ({
            vehicle: v.registration_number,
            primary_driver_id: v.primary_driver_id
          })));
        }
        setDrivers(driversArray);
        setTrips(tripsArray);

        const statsMap = await getAllVehicleStats(tripsArray);
        const vehiclesWithStats = vehiclesArray.map((vehicle) => ({
          ...vehicle,
          stats:
            statsMap[vehicle.id] ?? {
              totalTrips: 0,
              totalDistance: 0,
              averageKmpl: undefined,
            },
          selected: false,
        }));

        setVehicles(vehiclesWithStats);

        // Calculate statistics
        const activeVehicles = vehiclesArray.filter(
          (v) => v.status !== "archived"
        );
        setTotalVehicles(activeVehicles.length);

        // Calculate vehicles with zero trips
        const vehiclesWithTrips = new Set();
        if (Array.isArray(tripsData)) {
          tripsData.forEach((trip) => {
            if (trip.vehicle_id) {
              vehiclesWithTrips.add(trip.vehicle_id);
            }
          });
        }

        const zeroTripsCount = activeVehicles.filter(
          (vehicle) => !vehiclesWithTrips.has(vehicle.id)
        ).length;
        setVehiclesZeroTrips(zeroTripsCount);

        // Calculate vehicles with documents pending
        const docsPendingCount = activeVehicles.filter((vehicle) => {
          // Check for actual document paths instead of boolean flags
          const docsCount = [
            vehicle.rc_document_url,
            vehicle.insurance_document_url,
            vehicle.fitness_document_url,
            vehicle.tax_document_url,
            vehicle.permit_document_url,
            vehicle.puc_document_url,
          ].filter(Boolean).length;

          return docsCount < 6;
        }).length;

        setDocsPendingVehicles(docsPendingCount);

        setStatsLoading(false);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles");
        setStatsLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate Average Distance This Month
  const averageDistanceThisMonth = useMemo(() => {
    if (!Array.isArray(trips)) return 0;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Filter trips for the current month
    const tripsThisMonth = trips.filter((trip) => {
      const tripDate = new Date(trip.trip_start_date);
      return (
        tripDate.getMonth() === currentMonth &&
        tripDate.getFullYear() === currentYear
      );
    });

    if (tripsThisMonth.length === 0) return 0;

    // Calculate total distance
    const totalDistance = tripsThisMonth.reduce(
      (sum, trip) => sum + (trip.end_km - trip.start_km),
      0
    );

    // Get unique vehicles that had trips this month
    const uniqueVehicles = new Set(tripsThisMonth.map((t) => t.vehicle_id));

    // Calculate average
    return totalDistance / uniqueVehicles.size;
  }, [trips]);

  // Calculate Top Driver This Month
  const topDriversThisMonth = useMemo(() => {
    if (!Array.isArray(trips) || !Array.isArray(drivers)) return [];

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Filter trips for the current month with refueling data (for mileage calculation)
    const tripsThisMonth = trips.filter((trip) => {
      const tripDate = new Date(trip.trip_start_date);
      return (
        tripDate.getMonth() === currentMonth &&
        tripDate.getFullYear() === currentYear &&
        trip.calculated_kmpl !== undefined &&
        trip.calculated_kmpl > 0
      );
    });

    if (tripsThisMonth.length === 0) return [];

    // Group trips by driver and calculate average mileage for each
    const driverPerformance = tripsThisMonth.reduce((acc, trip) => {
      if (!trip.driver_id || !trip.calculated_kmpl) return acc;

      if (!acc[trip.driver_id]) {
        acc[trip.driver_id] = {
          tripCount: 0,
          totalMileage: 0,
        };
      }

      acc[trip.driver_id].tripCount += 1;
      acc[trip.driver_id].totalMileage += trip.calculated_kmpl;

      return acc;
    }, {} as Record<string, { tripCount: number; totalMileage: number }>);

    // Calculate average mileage for each driver
    const driverMileages = Object.entries(driverPerformance).map(
      ([driverId, data]) => {
        const driver = drivers.find((d) => d.id === driverId);
        return {
          id: driverId,
          name: driver?.name || "Unknown Driver",
          mileage: data.tripCount > 0 ? data.totalMileage / data.tripCount : 0,
        };
      }
    );

    // Sort by mileage (highest first) and take top 5
    return driverMileages.sort((a, b) => b.mileage - a.mileage).slice(0, 5);
  }, [trips, drivers]);

  // Get the top driver (if any)
  const topDriver =
    topDriversThisMonth.length > 0 ? topDriversThisMonth[0] : null;

  const handleAddVehicle = async (data: Omit<Vehicle, "id">) => {
    setIsSubmitting(true);
    try {
      const uploadMap = {
        rc_copy_file: { urlField: "rc_document_url", docType: "rc" },
        insurance_document_file: {
          urlField: "insurance_document_url",
          docType: "insurance",
        },
        fitness_document_file: {
          urlField: "fitness_document_url",
          docType: "fitness",
        },
        tax_receipt_document_file: {
          urlField: "tax_document_url",
          docType: "tax",
        },
        permit_document_file: {
          urlField: "permit_document_url",
          docType: "permit",
        },
        puc_document_file: { urlField: "puc_document_url", docType: "puc" },
      } as const;

      const payload: any = { ...data };

      for (const [fileField, { urlField, docType }] of Object.entries(uploadMap)) {
        const files = payload[fileField] as File[] | undefined;
        if (files && files.length > 0) {
          try {
            const filePath = await uploadVehicleDocument(
              files[0],
              payload.registration_number,
              docType
            );
            payload[urlField] = [filePath]; // Ensure it's wrapped in an array
          } catch (err) {
            console.error(`Failed to upload ${docType} document:`, err);
            toast.error(`Failed to upload ${docType} document`);
          }
        }
        delete payload[fileField];
      }

      const newVehicle = await createVehicle(payload);
      if (newVehicle) {
        const rawStats = await getVehicleStats(newVehicle.id);
        const conformingStats = {
          totalTrips:
            rawStats && typeof rawStats.totalTrips === "number"
              ? rawStats.totalTrips
              : 0,
          totalDistance:
            rawStats && typeof rawStats.totalDistance === "number"
              ? rawStats.totalDistance
              : 0,
          averageKmpl:
            rawStats && typeof rawStats.averageKmpl === "number"
              ? rawStats.averageKmpl
              : undefined,
        };
        const vehicleWithStats: VehicleWithStats = {
          ...newVehicle,
          stats: conformingStats,
        };
        setVehicles((prev) =>
          Array.isArray(prev) ? [...prev, vehicleWithStats] : [vehicleWithStats]
        );
        setTotalVehicles((prev) => prev + 1);
        setIsAddingVehicle(false);
        toast.success("Vehicle added successfully");
      } else {
        toast.error("Failed to add vehicle");
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error(
        "Error adding vehicle: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to count uploaded documents - updated to check for actual file paths
  const countDocuments = (
    vehicle: Vehicle
  ): { uploaded: number; total: number } => {
    let uploaded = 0;
    const total = 6; // RC, Insurance, Fitness, Tax, Permit, PUC

    // Check for actual document paths instead of boolean flags
    if (vehicle.rc_document_url) uploaded++;
    if (vehicle.insurance_document_url) uploaded++;
    if (vehicle.fitness_document_url) uploaded++;
    if (vehicle.tax_document_url) uploaded++;
    if (vehicle.permit_document_url) uploaded++;
    if (vehicle.puc_document_url) uploaded++;

    return { uploaded, total };
  };

  // Open WhatsApp share modal
  const handleOpenShareModal = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setSelectedVehicleForShare(vehicle);
    setShowShareModal(true);
  };

  // Open activity log modal
  const handleOpenLog = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVehicleForLog(vehicle);
    setShowActivityLogModal(true);
  };

  // Handle add trip with vehicle preselected
  const handleAddTrip = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/trips', { state: { preselectedVehicle: vehicle.id } });
  };

  // Find the latest trip for a vehicle
  const getLatestTrip = (vehicleId: string): Trip | undefined => {
    return Array.isArray(trips)
      ? trips
          .filter((t) => t.vehicle_id === vehicleId)
          .sort(
            (a, b) =>
              new Date(b.trip_end_date).getTime() -
              new Date(a.trip_end_date).getTime()
          )[0]
      : undefined;
  };

  // Format date helper function
  const formatDate = (dateString?: string): string | null => {
    if (!dateString) return null;

    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;

      return format(date, "dd MMM yyyy");
    } catch (error) {
      return null;
    }
  };

  // Filter vehicles based on archived status
  const filteredVehicles = vehicles.filter((v) =>
    showArchived ? v.status === "archived" : v.status !== "archived"
  );

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Truck className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Vehicles</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Manage your fleet vehicles</p>
        {!isAddingVehicle && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDocumentPanel(true)}
              icon={<FileText className="h-4 w-4" />}
              size="sm"
              title="Vehicle Document Summary"
            >
              Document Summary
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
              icon={<Archive className="h-4 w-4" />}
              size="sm"
              title={
                showArchived ? "Show Active Vehicles" : "Show Archived Vehicles"
              }
            >
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>

            <Button
              onClick={() => setIsAddingVehicle(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              Add New Vehicle
            </Button>
          </div>
        )}
      </div>

      {isAddingVehicle ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Truck className="h-5 w-5 mr-2 text-primary-500" />
              New Vehicle
            </h2>

            <Button variant="outline" onClick={() => setIsAddingVehicle(false)}>
              Cancel
            </Button>
          </div>

          <VehicleForm
            onSubmit={handleAddVehicle}
            isSubmitting={isSubmitting}
            onCancel={() => setIsAddingVehicle(false)}
          />
        </div>
      ) : (
        <>
          {/* Vehicle Stats Section */}
          {!showArchived && (
            <>
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg shadow-sm p-6 animate-pulse"
                    >
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 w-16 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    title="Total Vehicles"
                    value={totalVehicles}
                    icon={<Truck className="h-5 w-5 text-primary-600" />}
                  />

                  <StatCard
                    title="Vehicles with 0 Trips"
                    value={vehiclesZeroTrips}
                    icon={<Calendar className="h-5 w-5 text-warning-600" />}
                    warning={vehiclesZeroTrips > 0}
                  />

                  <StatCard
                    title="Top Driver (This Month)"
                    className="cursor-pointer"
                    value={
                      topDriver ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold">
                              {topDriver.name.split(" ")[0]}
                            </span>
                            <select
                              value={topDriverLogic}
                              onChange={(e) => setTopDriverLogic(e.target.value as 'cost_per_km' | 'mileage' | 'trips')}
                              className="text-xs border-0 bg-transparent focus:ring-0 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="mileage">Best Mileage</option>
                              <option value="cost_per_km">Best Cost/KM</option>
                              <option value="trips">Most Trips</option>
                            </select>
                          </div>
                          <span className="text-xs text-gray-500 block">
                            {topDriverLogic === 'mileage' && `${topDriver.mileage.toFixed(1)} km/L`}
                            {topDriverLogic === 'cost_per_km' && `₹${topDriver.costPerKm.toFixed(2)}/km`}
                            {topDriverLogic === 'trips' && `${topDriver.tripCount} trips`}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-yellow-600 italic text-sm">No data yet</span>
                          <select
                            value={topDriverLogic}
                            onChange={(e) => setTopDriverLogic(e.target.value as 'cost_per_km' | 'mileage' | 'trips')}
                            className="text-xs border-0 bg-transparent focus:ring-0 p-0 text-gray-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="mileage">Best Mileage</option>
                            <option value="cost_per_km">Best Cost/KM</option>
                            <option value="trips">Most Trips</option>
                          </select>
                        </div>
                      )
                    }
                    icon={<Medal className="h-5 w-5 text-yellow-500" />}
                    onClick={() =>
                      topDriversThisMonth.length > 0 &&
                      setShowTopDriversModal(true)
                    }
                    className={
                      topDriversThisMonth.length > 0 ? "cursor-pointer" : ""
                    }
                  />

                  <StatCard
                    title="Average Distance This Month"
                    value={Math.round(
                      averageDistanceThisMonth
                    ).toLocaleString()}
                    subtitle="km"
                    icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
                  />
                </div>
              )}
            </>
          )}

          {showArchived && (
            <div className="bg-gray-100 border-l-4 border-warning-500 p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-6 w-6 text-warning-500 mr-2" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Viewing Archived Vehicles
                  </h3>
                  <p className="text-warning-700">
                    You are currently viewing archived vehicles. These vehicles
                    are hidden from other parts of the system.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="ml-3 text-gray-600">Loading vehicles...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">
                {showArchived
                  ? "No archived vehicles found."
                  : "No vehicles found. Add your first vehicle to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle) => {
                // Count documents using actual document paths
                const { uploaded, total } = countDocuments(vehicle);

                // Get the assigned driver using the driversById lookup
                const assignedDriver = vehicle.primary_driver_id 
                  ? driversById[vehicle.primary_driver_id] 
                  : undefined;

                // Get the latest trip for this vehicle
                const latestTrip = getLatestTrip(vehicle.id);
                const lastTripDate = latestTrip
                  ? formatDate(latestTrip.trip_end_date)
                  : null;

                return (
                  <div
                    key={vehicle.id}
                    className={`bg-white rounded-lg shadow-sm p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative ${
                      vehicle.status === "archived" ? "opacity-75" : ""
                    }`}
                  >
                    {/* Header: Registration, Status, Action Buttons */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate" 
                            title={`${vehicle.registration_number} - Current Odometer: ${vehicle.current_odometer?.toLocaleString()} km`}>
                          {vehicle.registration_number}
                        </h3>
                        <p className="text-sm text-gray-500 truncate" title={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}>
                          {vehicle.make} {vehicle.model}
                          {vehicle.tax_scope && 
                           (vehicle.tax_scope.toLowerCase().includes('ltt') || 
                            vehicle.tax_scope.toLowerCase().includes('lifetime')) && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full dark:bg-green-900 dark:text-green-200" title="This vehicle has lifetime tax paid">
                              Lifetime Tax
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                            vehicle.status === "active"
                              ? "bg-success-100 text-success-800"
                              : vehicle.status === "maintenance"
                              ? "bg-warning-100 text-warning-800"
                              : vehicle.status === "archived"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {vehicle.status}
                        </span>
                      </div>
                    </div>

                    {/* Pills Row: Year + Fuel */}
                    <div className="flex gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        <Calendar className="h-3 w-3 mr-1" />
                        {vehicle.year}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 capitalize">
                        <Fuel className="h-3 w-3 mr-1" />
                        {vehicle.fuel_type}
                      </span>
                    </div>

                    {/* Driver Assignment */}
                    <div className="mb-3">
                      <div className="flex items-center text-sm">
                        {assignedDriver ? (
                          <>
                            <span className="mr-1">👤</span>
                            <span className="text-gray-700 truncate">{assignedDriver.name}</span>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-gray-400">Unassigned</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <span className="text-xs text-gray-500 block">
                            Trips
                          </span>
                          <p className="font-mono text-sm font-medium">{vehicle.stats.totalTrips}</p>
                        </div>

                        <div className="text-center">
                          <span className="text-xs text-gray-500 block">
                            Distance
                          </span>
                          <p className="font-mono text-sm font-medium">
                            {typeof vehicle.stats.totalDistance === "number"
                              ? vehicle.stats.totalDistance.toLocaleString()
                              : "—"}
                          </p>
                        </div>

                        <div className="text-center">
                          <span className="text-xs text-gray-500 block">
                            Avg KMPL
                          </span>
                          <p className="font-mono text-sm font-medium">
                            {vehicle.stats.averageKmpl?.toFixed(1) || "—"}
                          </p>
                        </div>
                    </div>

                    {/* Documents Status */}
                    <div className="flex items-center justify-between mb-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500">Docs:</span>
                        <span
                          className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            uploaded === total
                              ? "bg-success-100 text-success-800"
                              : uploaded === 0
                              ? "bg-error-100 text-error-800"
                              : "bg-warning-100 text-warning-800"
                          }`}
                        >
                          {uploaded}/{total}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          onClick={(e) => handleOpenLog(vehicle, e)}
                          aria-label="View activity log"
                          title="View activity log"
                        >
                          <NotebookTabs className="h-4 w-4" />
                        </button>
                        
                        <button
                          className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={(e) => handleAddTrip(vehicle, e)}
                          aria-label="Add trip with this vehicle"
                          title="Add trip with this vehicle"
                        >
                          <Route className="h-4 w-4" />
                        </button>
                        
                        <button
                          className="p-1.5 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          onClick={(e) => handleOpenShareModal(vehicle, e)}
                          aria-label="Share vehicle via WhatsApp"
                          title="Share vehicle via WhatsApp"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Document Summary Panel */}
      <DocumentSummaryPanel
        isOpen={showDocumentPanel}
        onClose={() => setShowDocumentPanel(false)}
      />

      {/* WhatsApp Share Modal */}
      {showShareModal && selectedVehicleForShare && (
        <VehicleWhatsAppShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          vehicle={selectedVehicleForShare}
        />
      )}

      {/* Top Drivers Modal */}
      <TopDriversModal
        isOpen={showTopDriversModal}
        onClose={() => setShowTopDriversModal(false)}
        topDrivers={topDriversThisMonth}
      />

      {/* Activity Log Modal */}
      {showActivityLogModal && selectedVehicleForLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Activity Log - {selectedVehicleForLog.registration_number}
              </h3>
              <button
                onClick={() => {
                  setShowActivityLogModal(false);
                  setSelectedVehicleForLog(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <VehicleActivityLogTable vehicleId={selectedVehicleForLog.id} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default VehiclesPage;