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
  getVehicleStats,
  createVehicle,
  getTrips,
  getDrivers,
} from "../utils/storage";
import { supabase } from "../utils/supabaseClient";
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
  User,
  Medal,
  MapPin,
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
  // const [user, setUser] = useState<any>();

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
          getDrivers(),
          getTrips(),
        ]);

        const vehiclesArray = Array.isArray(vehiclesData) ? vehiclesData : [];
        const driversArray = Array.isArray(driversData) ? driversData : [];
        const tripsArray = Array.isArray(tripsData) ? tripsData : [];

        setDrivers(driversArray);
        setTrips(tripsArray);

        // Fetch stats for each vehicle
        const vehiclesWithStats = await Promise.all(
          vehiclesArray.map(async (vehicle) => {
            const stats = await getVehicleStats(vehicle.id);
            return { ...vehicle, stats, selected: false };
          })
        );

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
      const newVehicle = await createVehicle(data);
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
                    value={
                      topDriver ? (
                        <div className="flex flex-col">
                          <span className="text-lg">
                            {topDriver.name.split(" ")[0]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {topDriver.mileage.toFixed(1)} km/L
                          </span>
                        </div>
                      ) : (
                        <span className="text-yellow-600 italic">No data yet</span>
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
                  <h3 className="text-warning-800 font-medium">
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

                // Get the assigned driver
                const assignedDriver = vehicle.primary_driver_id
                  ? drivers.find((d) => d.id === vehicle.primary_driver_id)
                  : undefined;

                // Get the latest trip for this vehicle
                const latestTrip = getLatestTrip(vehicle.id);
                const lastTripDate = latestTrip
                  ? formatDate(latestTrip.trip_end_date)
                  : null;

                return (
                  <div
                    key={vehicle.id}
                    className={`bg-white rounded-lg shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow ${
                      vehicle.status === "archived" ? "opacity-75" : ""
                    }`}
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                  >
                    {/* Vehicle Photo (top-right) */}
                    <div className="absolute top-10 right-3">
                      {vehicle.photo_url ? (
                        <img
                          src={vehicle.photo_url}
                          alt={vehicle.registration_number}
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                          <Truck className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="pr-20">
                      {/* Vehicle Title & Status Section */}
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium text-gray-900">
                          {vehicle.registration_number}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
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

                      {/* VehicleSummaryChips Component */}
                      <VehicleSummaryChips vehicle={vehicle} className="mt-2" />

                      {/* Odometer reading with Last Trip Date */}
                      <div className="mt-2 flex flex-wrap items-center text-sm text-gray-600">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                        <span>
                          {vehicle.current_odometer?.toLocaleString() || 0} km
                        </span>
                        {lastTripDate && (
                          <span className="ml-1 text-xs text-gray-500">
                            • {lastTripDate}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trip Stats Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <Truck className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                          <span className="text-sm text-gray-500 block">
                            Trips
                          </span>
                          <p className="font-medium">
                            {vehicle.stats.totalTrips}
                          </p>
                        </div>

                        <div className="text-center">
                          <Calendar className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                          <span className="text-sm text-gray-500 block">
                            Distance
                          </span>
                          <p className="font-medium">
                            {typeof vehicle.stats.totalDistance === "number"
                              ? vehicle.stats.totalDistance.toLocaleString()
                              : "N/A"}
                          </p>
                        </div>

                        <div className="text-center">
                          <PenToolIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                          <span className="text-sm text-gray-500 block">
                            Avg KMPL
                          </span>
                          <p className="font-medium">
                            {vehicle.stats.averageKmpl?.toFixed(1) || "-"}
                          </p>
                        </div>
                      </div>

                      {/* Documents, Driver, and WhatsApp Section */}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-y-2">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-500">Docs:</span>
                          <span
                            className={`ml-1 text-xs font-medium px-2 py-1 rounded-full ${
                              uploaded === total
                                ? "bg-success-100 text-success-800"
                                : uploaded === 0
                                ? "bg-error-100 text-error-800"
                                : "bg-warning-100 text-warning-800" // Partial upload
                            }`}
                          >
                            {uploaded}/{total}
                          </span>
                        </div>

                        {/* Assigned Driver Display */}
                        <div className="flex items-center mx-1">
                          <User className="h-4 w-4 text-gray-400 mr-1" />
                          <span
                            className="text-xs text-gray-600 truncate max-w-[100px]"
                            title={assignedDriver?.name}
                          >
                            {assignedDriver ? (
                              assignedDriver.name
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </span>
                        </div>

                        <WhatsAppButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenShareModal(vehicle, e);
                          }}
                          className="text-green-600 hover:text-green-800"
                          variant="ghost"
                        />
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
    </Layout>
  );
};

export default VehiclesPage;
