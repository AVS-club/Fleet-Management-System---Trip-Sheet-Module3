import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { Vehicle } from "../types"; // Import the Vehicle interface

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
} from "../utils/storage";
import { supabase } from "../utils/supabaseClient";
import {
  Truck,
  Calendar, PenTool as PenToolIcon, PlusCircle, FileText,
  AlertTriangle, FileCheck, TrendingUp, Archive, MessageSquare
} from "lucide-react";
import Button from "../components/ui/Button";
import VehicleForm from "../components/vehicles/VehicleForm";
import { toast } from "react-toastify";
import StatCard from "../components/dashboard/StatCard";
import DocumentSummaryPanel from "../components/vehicles/DocumentSummaryPanel";
import VehicleWhatsAppShareModal from "../components/vehicles/VehicleWhatsAppShareModal";
import VehicleSummaryChips from "../components/vehicles/VehicleSummaryChips";
import WhatsAppButton from "../components/vehicles/WhatsAppButton";

const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([]);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedVehicleForShare, setSelectedVehicleForShare] = useState<Vehicle | null>(null);
  const [contactNumber, setContactNumber] = useState<string>("9876543210"); // Default fallback number

  // Stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [vehiclesZeroTrips, setVehiclesZeroTrips] = useState(0);
  const [avgOdometer, setAvgOdometer] = useState(0);
  const [docsPendingVehicles, setDocsPendingVehicles] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setStatsLoading(true);
      try {
        const [vehiclesData, tripsData] = await Promise.all([
          getVehicles(),
          getTrips(),
        ]);

        const vehiclesArray = Array.isArray(vehiclesData) ? vehiclesData : [];

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

        // Calculate average odometer reading (for active vehicles)
        const totalOdometer = activeVehicles.reduce(
          (sum, vehicle) => sum + (vehicle.current_odometer || 0),
          0
        );
        setAvgOdometer(
          activeVehicles.length > 0
            ? Math.round(totalOdometer / activeVehicles.length)
            : 0
        );

        // Calculate vehicles with documents pending
        const docsPendingCount = activeVehicles.filter((vehicle) => {
          // Check for actual document paths instead of boolean flags
          const docsCount = [
            vehicle.rc_document_path,
            vehicle.insurance_document_path,
            vehicle.fitness_document_path,
            vehicle.tax_document_path,
            vehicle.permit_document_path,
            vehicle.puc_document_path,
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
    if (vehicle.rc_document_path) uploaded++;
    if (vehicle.insurance_document_path) uploaded++;
    if (vehicle.fitness_document_path) uploaded++;
    if (vehicle.tax_document_path) uploaded++;
    if (vehicle.permit_document_path) uploaded++;
    if (vehicle.puc_document_path) uploaded++;

    return { uploaded, total };
  };
  
  // Open WhatsApp share modal
  const handleOpenShareModal = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setSelectedVehicleForShare(vehicle);
    setShowShareModal(true);
    
    // Set contact number (use a real contact number here if available)
    // For example, get it from the primary driver if assigned
    if (vehicle.primary_driver_id) {
      // This is placeholder logic - in a real app, you would fetch the driver's contact
      // For now we'll use the default fallback number set in state
    }
  };

  // Filter vehicles based on archived status
  const filteredVehicles = vehicles.filter((v) =>
    showArchived ? v.status === "archived" : v.status !== "archived"
  );

  return (
    <Layout
      title="Vehicles"
      subtitle="Manage your fleet vehicles"
      actions={
        !isAddingVehicle && (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDocumentPanel(true)}
              icon={<FileText className="h-4 w-4" />}
              size="sm"
              title="Vehicle Document Summary"
            />

            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
              icon={<Archive className="h-4 w-4" />}
              size="sm"
              title={
                showArchived ? "Show Active Vehicles" : "Show Archived Vehicles"
              }
            />

            <Button
              onClick={() => setIsAddingVehicle(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              Add New Vehicle
            </Button>
          </div>
        )
      }
    >
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
                    title="Average Odometer"
                    value={avgOdometer.toLocaleString()}
                    subtitle="km"
                    icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
                  />

                  <StatCard
                    title="Documents Pending"
                    value={docsPendingVehicles}
                    icon={<FileCheck className="h-5 w-5 text-error-600" />}
                    warning={docsPendingVehicles > 0}
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
                      <VehicleSummaryChips vehicle={vehicle} className="mt-3" />
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

                      {/* Documents and WhatsApp Section */}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-500">Docs:</span>
                          <span className={`ml-1 text-xs font-medium px-2 py-1 rounded-full ${
                            uploaded === total
                              ? "bg-success-100 text-success-800"
                              : uploaded === 0
                              ? "bg-error-100 text-error-800"
                              : "bg-warning-100 text-warning-800"
                          }`}>
                            {uploaded}/{total}
                          </span>
                        </div>
                        
                        <WhatsAppButton
                          phoneNumber={contactNumber}
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
          contactNumber={contactNumber}
        />
      )}
    </Layout>
  );
};

export default VehiclesPage;