import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import {
  getDrivers,
  getTrips,
  createDriver,
  updateDriver,
  uploadDriverPhoto,
} from "../utils/storage";
import { supabase } from "../utils/supabaseClient";
import {
  User,
  Truck,
  MapPin,
  PlusCircle,
  Edit2,
  Users,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";
import Button from "../components/ui/Button";
import DriverForm from "../components/drivers/DriverForm";
import { Driver, Trip } from "../types";
import { toast } from "react-toastify";
import StatCard from "../components/dashboard/StatCard";
import NotificationsButton from "../components/common/NotificationsButton";

const DriversPage: React.FC = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [inactiveDrivers, setInactiveDrivers] = useState(0);
  const [avgExperience, setAvgExperience] = useState(0);
  const [driversWithExpiringLicense, setDriversWithExpiringLicense] =
    useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setStatsLoading(true);
      try {
        const [driversData, tripsData] = await Promise.all([
          getDrivers(),
          getTrips(),
        ]);

        const driversArray = Array.isArray(driversData) ? driversData : [];
        setDrivers(driversArray);
        setTrips(Array.isArray(tripsData) ? tripsData : []);

        // Calculate statistics
        setTotalDrivers(driversArray.length);

        const active = driversArray.filter((d) => d.status === "active").length;
        setActiveDrivers(active);

        const inactive = driversArray.filter(
          (d) => d.status === "inactive"
        ).length;
        setInactiveDrivers(inactive);

        // Calculate average experience
        const totalExperience = driversArray.reduce(
          (sum, driver) => sum + (driver.experience_years || 0),
          0
        );
        setAvgExperience(
          driversArray.length > 0
            ? Math.round((totalExperience / driversArray.length) * 10) / 10
            : 0
        );

        // Calculate drivers with expiring license (within 30 days)
        const today = new Date();
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const expiringLicenses = driversArray.filter((driver) => {
          if (!driver.license_expiry_date) return false;

          const expiryDate = new Date(driver.license_expiry_date);
          return expiryDate > today && expiryDate <= thirtyDaysFromNow;
        }).length;

        setDriversWithExpiringLicense(expiringLicenses);

        setStatsLoading(false);
      } catch (error) {
        console.error("Error fetching drivers data:", error);
        toast.error("Failed to load drivers");
        setStatsLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  console.log("jkj");
  const handleSaveDriver = async (data: Omit<Driver, "id">) => {
    setIsSubmitting(true);
    try {
      let photoUrl = editingDriver?.driver_photo_url;

      // Handle photo upload if a new photo is provided
      if (data.photo && data.photo instanceof File) {
        try {
          // For new drivers, we'll use a temporary ID until we get the real one
          const tempId = editingDriver?.id || `temp-${Date.now()}`;
          photoUrl = await uploadDriverPhoto(data.photo, tempId);
        } catch (error) {
          console.error("Error uploading photo:", error);
          toast.error(
            "Failed to upload photo, but continuing with driver save"
          );
        }
      }

      // Prepare driver data with photo URL
      const driverData = {
        ...data,
        driver_photo_url: photoUrl,
      };

      // Remove the File object as it can't be stored in the database
      delete (driverData as any).photo;

      // Process other documents
      if (Array.isArray(driverData.other_documents)) {
        const processedDocs = [];

        for (const doc of driverData.other_documents) {
          const processedDoc: any = {
            name: doc.name,
            issue_date: doc.issue_date,
          };

          // Handle file upload for each document
          if (doc.file_obj instanceof File) {
            try {
              const fileId =
                editingDriver?.id ||
                `temp-${Date.now()}-${processedDocs.length}`;
              const filePath = await uploadDriverPhoto(doc.file_obj, fileId);
              processedDoc.file_path = filePath;
            } catch (error) {
              console.error(`Error uploading document "${doc.name}":`, error);
            }
          } else if (doc.file_path) {
            processedDoc.file_path = doc.file_path;
          }

          processedDocs.push(processedDoc);
        }

        driverData.other_documents = processedDocs;
      }

      if (editingDriver) {
        // Update existing driver
        const updatedDriver = await updateDriver(editingDriver.id, driverData);
        if (updatedDriver) {
          // Update the drivers list
          setDrivers((prevDrivers) =>
            prevDrivers.map((d) =>
              d.id === updatedDriver.id ? updatedDriver : d
            )
          );
          setEditingDriver(null);
          toast.success("Driver updated successfully");
        } else {
          toast.error("Failed to update driver");
        }
      } else {
        // Create new driver
        const newDriver = await createDriver(driverData);
        if (newDriver) {
          // If we used a temporary ID for the photo, we need to update it
          if (photoUrl && photoUrl.includes("temp-")) {
            try {
              // Re-upload with the correct ID
              const finalPhotoUrl = await uploadDriverPhoto(
                data.photo as File,
                newDriver.id
              );
              await updateDriver(newDriver.id, {
                driver_photo_url: finalPhotoUrl,
              });
              newDriver.driver_photo_url = finalPhotoUrl;
            } catch (error) {
              console.error("Error updating photo with final ID:", error);
            }
          }

          // Update other documents with the correct driver ID
          if (
            Array.isArray(newDriver.other_documents) &&
            newDriver.other_documents.length > 0
          ) {
            const updatedDocs = [];

            for (const doc of newDriver.other_documents) {
              const updatedDoc = { ...doc };

              if (doc.file_path && doc.file_path.includes("temp-")) {
                try {
                  // Find the original file object
                  const originalDoc = data.other_documents?.find(
                    (d) => d.name === doc.name
                  );
                  if (originalDoc && originalDoc.file_obj) {
                    // Re-upload with the correct ID
                    const finalFilePath = await uploadDriverPhoto(
                      originalDoc.file_obj as File,
                      `${newDriver.id}-${doc.name
                        .replace(/\s+/g, "-")
                        .toLowerCase()}`
                    );
                    updatedDoc.file_path = finalFilePath;
                  }
                } catch (error) {
                  console.error(
                    `Error updating document "${doc.name}" with final ID:`,
                    error
                  );
                }
              }

              updatedDocs.push(updatedDoc);
            }

            if (updatedDocs.length > 0) {
              await updateDriver(newDriver.id, {
                other_documents: updatedDocs,
              });
              newDriver.other_documents = updatedDocs;
            }
          }

          setDrivers((prevDrivers) => [newDriver, ...prevDrivers]);
          setTotalDrivers((prev) => prev + 1);
          if (newDriver.status === "active") {
            setActiveDrivers((prev) => prev + 1);
          } else if (newDriver.status === "inactive") {
            setInactiveDrivers((prev) => prev + 1);
          }

          setIsAddingDriver(false);
          toast.success("Driver added successfully");
        } else {
          toast.error("Failed to add driver");
        }
      }
    } catch (error) {
      console.error("Error saving driver:", error);
      toast.error(`Failed to ${editingDriver ? "update" : "add"} driver`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setIsAddingDriver(false); // Ensure we're in edit mode, not add mode
  };

  const handleCancelForm = () => {
    setIsAddingDriver(false);
    setEditingDriver(null);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return "-";
    }
  };

  // Check if license is expired or expiring soon
  const getLicenseStatus = (expiryDate?: string) => {
    if (!expiryDate) return { status: "unknown", label: "Unknown" };

    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      if (expiry < now) {
        return { status: "expired", label: "Expired" };
      } else if (expiry < thirtyDaysFromNow) {
        return { status: "expiring", label: "Expiring Soon" };
      } else {
        return { status: "valid", label: "Valid" };
      }
    } catch (error) {
      return { status: "unknown", label: "Unknown" };
    }
  };

  return (
    <Layout
      title="Drivers"
      subtitle="Manage your fleet drivers"
      actions={
        !isAddingDriver &&
        !editingDriver && (
          <div className="flex flex-wrap gap-3">
            <NotificationsButton module="drivers" />
            <Button
              onClick={() => setIsAddingDriver(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              Add Driver
            </Button>
          </div>
        )
      }
    >
      {isAddingDriver || editingDriver ? (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2 text-primary-500" />
              {editingDriver ? "Edit Driver" : "New Driver"}
            </h2>

            <Button variant="outline" onClick={handleCancelForm}>
              Cancel
            </Button>
          </div>

          <DriverForm
            initialData={editingDriver || undefined}
            onSubmit={handleSaveDriver}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : (
        <>
          {/* Driver Stats Section */}
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
                title="Total Drivers"
                value={totalDrivers}
                icon={<Users className="h-5 w-5 text-primary-600" />}
              />

              <StatCard
                title="Active Drivers"
                value={activeDrivers}
                icon={<UserCheck className="h-5 w-5 text-success-600" />}
              />

              <StatCard
                title="Inactive Drivers"
                value={inactiveDrivers}
                icon={<UserX className="h-5 w-5 text-gray-600" />}
              />

              <StatCard
                title="Avg. Experience"
                value={avgExperience}
                subtitle="years"
                icon={<Clock className="h-5 w-5 text-primary-600" />}
              />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="ml-3 text-gray-600">Loading drivers...</p>
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">
                No drivers found. Add your first driver to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drivers.map((driver: Driver) => {
                const driverTrips = Array.isArray(trips)
                  ? trips.filter((trip) => trip.driver_id === driver.id)
                  : [];
                const totalDistance = driverTrips.reduce(
                  (sum, trip) => sum + (trip.end_km - trip.start_km),
                  0
                );
                const licenseStatus = getLicenseStatus(
                  driver.license_expiry_date
                );

                return (
                  <div
                    key={driver.id}
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow relative"
                  >
                    {/* Edit Button */}
                    <button
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDriver(driver);
                      }}
                      title="Edit Driver"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-start space-x-4 mb-4">
                      {/* Driver Photo */}
                      <div className="flex-shrink-0">
                        {driver.driver_photo_url ? (
                          <img
                            src={driver.driver_photo_url}
                            alt={driver.name}
                            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {driver.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {driver.license_number || "License: Not available"}
                        </p>

                        {/* License Status Badge */}
                        {driver.license_expiry_date && (
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                licenseStatus.status === "expired"
                                  ? "bg-error-100 text-error-800"
                                  : licenseStatus.status === "expiring"
                                  ? "bg-warning-100 text-warning-800"
                                  : "bg-success-100 text-success-800"
                              }`}
                            >
                              {licenseStatus.label}{" "}
                              {driver.license_expiry_date &&
                                `(${formatDate(driver.license_expiry_date)})`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-500 block">
                          Experience
                        </span>
                        <p className="font-medium">
                          {driver.experience_years} years
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 block">
                          Join Date
                        </span>
                        <p className="font-medium">
                          {formatDate(driver.join_date)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 block">
                          Contact
                        </span>
                        <p className="font-medium">{driver.contact_number}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 block">
                          Email
                        </span>
                        <p className="font-medium truncate">
                          {driver.email || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <User className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                          <span className="text-sm text-gray-500 block">
                            Trips
                          </span>
                          <p className="font-medium">{driverTrips.length}</p>
                        </div>
                        <div className="text-center">
                          <MapPin className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                          <span className="text-sm text-gray-500 block">
                            Distance
                          </span>
                          <p className="font-medium">
                            {totalDistance.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <Truck className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                          <span className="text-sm text-gray-500 block">
                            Vehicle
                          </span>
                          <p className="font-medium">
                            {driver.primary_vehicle_id ? "Assigned" : "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* View Details Link */}
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => navigate(`/drivers/${driver.id}`)}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default DriversPage;
