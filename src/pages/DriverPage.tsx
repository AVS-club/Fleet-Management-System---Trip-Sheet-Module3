import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout"; // ⚠️ Confirm field refactor here
import { getVehicle, getTrips, getVehicles, getDriverPhotoPublicUrl, uploadDriverPhoto } from "../utils/storage";
import { getDriver, getDrivers, updateDriver } from "../utils/api/drivers";
import { getSignedDriverDocumentUrl } from "../utils/supabaseStorage";
import {
  User,
  Calendar,
  Truck,
  ChevronLeft,
  MapPin,
  AlertTriangle,
  FileText,
  Shield,
  FileDown,
  Share2,
  Download,
  Phone,
  Mail, // ⚠️ Confirm field refactor here
  Edit,
  MessageSquare,
} from "lucide-react";
import Button from "../components/ui/Button";
import DriverMetrics from "../components/drivers/DriverMetrics";
import { getAIAlerts } from "../utils/aiAnalytics";
import DriverDocumentManagerModal from '../components/drivers/DriverDocumentManagerModal';
import DriverInsightsPanel from '../components/drivers/DriverInsightsPanel';
import DriverForm from "../components/drivers/DriverForm";
import {
  generateDriverPDF,
  createShareableDriverLink,
} from "../utils/exportUtils";
import { toast } from "react-toastify";
import WhatsAppButton from "../components/drivers/WhatsAppButton";
import DriverDocumentDownloadModal from "../components/drivers/DriverDocumentDownloadModal";
import DriverAIInsights from "../components/ai/DriverAIInsights";
import { createLogger } from '../utils/logger';

const logger = createLogger('DriverPage');

const DriverPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDriverForShare, setSelectedDriverForShare] = useState<Driver | null>(null);
  const [showDocumentManagerModal, setShowDocumentManagerModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // State for signed document URLs
  const [signedDocUrls, setSignedDocUrls] = useState<{
    license?: string;
    police_verification?: string;
    medical_certificate?: string;
    id_proof?: string;
    other: Record<string, string>;
  }>({
    other: {},
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Fetch driver data
        const driverData = await getDriver(id);
        setDriver(driverData);

        // Fetch primary vehicle if available
        if (driverData?.primary_vehicle_id) {
          const vehicleData = await getVehicle(driverData.primary_vehicle_id);
          setPrimaryVehicle(vehicleData);
        }

        // Fetch trips
        const tripsData = await getTrips();
        setTrips(
          Array.isArray(tripsData)
            ? tripsData.filter((trip) => trip.driver_id === id)
            : []
        );

        // Fetch alerts
        const alertsData = await getAIAlerts();
        setAlerts(
          Array.isArray(alertsData)
            ? alertsData.filter(
                (alert) =>
                  alert.affected_entity?.type === "driver" &&
                  alert.affected_entity?.id === id &&
                  alert.status === "pending"
              )
            : []
        );

        // Fetch all drivers and vehicles for AI insights
        const [allDriversData, allVehiclesData] = await Promise.all([
          getDrivers(),
          getVehicles()
        ]);
        
        setAllDrivers(Array.isArray(allDriversData) ? allDriversData : []);
        setAllVehicles(Array.isArray(allVehiclesData) ? allVehiclesData : []);
        setMaintenanceTasks([]); // Initialize empty for now

        // Generate signed URLs for documents if driver is available
        if (driverData) {
          await generateSignedUrls(driverData);
        }
      } catch (error) {
        logger.error("Error fetching driver data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Function to generate signed URLs for all documents
  const generateSignedUrls = async (driverData: Driver) => {
    const urls: { // ⚠️ Confirm field refactor here
      license?: string[];
      police_verification?: string[];
      medical_certificate?: string[];
      id_proof?: string[];
      // Ensure medical_doc_url is handled as an array of strings
      medical_doc_url?: string[];
      other: Record<string, string>;
    } = {
      other: {},
    };
    // ⚠️ Confirm field refactor here
    try {
      // Generate signed URL for license document
      if (Array.isArray(driverData.license_doc_url) && driverData.license_doc_url.length > 0) {
        urls.license = await Promise.all(
          driverData.license_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }

      // Generate signed URLs for police verification documents
      if (Array.isArray(driverData.police_doc_url) && driverData.police_doc_url.length > 0) {
        urls.police_verification = await Promise.all(
          driverData.police_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }

      // Generate signed URLs for Aadhaar documents
      if (Array.isArray(driverData.aadhar_doc_url) && driverData.aadhar_doc_url.length > 0) {
        urls.id_proof = await Promise.all(
          driverData.aadhar_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }

      // Generate signed URL for medical document
      if (driverData.medical_doc_url && Array.isArray(driverData.medical_doc_url) && driverData.medical_doc_url.length > 0) {
        urls.medical_doc_url = await Promise.all(driverData.medical_doc_url.map(url => getSignedDriverDocumentUrl(url)));
      }


      // Generate signed URLs for other documents
      if (
        driverData.other_documents &&
        Array.isArray(driverData.other_documents)
      ) {
        for (let i = 0; i < driverData.other_documents.length; i++) {
          const doc = driverData.other_documents[i];
          if (doc.file_path && typeof doc.file_path === 'string') {
            urls.other[`other_${i}`] = await getSignedDriverDocumentUrl(
              doc.file_path
            );
          } else if (Array.isArray(doc.file_path) && doc.file_path.length > 0) {
            urls.other[`other_${i}`] = await getSignedDriverDocumentUrl(
              doc.file_path[0]
            );
          }
        }
      }

      setSignedDocUrls(urls);
    } catch (error) {
      logger.error("Error generating signed URLs:", error);
      toast.error("Failed to generate document access links");
    }
  }; 

  // Handle export as PDF
  const handleExportPDF = async () => {
    if (!driver) return;

    try {
      setExportLoading(true);
      const doc = await generateDriverPDF(driver, trips, primaryVehicle);
      doc.save(`${driver.name.replace(/\s+/g, "_")}_profile.pdf`);
      toast.success("Driver profile exported successfully");
    } catch (error) {
      logger.error("Error exporting driver profile:", error);
      toast.error("Failed to export driver profile");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle manage documents
  const handleManageDocuments = () => {
    setShowDocumentManagerModal(true);
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    setSelectedDriverForShare(driver);
    setShowShareModal(true);
  };

  // Handle create shareable link
  const handleCreateShareableLink = async () => {
    if (!driver) return;

    try {
      setShareLoading(true);
      const link = await createShareableDriverLink(driver.id);

      // Copy link to clipboard
      await navigator.clipboard.writeText(link);
      toast.success("Shareable link copied to clipboard (valid for 7 days)");
    } catch (error) {
      logger.error("Error creating shareable link:", error);
      toast.error("Failed to create shareable link");
    } finally {
      setShareLoading(false);
    }
  };

  const handleEditDriver = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleUpdateDriver = async (data: Omit<Driver, "id">) => {
    if (!driver) return;

    try {
      let photoStoragePath = driver.driver_photo_url; // Keep existing photo by default

      // Handle photo upload if a new photo is provided
      if (data.photo && data.photo instanceof File) {
        try {
          photoStoragePath = await uploadDriverPhoto(data.photo, driver.id);
          logger.debug("Photo uploaded to storage path:", photoStoragePath);
        } catch (error) {
          logger.error("Error uploading photo:", error);
          toast.error("Failed to upload photo, but continuing with driver update");
        }
      } else if (data.driver_photo_url && !data.driver_photo_url.startsWith('data:')) {
        // If driver_photo_url exists and is not a data URL, it's already a storage path
        photoStoragePath = data.driver_photo_url;
      }

      // Prepare driver data with photo storage path
      const driverData: Partial<Driver> = {
        ...data,
        driver_photo_url: photoStoragePath,
        // Field name mappings (form field → database column)
        // Database has 'contact_number' column
        contact_number: data.contact_number,
        // Date fields - use the primary database columns
        date_of_birth: data.date_of_birth || (data as any).dob,
        date_of_joining: data.date_of_joining || (data as any).join_date,
        license_expiry: data.license_expiry || (data as any).license_expiry_date,
        license_expiry_date: data.license_expiry_date || (data as any).license_expiry,
        license_issue_date: data.license_issue_date || (data as any).issue_date,
      };

      // Remove the File object as it can't be stored in the database
      delete (driverData as any).photo;

      // Log data being saved for debugging
      logger.debug("Updating driver data:", {
        id: driver.id,
        name: driverData.name,
        contact_number: driverData.contact_number,
        email: driverData.email,
        date_of_birth: driverData.date_of_birth,
        date_of_joining: driverData.date_of_joining,
        license_expiry: driverData.license_expiry,
        license_expiry_date: driverData.license_expiry_date,
        license_issue_date: driverData.license_issue_date,
        driver_photo_url: driverData.driver_photo_url,
      });

      // Handle document uploads (similar to DriversPage.tsx)
      if (data.aadhar_doc_file && Array.isArray(data.aadhar_doc_file)) {
        try {
          const uploadedUrls = [];
          for (const file of data.aadhar_doc_file) {
            if (file instanceof File) {
              const filePath = await uploadDriverPhoto(file, driver.id);
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
      delete (driverData as any).aadhar_doc_file;

      if (data.license_doc_file && Array.isArray(data.license_doc_file)) {
        try {
          const uploadedUrls = [];
          for (const file of data.license_doc_file) {
            if (file instanceof File) {
              const filePath = await uploadDriverPhoto(file, driver.id);
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
      delete (driverData as any).license_doc_file;

      if (data.police_doc_file && Array.isArray(data.police_doc_file)) {
        try {
          const uploadedUrls = [];
          for (const file of data.police_doc_file) {
            if (file instanceof File) {
              const filePath = await uploadDriverPhoto(file, driver.id);
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
      delete (driverData as any).police_doc_file;

      if (data.medical_doc_file && Array.isArray(data.medical_doc_file)) {
        try {
          const uploadedUrls = [];
          for (const file of data.medical_doc_file) {
            if (file instanceof File) {
              const filePath = await uploadDriverPhoto(file, driver.id);
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
      delete (driverData as any).medical_doc_file;

      // Process other documents
      if (Array.isArray(driverData.other_documents)) {
        const processedDocs = [];
        for (const doc of driverData.other_documents) {
          const processedDoc: any = {
            name: doc.name,
            issue_date: doc.issue_date,
          };

          if (doc.file_obj instanceof File) {
            try {
              const filePath = await uploadDriverPhoto(doc.file_obj, `${driver.id}-${doc.name.replace(/\s+/g, "-").toLowerCase()}`);
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

      // Update driver in database
      const updatedDriver = await updateDriver(driver.id, driverData);

      if (updatedDriver) {
        setDriver(updatedDriver);
        setIsEditing(false);
        toast.success("Driver updated successfully");

        // Regenerate signed URLs for documents
        await generateSignedUrls(updatedDriver);
      } else {
        toast.error("Failed to update driver");
      }
    } catch (error) {
      logger.error('Error updating driver:', error);
      toast.error('Failed to update driver');
    }
  };

  if (!driver) {
    return (
      <Layout title="Driver Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">
            The requested driver could not be found.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/drivers")}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Drivers
          </Button>
        </div>
      </Layout>
    );
  }

  if (isEditing) {
    return (
      <Layout
        title="Edit Driver"
        subtitle={`License: ${driver.license_number}`}
        actions={
          <Button
            variant="outline"
            onClick={handleCancelEdit}
          >
            Cancel
          </Button>
        }
      >
        <div className="max-w-4xl mx-auto">
          <DriverForm
            initialData={driver}
            onSubmit={handleUpdateDriver}
          />
        </div>
      </Layout>
    );
  }

  const hasExpiredLicense =
    driver.license_expiry_date &&
    new Date(driver.license_expiry_date) < new Date();
  const licenseExpiringIn30Days =
    driver.license_expiry_date &&
    (new Date(driver.license_expiry_date).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24) <=
      30;

  return (
    <Layout
      title={`Driver: ${driver.name}`}
      subtitle={`License: ${driver.license_number}`}
      actions={
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleEditDriver}
            icon={<Edit className="h-4 w-4" />}
          >
            Edit Driver
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/drivers")}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>

          <Button
            variant="outline"
            onClick={handleExportPDF}
            isLoading={exportLoading}
            icon={<FileDown className="h-4 w-4" />}
          >
            Export PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleManageDocuments}
            icon={<Download className="h-4 w-4" />}
            title="Manage Documents"
          />

          <WhatsAppButton
            onClick={handleWhatsAppShare}
            message={`Driver details for ${driver.name} (License: ${driver.license_number}) from Auto Vital Solution.`}
          />

          <Button
            variant="outline"
            onClick={handleCreateShareableLink}
            isLoading={shareLoading}
            icon={<Share2 className="h-4 w-4" />}
          >
            Share
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">Loading driver data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Alerts */}
          {Array.isArray(alerts) && alerts.length > 0 && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 text-warning-500 mr-2" />
                <h3 className="text-warning-700 font-medium">Active Alerts</h3>
              </div>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white p-3 rounded-md border border-warning-200"
                  >
                    <p className="font-medium text-warning-800">
                      {alert.title}
                    </p>
                    <p className="text-sm text-warning-600 mt-1">
                      {alert.description}
                    </p>
                    {alert.metadata?.recommendations && (
                      <ul className="mt-2 text-sm text-warning-700 list-disc list-inside">
                        {alert.metadata.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* License Status Warning */}
          {(hasExpiredLicense || licenseExpiringIn30Days) && (
            <div
              className={`p-4 rounded-lg ${
                hasExpiredLicense
                  ? "bg-error-50 border-error-200"
                  : "bg-warning-50 border-warning-200"
              } border`}
            >
              <div className="flex items-center">
                <AlertTriangle
                  className={`h-5 w-5 mr-2 ${
                    hasExpiredLicense ? "text-error-500" : "text-warning-500"
                  }`}
                />
                <div>
                  <h4
                    className={`font-medium ${
                      hasExpiredLicense ? "text-error-700" : "text-warning-700"
                    }`}
                  >
                    {hasExpiredLicense
                      ? "License Expired"
                      : "License Expiring Soon"}
                  </h4>
                  <p
                    className={`text-sm mt-1 ${
                      hasExpiredLicense ? "text-error-600" : "text-warning-600"
                    }`}
                  >
                    {hasExpiredLicense
                      ? "Driver's license has expired. Please renew immediately."
                      : "Driver's license will expire in less than 30 days. Please plan for renewal."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hero Section with Profile */}
          <div className="bg-gradient-to-br from-primary-50 to-green-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg overflow-hidden border border-primary-100 dark:border-gray-700">
            <div className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Profile Photo */}
                <div className="relative">
                  <div className={`w-32 h-32 rounded-2xl overflow-hidden shadow-xl ring-4 ${
                    driver.status === 'active' ? 'ring-green-400' :
                    driver.status === 'onLeave' ? 'ring-yellow-400' :
                    driver.status === 'suspended' ? 'ring-red-400' : 'ring-gray-400'
                  }`}>
                    {driver.driver_photo_url ? (
                      <img
                        src={getDriverPhotoPublicUrl(driver.driver_photo_url) || ''}
                        alt={driver.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${driver.driver_photo_url ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-green-100 dark:from-gray-700 dark:to-gray-800`}>
                      <User className="w-16 h-16 text-primary-400" />
                    </div>
                  </div>
                  {/* Status Badge */}
                  <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
                    driver.status === 'active' ? 'bg-green-500' :
                    driver.status === 'onLeave' ? 'bg-yellow-500' :
                    driver.status === 'suspended' ? 'bg-red-500' : 'bg-gray-400'
                  }`}>
                    {driver.status === 'active' ? '✓ Active' :
                     driver.status === 'onLeave' ? 'On Leave' :
                     driver.status === 'suspended' ? 'Suspended' : driver.status}
                  </div>
                </div>

                {/* Driver Info */}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{driver.name}</h1>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
                      <FileText className="h-4 w-4 mr-1.5 text-primary-500" />
                      {driver.license_number}
                    </span>
                    {driver.experience_years && (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm">
                        <Calendar className="h-4 w-4 mr-1.5 text-green-500" />
                        {driver.experience_years} years exp
                      </span>
                    )}
                  </div>

                  {/* Contact Quick Actions */}
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {driver.contact_number && (
                      <>
                        <button
                          onClick={() => window.location.href = `tel:${driver.contact_number}`}
                          className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium shadow-md"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </button>
                        <button
                          onClick={() => window.open(`https://wa.me/${driver.contact_number.replace(/[^0-9]/g, '')}`)}
                          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium shadow-md"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          WhatsApp
                        </button>
                      </>
                    )}
                    {driver.email && (
                      <button
                        onClick={() => window.location.href = `mailto:${driver.email}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium shadow-md"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Personal Information Panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-500 to-green-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {driver.name && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Full Name</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">{driver.name}</div>
                    </div>
                  )}

                  {driver.license_number && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">License No.</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">{driver.license_number}</div>
                    </div>
                  )}

                  {driver.contact_number && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Contact</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">{driver.contact_number}</div>
                    </div>
                  )}

                  {driver.email && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Email</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">{driver.email}</div>
                    </div>
                  )}

                  {driver.date_of_birth && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Date of Birth</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">
                        {new Date(driver.date_of_birth).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {(driver.join_date || driver.date_of_joining) && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Join Date</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">
                        {new Date(driver.join_date || driver.date_of_joining).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {driver.experience_years !== undefined && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Experience</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">{driver.experience_years} years</div>
                    </div>
                  )}

                  {driver.salary && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Salary</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">₹{driver.salary.toLocaleString()}/month</div>
                    </div>
                  )}

                  {driver.blood_group && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Blood Group</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">{driver.blood_group}</div>
                    </div>
                  )}

                  {driver.address && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Address</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">{driver.address}</div>
                    </div>
                  )}

                  {driver.emergency_contact && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Emergency</div>
                      <div className="flex-1 font-medium text-gray-900 dark:text-gray-100">{driver.emergency_contact}</div>
                    </div>
                  )}

                  {driver.driver_status_reason && (
                    <div className="flex items-start">
                      <div className="w-32 text-sm text-gray-500 dark:text-gray-400">Status Note</div>
                      <div className="flex-1 text-sm text-red-600 dark:text-red-400">{driver.driver_status_reason}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Status Panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Document Status
                  </h3>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      driver.documents_verified
                        ? "bg-green-400 text-green-900"
                        : "bg-yellow-400 text-yellow-900"
                    }`}
                  >
                    {driver.documents_verified ? "✓ Verified" : "⚠ Pending"}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* License Status Card */}
                <div className={`p-4 rounded-lg border-2 ${
                  hasExpiredLicense
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : licenseExpiringIn30Days
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">License Status</h4>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        hasExpiredLicense
                          ? "bg-red-500 text-white"
                          : licenseExpiringIn30Days
                          ? "bg-yellow-500 text-white"
                          : "bg-green-500 text-white"
                      }`}
                    >
                      {hasExpiredLicense
                        ? "✕ Expired"
                        : licenseExpiringIn30Days
                        ? "⚠ Expiring Soon"
                        : "✓ Valid"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Array.isArray(driver.vehicle_class) && driver.vehicle_class.length > 0 && (
                      <div className="flex items-start">
                        <div className="w-28 text-xs text-gray-600 dark:text-gray-400">License Class</div>
                        <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {driver.vehicle_class.join(", ")}
                        </div>
                      </div>
                    )}
                    {driver.license_issue_date && (
                      <div className="flex items-start">
                        <div className="w-28 text-xs text-gray-600 dark:text-gray-400">Issue Date</div>
                        <div className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(driver.license_issue_date).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {driver.license_expiry_date && (
                      <div className="flex items-start">
                        <div className="w-28 text-xs text-gray-600 dark:text-gray-400">Expiry Date</div>
                        <div className={`flex-1 text-sm font-bold ${
                          hasExpiredLicense
                            ? "text-red-700 dark:text-red-400"
                            : licenseExpiringIn30Days
                            ? "text-yellow-700 dark:text-yellow-400"
                            : "text-green-700 dark:text-green-400"
                        }`}>
                          {new Date(driver.license_expiry_date).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document List */}
                <div className="space-y-2">
                  {driver.license_doc_url && (
                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">License Document</p>
                        <p className="text-xs text-green-600 dark:text-green-400">✓ Uploaded</p>
                      </div>
                    </div>
                  )}

                  {driver.aadhar_doc_url && (
                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Aadhaar Document</p>
                        <p className="text-xs text-green-600 dark:text-green-400">✓ Uploaded</p>
                      </div>
                    </div>
                  )}

                  {driver.police_doc_url && (
                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1 ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Police Verification</p>
                        <p className="text-xs text-green-600 dark:text-green-400">✓ Uploaded</p>
                      </div>
                    </div>
                  )}

                  {driver.medical_doc_url && (
                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 ml-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Medical Certificate</p>
                        <p className="text-xs text-green-600 dark:text-green-400">✓ Uploaded</p>
                      </div>
                    </div>
                  )}

                  {driver.other_documents && Array.isArray(driver.other_documents) && driver.other_documents.length > 0 && (
                    <>
                      {driver.other_documents.map((doc, index) => (
                        doc.file_path && (
                          <div key={index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 ml-3">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.name}</p>
                              <p className="text-xs text-green-600 dark:text-green-400">✓ Uploaded</p>
                            </div>
                          </div>
                        )
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Primary Vehicle Panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Primary Vehicle
                  </h3>
                </div>
              </div>

              {primaryVehicle ? (
                <div className="p-6">
                  {/* Vehicle Card */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-xl border-2 border-orange-200 dark:border-orange-800 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                          <Truck className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {primaryVehicle.registration_number}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {primaryVehicle.make} {primaryVehicle.model}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          primaryVehicle.status === "active"
                            ? "bg-green-500 text-white"
                            : primaryVehicle.status === "maintenance"
                            ? "bg-yellow-500 text-white"
                            : "bg-gray-400 text-white"
                        }`}
                      >
                        {primaryVehicle.status === "active" ? "✓ Active" : primaryVehicle.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                          {primaryVehicle.type}
                        </p>
                      </div>
                      {primaryVehicle.year && (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Year</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {primaryVehicle.year}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-medium transition-all shadow-md"
                    onClick={() => navigate(`/vehicles/${primaryVehicle.id}`)}
                  >
                    <MapPin className="h-4 w-4" />
                    View Vehicle Details
                  </button>
                </div>
              ) : (
                <div className="p-6 flex flex-col items-center justify-center h-64">
                  <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Truck className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-center">No primary vehicle assigned</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">Assign a vehicle to this driver</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <DriverMetrics driver={driver} trips={trips} />

          {/* Driver Insights Panel */}
          <DriverInsightsPanel 
            driver={driver} 
            trips={trips} 
            vehicles={primaryVehicle ? [primaryVehicle] : undefined} 
          />

          {/* Driver AI Insights */}
          {allDrivers.length > 0 && allVehicles.length > 0 && (
            <DriverAIInsights
              driver={driver}
              allDrivers={allDrivers}
              trips={trips}
              vehicles={allVehicles}
              maintenanceTasks={maintenanceTasks}
            />
          )}

          {/* Driver Insights Panel */}
          <DriverInsightsPanel 
            driver={driver} 
            trips={trips} 
            vehicles={primaryVehicle ? [primaryVehicle] : undefined} 
          />

          {/* Document Manager Modal */}
          {showDocumentManagerModal && (
            <DriverDocumentManagerModal
              isOpen={showDocumentManagerModal}
              onClose={() => setShowDocumentManagerModal(false)}
              driver={driver}
              signedDocUrls={signedDocUrls}
            />
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

          {/* Document Download Modal */}
          {showDownloadModal && !showDocumentManagerModal && (
            <DriverDocumentDownloadModal
              isOpen={showDownloadModal}
              onClose={() => setShowDownloadModal(false)}
              driver={driver}
              signedDocUrls={signedDocUrls}
            />
          )}
        </div>
      )}
    </Layout>
  );
};

export default DriverPage;