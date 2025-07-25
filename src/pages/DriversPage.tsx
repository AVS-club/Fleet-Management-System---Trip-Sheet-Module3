import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { 
  getDrivers, 
  getTrips, 
  createDriver, 
  updateDriver, 
  uploadDriverPhoto 
} from "../utils/storage";
import { supabase } from "../utils/supabaseClient";
import {
  User,
  Truck,
  BarChart,
  PlusCircle,
  MapPin,
  Edit2,
  Users,
  Clock,
  UserCheck,
  UserX,
  Phone,
  Calendar,
  FileText,
} from "lucide-react";
import Button from "../components/ui/Button";
import DriverForm from "../components/drivers/DriverForm";
import { Driver, Trip } from "../types";
import { toast } from "react-toastify";
import StatCard from "../components/ui/StatCard";
import WhatsAppButton from '../components/drivers/WhatsAppButton';
import DriverWhatsAppShareModal from '../components/drivers/DriverWhatsAppShareModal';
import { getSignedDriverDocumentUrl } from '../utils/supabaseStorage';

const DriversPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDriverForShare, setSelectedDriverForShare] = useState<Driver | null>(null);
  
  const [signedDocUrls, setSignedDocUrls] = useState<{
    license?: string;
    police_verification?: string;
    medical_certificate?: string;
    id_proof?: string;
    other: Record<string, string>;
  }>({ other: {} });

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
        const userdetails = localStorage.getItem("user");
        if (!userdetails) throw new Error("Cannot get user details");
        const user = JSON.parse(userdetails);
        if (user) setUser(user);
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
        const newDriver = await createDriver(driverData, user.id);
        if (newDriver) {
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
  
  // Function to handle opening the WhatsApp share modal
  const handleOpenShareModal = async (driver: Driver, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setSelectedDriverForShare(driver);
    
    // Generate signed URLs for documents if available
    const urls: {
      license?: string;
      police_verification?: string;
      medical_certificate?: string;
      id_proof?: string;
      other: Record<string, string>;
    } = {
      other: {}
    };
    
    try {
      // Generate signed URL for license document
      if (driver.license_doc_url) {
        urls.license = driver.license_doc_url;
      }
      
      // Generate signed URLs for other documents
      if (driver.other_documents && Array.isArray(driver.other_documents)) {
        for (let i = 0; i < driver.other_documents.length; i++) {
          const doc = driver.other_documents[i];
          if (doc.file_path) {
            urls.other[`other_${i}`] = await getSignedDriverDocumentUrl(doc.file_path);
          }
        }
      }
      
      setSignedDocUrls(urls);
    } catch (error) {
      console.error('Error generating signed URLs:', error);
    }
    
    setShowShareModal(true);
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
            <Button
              variant="outline"
              onClick={() => navigate('/drivers/insights')}
              icon={<BarChart className="h-4 w-4" />}
            >
              Driver Insights
            </Button>
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
            initialData={editingDriver || {}}
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
                    className={`bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow relative cursor-pointer ${
                      driver.status === 'active' ? 'border-l-4 border-green-500' : ''
                    }`}
                    onClick={() => navigate(`/drivers/${driver.id}`)}
                  >
                    {/* Edit Button */}
                    <button
                      className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDriver(driver);
                      }}
                      title="Edit Driver"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-start gap-3">
                      {/* Driver Photo */}
                      <div>
                        {driver.driver_photo_url ? (
                          <img
                            src={driver.driver_photo_url}
                            alt={driver.name}
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        {/* Driver Name & License */}
                        <h3 className="text-lg font-medium text-gray-900 pr-8">
                          {driver.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {driver.dl_number || "No license"}
                        </p>

                        {/* License Status & Experience */}
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              licenseStatus.status === "expired"
                                ? "bg-error-100 text-error-800"
                                : licenseStatus.status === "expiring"
                                ? "bg-warning-100 text-warning-800"
                                : "bg-success-100 text-success-800"
                            }`}
                          >
                            {licenseStatus.label}
                          </span>
                          
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            <Calendar className="h-3 w-3 mr-1" />
                            {driver.experience_years} years
                          </span>
                        </div>
                        
                        {/* Contact Number */}
                        {driver.contact_number && (
                          <div className="mt-2 flex items-center text-sm">
                            <Phone className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-gray-600">{driver.contact_number}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Trip Stats Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <FileText className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                          <span className="text-sm text-gray-500 block">
                            Trips
                          </span>
                          <p className="font-medium">{driverTrips.length}</p>
                        </div>
                        <div className="text-center">
                          <MapPin className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                          <span className="text-sm text-gray-500 block">
                            Distance
                          </span>
                          <p className="font-medium">
                            {totalDistance.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <Truck className="h-4 w-4 text-gray-400 mx-auto mb-1" />
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
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/drivers/${driver.id}`);
                        }}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                      <WhatsAppButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenShareModal(driver, e);
                        }}
                        className="ml-2 text-green-600 hover:text-green-800"
                        message={`Driver details for ${driver.name} (License: ${driver.license_number || driver.dl_number}) from Auto Vital Solution.`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      
      {/* WhatsApp Share Modal */}
      {showShareModal && selectedDriverForShare && (
        <DriverWhatsAppShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          driver={selectedDriverForShare}
          signedDocUrls={signedDocUrls}
        />
      )}
    </Layout>
  );
};

export default DriversPage;