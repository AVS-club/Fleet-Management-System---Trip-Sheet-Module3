import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { usePermissions } from "../hooks/usePermissions";
import { 
  getTrips, 
  uploadDriverPhoto,
  getDriverPhotoPublicUrl
} from "../utils/storage"; // ⚠️ Confirm field refactor here
import { 
  getDrivers, 
  createDriver, 
  updateDriver 
} from "../utils/api/drivers";
import { supabase } from "../utils/supabaseClient";
import {
  User, Users,
  Truck,
  BarChart,
  PlusCircle,
  MapPin,
  Edit2,
  Clock,
  UserCheck,
  UserX,
  Phone,
  Calendar, // ⚠️ Confirm field refactor here
  FileText,
  AlertTriangle,
  MessageSquare,
  MoreVertical,
  IndianRupee,
  Activity,
} from "lucide-react";
import Button from "../components/ui/Button";
import DriverForm from "../components/drivers/DriverForm";
import { Driver, Trip } from "@/types";
import { toast } from "react-toastify";
import StatCard from "../components/ui/StatCard";
import WhatsAppButton from '../components/drivers/WhatsAppButton'; // ⚠️ Confirm field refactor here
import DriverWhatsAppShareModal from '../components/drivers/DriverWhatsAppShareModal';
import { getSignedDriverDocumentUrl } from '../utils/supabaseStorage';
import { createLogger } from '../utils/logger';
import { DriverStats, getDocumentStatus, formatDistance, formatMileage } from '../utils/driverRating';
import { Vehicle } from '../types';
import { getUserActiveOrganization } from '../utils/supaHelpers';

const logger = createLogger('DriversPage');

const dataUrlToFile = (dataUrl: string, fileName: string): File | null => {
  try {
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      return null;
    }
    const [meta, base64Data] = dataUrl.split(",");
    if (!base64Data) {
      return null;
    }
    const mimeMatch = meta.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mimeType });
  } catch (error) {
    logger.warn("Failed to convert data URL to File:", error);
    return null;
  }
};

const DriversPage: React.FC = () => {
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  const { t } = useTranslation();
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

  // Enhanced data state
  const [driverStats, setDriverStats] = useState<Record<string, DriverStats>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeDriversCount, setActiveDriversCount] = useState(0);
  const [totalSalary, setTotalSalary] = useState(0);
  const [assignedVehicles, setAssignedVehicles] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setStatsLoading(true);
      try {
        // Get current user from Supabase auth instead of localStorage
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          logger.error('Error getting user:', userError);
          setLoading(false);
          setStatsLoading(false);
          return;
        }
        setUser(user);

        // Get organization ID
        const organizationId = await getUserActiveOrganization(user.id);
        if (!organizationId) {
          logger.warn('No organization selected for user');
          setLoading(false);
          setStatsLoading(false);
          return;
        }

        // Fetch drivers, trips, and driver stats in parallel
        const [driversData, tripsData, statsResult] = await Promise.all([
          getDrivers(),
          getTrips(),
          supabase.rpc('get_driver_stats', {
            p_organization_id: organizationId,
            p_days_back: 30
          }),
        ]);

        const driversArray = Array.isArray(driversData) ? driversData : [];
        setDrivers(driversArray);
        setTrips(Array.isArray(tripsData) ? tripsData : []);

        // Process driver stats into a map
        const statsMap: Record<string, DriverStats> = {};
        if (statsResult.data && Array.isArray(statsResult.data)) {
          statsResult.data.forEach((stat: any) => {
            statsMap[stat.driver_id] = {
              total_trips: stat.total_trips || 0,
              total_distance: stat.total_distance || 0,
              total_fuel: stat.total_fuel || 0,
              avg_mileage: stat.avg_mileage || 0,
              active_days: stat.active_days || 0,
              last_trip_date: stat.last_trip_date,
            };
          });
        }
        setDriverStats(statsMap);

        // Fetch vehicles for drivers with primary_vehicle_id
        const vehicleIds = driversArray
          .filter(d => d.primary_vehicle_id)
          .map(d => d.primary_vehicle_id);

        if (vehicleIds.length > 0) {
          const { data: vehiclesData } = await supabase
            .from('vehicles')
            .select('id, registration_number, make, model, type')
            .in('id', vehicleIds);

          setVehicles(vehiclesData || []);
        }

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
          const expiryDate = driver.license_expiry || driver.license_expiry_date;
          if (!expiryDate) return false;

          const expiry = new Date(expiryDate);
          return expiry > today && expiry <= thirtyDaysFromNow;
        }).length;

        setDriversWithExpiringLicense(expiringLicenses);

        // Calculate active drivers (drivers with 10+ trips in last 30 days)
        const activeDriversWithTrips = driversArray.filter(d =>
          statsMap[d.id!] && statsMap[d.id!].total_trips >= 10
        ).length;
        setActiveDriversCount(activeDriversWithTrips);

        // Calculate total salary
        const salary = driversArray.reduce(
          (sum, driver) => sum + (driver.salary || 0),
          0
        );
        setTotalSalary(salary);

        // Calculate assigned vehicles
        const assigned = driversArray.filter(d => d.primary_vehicle_id).length;
        setAssignedVehicles(assigned);

        setStatsLoading(false);

      } catch (error) {
        logger.error("Error fetching drivers data:", error);
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
      // For EDITING: Use existing driver ID immediately
      // For NEW: Create driver first to get UUID, then upload photos
      const isEditing = !!editingDriver;
      let uploadTargetId: string;
      let newDriverRecord: Driver | null = null;

      if (isEditing) {
        // EDITING MODE: Use existing driver ID
        uploadTargetId = editingDriver.id;
      } else {
        // NEW DRIVER MODE: Create driver record first (without files) to get UUID
        const { photo, aadhar_doc_file, license_doc_file, police_doc_file, medical_doc_file, other_documents, ...driverDataWithoutFiles } = data;

        // Remove empty id field if present to let Supabase auto-generate
        const { id, ...cleanDriverData } = driverDataWithoutFiles as any;
        const finalDriverData = id && id.trim() !== '' ? driverDataWithoutFiles : cleanDriverData;

        newDriverRecord = await createDriver(finalDriverData);

        if (!newDriverRecord) {
          toast.error("Failed to create driver");
          setIsSubmitting(false);
          return;
        }

        uploadTargetId = newDriverRecord.id;
        logger.info(`Created new driver with UUID: ${uploadTargetId}`);
      }

      // Now we have a valid UUID in uploadTargetId for both create and edit scenarios
      let photoUrl = data.driver_photo_url; // Start with the URL from form data (includes API fetched URL)

      let photoFile: File | null = null;
      if (data.photo instanceof File) {
        photoFile = data.photo;
      } else if (
        typeof data.driver_photo_url === "string" &&
        data.driver_photo_url.startsWith("data:")
      ) {
        photoFile = dataUrlToFile(
          data.driver_photo_url,
          `${uploadTargetId}-fetch.jpg`
        );
      }

      // Handle photo upload if we have a file (either direct upload or converted from data URL)
      if (photoFile) {
        try {
          photoUrl = await uploadDriverPhoto(photoFile, uploadTargetId);
        } catch (error) {
          logger.error("Error uploading photo:", error);
          toast.error(
            "Failed to upload photo, but continuing with driver save"
          );
        }
      }

      // Prepare driver data with photo URL
      const driverData: Partial<Driver> = {
        ...data,
        driver_photo_url: photoUrl,
      };

      // Remove the File object as it can't be stored in the database
      delete (driverData as any).photo;

      // Handle Aadhaar document upload (using correct UUID)
      if (data.aadhar_doc_file && Array.isArray(data.aadhar_doc_file)) {
        try {
          const uploadedUrls = [];
          for (const file of data.aadhar_doc_file) {
            if (file instanceof File) {
              const filePath = await uploadDriverPhoto(file, uploadTargetId);
              uploadedUrls.push(filePath);
            }
          }
          if (uploadedUrls.length > 0) {
            driverData.aadhar_doc_url = uploadedUrls;
          }
        } catch (error) {
          logger.error("Error uploading Aadhaar documents:", error);
        }
      }

      // Handle license document upload (using correct UUID)
      if (data.license_doc_file && Array.isArray(data.license_doc_file)) {
        try {
          const uploadedUrls = [];
          for (const file of data.license_doc_file) {
            if (file instanceof File) {
              const filePath = await uploadDriverPhoto(file, uploadTargetId);
              uploadedUrls.push(filePath);
            }
          }
          if (uploadedUrls.length > 0) {
            driverData.license_doc_url = uploadedUrls;
          }
        } catch (error) {
          logger.error("Error uploading license documents:", error);
        }
      }

      // Handle police document upload (using correct UUID)
      if (data.police_doc_file && Array.isArray(data.police_doc_file)) {
        try {
          const uploadedUrls = [];
          for (const file of data.police_doc_file) {
            if (file instanceof File) {
              const filePath = await uploadDriverPhoto(file, uploadTargetId);
              uploadedUrls.push(filePath);
            }
          }
          if (uploadedUrls.length > 0) {
            driverData.police_doc_url = uploadedUrls;
          }
        } catch (error) {
          logger.error("Error uploading police documents:", error);
        }
      }

      // Handle medical document upload (using correct UUID)
      if (data.medical_doc_file && Array.isArray(data.medical_doc_file)) {
        try {
          const uploadedUrls = [];
          for (const file of data.medical_doc_file) {
            if (file instanceof File) {
              const filePath = await uploadDriverPhoto(file, uploadTargetId);
              uploadedUrls.push(filePath);
            }
          }
          if (uploadedUrls.length > 0) {
            driverData.medical_doc_url = uploadedUrls;
          }
        } catch (error) {
          logger.error("Error uploading medical documents:", error);
        }
      }
      // Remove the File object as it can't be stored in the database
      delete (driverData as any).medical_doc_file;

      // Remove the File object as it can't be stored in the database
      delete (driverData as any).aadhar_doc_file;

      // Process other documents (using correct UUID)
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
              const filePath = await uploadDriverPhoto(doc.file_obj, uploadTargetId);
              processedDoc.file_path = filePath;
            } catch (error) {
              logger.error(`Error uploading document "${doc.name}":`, error);
            }
          } else if (doc.file_path) {
            processedDoc.file_path = doc.file_path;
          }

          processedDocs.push(processedDoc);
        }

        driverData.other_documents = processedDocs;
      }

      if (isEditing) {
        // EDITING MODE: Update existing driver with uploaded files
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
        // NEW DRIVER MODE: Update the driver record we created earlier with uploaded file URLs
        if (newDriverRecord) {
          // Update driver with all the uploaded file URLs
          const updatedDriver = await updateDriver(newDriverRecord.id, driverData);

          if (updatedDriver) {
            setDrivers((prevDrivers) => [updatedDriver, ...prevDrivers]);
            setTotalDrivers((prev) => prev + 1);
            if (updatedDriver.status === "active") {
              setActiveDrivers((prev) => prev + 1);
            } else if (updatedDriver.status === "inactive") {
              setInactiveDrivers((prev) => prev + 1);
            }

            setIsAddingDriver(false);
            toast.success("Driver added successfully");
          } else {
            toast.error("Failed to update driver with uploaded files");
          }
        } else {
          toast.error("Failed to create driver");
        }
      }
    } catch (error) {
      logger.error("Error saving driver:", error);
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
    setSelectedDriverForShare(driver); // ⚠️ Confirm field refactor here
    
    // Generate signed URLs for documents if available
    const urls: { // ⚠️ Confirm field refactor here
      license?: string[];
      police_verification?: string[];
      medical_certificate?: string[];
      id_proof?: string[];
      other: Record<string, string>;
    } = {
      other: {}
    };
    
    try {
      // Generate signed URL for license document
      if (Array.isArray(driver.license_doc_url) && driver.license_doc_url.length > 0) {
        urls.license = await Promise.all(
          driver.license_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }
      
      // Generate signed URLs for police verification documents
      if (Array.isArray(driver.police_doc_url) && driver.police_doc_url.length > 0) {
        urls.police_verification = await Promise.all(
          driver.police_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }
      
      // Generate signed URLs for Aadhaar documents  
      if (Array.isArray(driver.aadhar_doc_url) && driver.aadhar_doc_url.length > 0) {
        urls.id_proof = await Promise.all(
          driver.aadhar_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }
      
      // Generate signed URLs for other documents
      if (driver.other_documents && Array.isArray(driver.other_documents)) {
        for (let i = 0; i < driver.other_documents.length; i++) {
          const doc = driver.other_documents[i];
          if (doc.file_path && typeof doc.file_path === 'string') {
            urls.other[`other_${i}`] = await getSignedDriverDocumentUrl(doc.file_path); // ⚠️ Confirm field refactor here
          } else if (Array.isArray(doc.file_path) && doc.file_path.length > 0) {
            urls.other[`other_${i}`] = await getSignedDriverDocumentUrl(doc.file_path[0]);
          }
        }
      }
      
      setSignedDocUrls(urls);
    } catch (error) {
      logger.error('Error generating signed URLs:', error);
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
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Users className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">{t('drivers.title')}</h1>
        </div>
        <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1 ml-7">{t('drivers.manageFleetDrivers')}</p>
        {!isAddingDriver && !editingDriver && (
          <div className="mt-4 flex flex-wrap gap-2">
            {permissions?.canViewDriverInsights && (
              <Button
                variant="outline"
                onClick={() => navigate('/drivers/insights')}
                icon={<BarChart className="h-4 w-4" />}
              >
                {t('drivers.driverInsights')}
              </Button>
            )}
            <Button
              onClick={() => setIsAddingDriver(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              {t('drivers.addDriver')}
            </Button>
          </div>
        )}
      </div>

      {isAddingDriver || editingDriver ? (
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100 flex items-center">
              <User className="h-5 w-5 mr-2 text-primary-500 dark:text-primary-400" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 animate-pulse border border-gray-200 dark:border-gray-700"
                >
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <StatCard
                title="Total Drivers"
                value={totalDrivers}
                subtitle={`Active: ${activeDrivers}`}
                icon={<Users className="h-5 w-5 text-primary-600" />}
              />

              <StatCard
                title="Active Drivers"
                value={activeDriversCount}
                subtitle="10+ trips/month"
                icon={<Activity className="h-5 w-5 text-success-600" />}
              />

              <StatCard
                title="Documents Expiring"
                value={driversWithExpiringLicense}
                subtitle="This month"
                icon={<AlertTriangle className={`h-5 w-5 ${driversWithExpiringLicense > 0 ? 'text-warning-600' : 'text-success-600'}`} />}
              />

              <StatCard
                title="Avg Experience"
                value={`${avgExperience} years`}
                subtitle="All drivers"
                icon={<Clock className="h-5 w-5 text-primary-600" />}
              />

              <StatCard
                title="Total Salary"
                value={`₹${(totalSalary/100000).toFixed(1)}L`}
                subtitle="Per month"
                icon={<IndianRupee className="h-5 w-5 text-success-600" />}
              />

              <StatCard
                title="Vehicles Assigned"
                value={`${assignedVehicles}/${totalDrivers}`}
                subtitle={`${((assignedVehicles/Math.max(totalDrivers,1))*100).toFixed(0)}% assigned`}
                icon={<Truck className="h-5 w-5 text-primary-600" />}
              />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="ml-3 font-sans text-gray-600 dark:text-gray-300">Loading drivers...</p>
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="font-sans text-gray-500 dark:text-gray-400">
                No drivers found. Add your first driver to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drivers.map((driver: Driver) => {
                // Get driver stats and vehicle
                const stats = driverStats[driver.id!] || null;
                const vehicle = vehicles.find(v => v.id === driver.primary_vehicle_id);
                const docStatus = getDocumentStatus(driver);

                // Status ring color
                const statusRingColor =
                  driver.status === 'active' ? 'ring-green-400' :
                  driver.status === 'onLeave' ? 'ring-yellow-400' :
                  driver.status === 'suspended' ? 'ring-red-400' : 'ring-gray-400';

                return (
                  <div
                    key={driver.id}
                    className="bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:shadow-lg transition-all duration-200 p-5"
                  >
                    {/* Header Section with Photo and Basic Info */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative">
                        <div className={`w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ring-4 ${statusRingColor}`}>
                          {driver.driver_photo_url ? (
                            <img
                              src={getDriverPhotoPublicUrl(driver.driver_photo_url) || driver.driver_photo_url}
                              alt={driver.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`${driver.driver_photo_url ? 'hidden' : ''} w-full h-full flex items-center justify-center`}>
                            <User className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                          </div>
                        </div>
                        {/* Status Indicator */}
                        <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          driver.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          {driver.status === 'active' ? '✓' : '−'}
                        </span>
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{driver.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{driver.license_number || 'No license'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
                            {driver.experience_years || 0} years exp
                          </span>
                          {/* Activity Badge - Optional */}
                          {stats && stats.total_trips >= 15 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              Active Driver
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Document Alert Icon */}
                      {docStatus.status !== 'valid' && (
                        <div className={`p-2 rounded-full ${
                          docStatus.color === 'red' ? 'bg-red-50 dark:bg-red-900/30' :
                          docStatus.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/30' :
                          'bg-gray-50 dark:bg-gray-800'
                        }`}>
                          <AlertTriangle className={`h-5 w-5 ${
                            docStatus.color === 'red' ? 'text-red-500' :
                            docStatus.color === 'yellow' ? 'text-yellow-500' :
                            'text-gray-500'
                          }`} />
                        </div>
                      )}
                    </div>

                    {/* Contact & Vehicle Info */}
                    <div className="space-y-2 mb-4">
                      {driver.contact_number && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{driver.contact_number}</span>
                        </div>
                      )}

                      {driver.date_of_birth && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>DOB: {formatDate(driver.date_of_birth)}</span>
                        </div>
                      )}

                      {vehicle && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <Truck className="h-4 w-4 mr-2" />
                          <span>{vehicle.registration_number} • {vehicle.make}</span>
                        </div>
                      )}
                    </div>

                    {/* Trip Statistics */}
                    <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Trips</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{stats?.total_trips || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {stats ? formatDistance(stats.total_distance) : '0 km'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fuel Eff.</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {stats ? formatMileage(stats.avg_mileage) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Document Status Bar */}
                    <div className={`p-2 mb-3 rounded-md border ${
                      docStatus.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                      docStatus.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                      docStatus.color === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                      'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}>
                      <p className={`text-xs font-medium text-center ${
                        docStatus.color === 'green' ? 'text-green-700 dark:text-green-300' :
                        docStatus.color === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' :
                        docStatus.color === 'red' ? 'text-red-700 dark:text-red-300' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {docStatus.text}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {driver.contact_number && (
                        <button
                          onClick={() => window.location.href = `tel:${driver.contact_number}`}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-sm font-medium"
                        >
                          <Phone className="h-4 w-4" />
                          Call
                        </button>
                      )}

                      {driver.contact_number && (
                        <button
                          onClick={() => window.open(`https://wa.me/${driver.contact_number.replace(/[^0-9]/g, '')}`)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm font-medium"
                        >
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/drivers/${driver.id}`)}
                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                        title="View Details"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
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
