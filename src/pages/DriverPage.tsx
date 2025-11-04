import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout"; // ⚠️ Confirm field refactor here
import { getVehicle, getTrips, getVehicles, getDriverPhotoPublicUrl, uploadDriverPhoto } from "../utils/storage";
import { getDriver, getDrivers, updateDriver } from "../utils/api/drivers";
import { getSignedDriverDocumentUrl } from "../utils/supabaseStorage";
import { Driver, Trip, Vehicle, AIAlert } from "@/types";
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
import DriverWhatsAppShareModal from "../components/drivers/DriverWhatsAppShareModal";
import DriverAIInsights from "../components/ai/DriverAIInsights";
import { createLogger } from '../utils/logger';
import { trackEntityView } from '../utils/entityViewTracking';

const logger = createLogger('DriverPage');

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
  const [driverPhotoUrl, setDriverPhotoUrl] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // State for signed document URLs
  const [signedDocUrls, setSignedDocUrls] = useState<{
    license?: string[];
    police_verification?: string[];
    medical_certificate?: string[];
    medical_doc_url?: string[];
    id_proof?: string[];
    other: Record<string, string>;
  }>({
    other: {},
  });

  // Function to generate signed URLs for all documents
  const generateSignedUrls = useCallback(async (driverData: Driver) => {
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
  }, []); 

  const fetchDriverData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const driverData = await getDriver(id);
      const mergedDriver = driverData
        ? {
            ...driverData,
            // Map database fields to form fields
            dob: driverData.date_of_birth || driverData.dob,
            join_date: driverData.date_of_joining || driverData.join_date,
            license_expiry_date: driverData.license_expiry || driverData.license_expiry_date,
            // Keep original fields for backward compatibility
            date_of_birth: driverData.date_of_birth,
            date_of_joining: driverData.date_of_joining,
            license_expiry: driverData.license_expiry,
          }
        : null;
      setDriver(mergedDriver);

      // Track driver profile view for AI Alerts feed
      if (driverData && driverData.organization_id) {
        trackEntityView({
          entityType: 'drivers',
          entityId: driverData.id,
          entityName: driverData.name,
          organizationId: driverData.organization_id
        }).catch(error => {
          logger.error('Failed to track driver view:', error);
          // Don't throw - tracking is non-critical
        });
      }

      if (driverData?.driver_photo_url) {
        const publicUrl = getDriverPhotoPublicUrl(driverData.driver_photo_url);
        setDriverPhotoUrl(publicUrl);
      } else {
        setDriverPhotoUrl(null);
      }

      if (driverData?.primary_vehicle_id) {
        logger.debug('Loading primary vehicle for driver:', driverData.primary_vehicle_id);
        const vehicleData = await getVehicle(driverData.primary_vehicle_id);
        logger.debug('Primary vehicle data:', vehicleData);
        setPrimaryVehicle(vehicleData);
      } else {
        logger.debug('No primary vehicle ID found for driver:', driverData);
        setPrimaryVehicle(null);
      }

      const [tripsData, alertsData, allDriversData, allVehiclesData] = await Promise.all([
        getTrips(),
        getAIAlerts(),
        getDrivers(),
        getVehicles(),
      ]);

      setTrips(
        Array.isArray(tripsData)
          ? tripsData.filter((trip) => trip.driver_id === id)
          : []
      );

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

      setAllDrivers(Array.isArray(allDriversData) ? allDriversData : []);
      setAllVehicles(Array.isArray(allVehiclesData) ? allVehiclesData : []);
      setMaintenanceTasks([]);

      if (driverData) {
        await generateSignedUrls(driverData);
      } else {
        setSignedDocUrls({ other: {} });
      }
    } catch (error) {
      logger.error("Error fetching driver data:", error);
    } finally {
      setLoading(false);
    }
  }, [generateSignedUrls, id]);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

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
    if (!driver?.id) {
      toast.error("Unable to update driver — missing driver ID.");
      return;
    }

    setIsUpdating(true);
    try {
      const driverId = driver.id;
      let photoUrl = data.driver_photo_url || driver.driver_photo_url || null;

      let photoFile: File | null = null;
      if (data.photo instanceof File) {
        photoFile = data.photo;
      } else if (
        typeof data.driver_photo_url === "string" &&
        data.driver_photo_url.startsWith("data:")
      ) {
        photoFile = dataUrlToFile(
          data.driver_photo_url,
          `${driverId}-fetch.jpg`
        );
      }

      if (photoFile) {
        try {
          const uploadedPhoto = await uploadDriverPhoto(photoFile, driverId);
          if (uploadedPhoto) {
            photoUrl = uploadedPhoto;
          }
        } catch (error) {
          logger.error("Error uploading driver photo:", error);
          toast.error("Failed to upload driver photo");
        }
      }

      const normalizeString = (value?: string | null) => {
        if (!value) return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      const contactNumber =
        normalizeString(data.contact_number) ||
        normalizeString(driver.contact_number);

      const driverData: Partial<Driver> = {
        ...data,
        driver_photo_url: photoUrl || undefined,
        contact_number: contactNumber || undefined,
      };

      const dobValue = normalizeString(data.dob as string);
      const joinDateValue = normalizeString(data.join_date as string);
      const licenseExpiryValue = normalizeString(
        (data as any).license_expiry_date
      );

      // Map form fields to database fields
      if (dobValue) {
        (driverData as any).date_of_birth = dobValue;
      }
      if (joinDateValue) {
        (driverData as any).date_of_joining = joinDateValue;
      }
      if (licenseExpiryValue) {
        (driverData as any).license_expiry = licenseExpiryValue;
      }

      // Clean up form fields that don't exist in database
      delete (driverData as any).photo;
      delete (driverData as any).dob;
      delete (driverData as any).join_date;
      delete (driverData as any).license_expiry_date;
      delete (driverData as any).valid_from; // Not in database
      delete (driverData as any).license_issue_date; // Not in database

      const mergeDocumentUrls = async (
        files: File[] | undefined,
        existing: string[] | undefined,
        key: string
      ): Promise<string[] | undefined> => {
        const currentUrls = Array.isArray(existing)
          ? existing.filter((value): value is string => Boolean(value))
          : [];
        const shouldClear =
          Array.isArray(existing) && existing.length === 0 && currentUrls.length === 0;

        if (!Array.isArray(files) || files.length === 0) {
          return shouldClear
            ? []
            : currentUrls.length > 0
            ? currentUrls
            : undefined;
        }

        const uploaded: string[] = [];
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          if (!(file instanceof File)) {
            continue;
          }
          try {
            const storageKey = `${driverId}-${key}-${Date.now()}-${index}`;
            const uploadedPath = await uploadDriverPhoto(file, storageKey);
            if (uploadedPath) {
              uploaded.push(uploadedPath);
            }
          } catch (error) {
            logger.error(`Error uploading ${key} document:`, error);
            toast.error(`Failed to upload ${key} document`);
          }
        }

        const combined = [...currentUrls, ...uploaded];
        if (combined.length > 0) {
          return combined;
        }
        return shouldClear ? [] : undefined;
      };

      driverData.license_doc_url = await mergeDocumentUrls(
        data.license_doc_file as File[] | undefined,
        data.license_doc_url,
        "license"
      );
      driverData.aadhar_doc_url = await mergeDocumentUrls(
        data.aadhar_doc_file as File[] | undefined,
        data.aadhar_doc_url,
        "aadhar"
      );
      driverData.police_doc_url = await mergeDocumentUrls(
        data.police_doc_file as File[] | undefined,
        data.police_doc_url,
        "police"
      );
      driverData.medical_doc_url = await mergeDocumentUrls(
        data.medical_doc_file as File[] | undefined,
        data.medical_doc_url,
        "medical"
      );

      delete (driverData as any).license_doc_file;
      delete (driverData as any).aadhar_doc_file;
      delete (driverData as any).police_doc_file;
      delete (driverData as any).medical_doc_file;

      if (Array.isArray(data.other_documents)) {
        const processedDocs: Driver["other_documents"] = [];

        for (let index = 0; index < data.other_documents.length; index += 1) {
          const doc = data.other_documents[index];
          if (!doc) continue;

          const processedDoc: any = {
            ...doc,
          };

          if (doc.file_obj instanceof File) {
            try {
              const storageKey = `${driverId}-other-${Date.now()}-${index}`;
              const uploadedPath = await uploadDriverPhoto(doc.file_obj, storageKey);
              if (uploadedPath) {
                processedDoc.file_path = uploadedPath;
              }
            } catch (error) {
              logger.error(`Error uploading supporting document "${doc.name}":`, error);
              toast.error(`Failed to upload document "${doc.name}"`);
            }
          } else if (Array.isArray(doc.file_path) && doc.file_path.length > 0) {
            processedDoc.file_path = doc.file_path[0];
          }

          delete processedDoc.file_obj;
          delete processedDoc.file;

          processedDocs.push(processedDoc);
        }

        driverData.other_documents = processedDocs;
      }

      logger.debug('Saving driver data with primary_vehicle_id:', driverData.primary_vehicle_id);
      logger.debug('Full driver data being saved:', driverData);
      
      const updatedDriver = await updateDriver(driverId, driverData);

      if (!updatedDriver) {
        toast.error("Failed to update driver");
        return;
      }

      toast.success("Driver updated successfully");
      setIsEditing(false);
      await fetchDriverData();
    } catch (error) {
      logger.error("Error updating driver:", error);
      toast.error("Failed to update driver");
    } finally {
      setIsUpdating(false);
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
      <Layout>
        {/* Page Header */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm mb-6">
          <div className="flex items-center group">
            <Edit className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
            <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">
              Edit Driver
            </h1>
          </div>
          <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1 ml-7">
            License: {driver.license_number}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          <DriverForm
            initialData={{
              ...driver,
              driver_photo_url: driverPhotoUrl || driver.driver_photo_url,
            }}
            onSubmit={handleUpdateDriver}
            isSubmitting={isUpdating}
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
  const resolvedDriverPhotoUrl =
    driverPhotoUrl ||
    (driver.driver_photo_url
      ? getDriverPhotoPublicUrl(driver.driver_photo_url)
      : null);
  const joinDateRaw = driver.join_date || driver.date_of_joining || '';
  const formattedJoinDate = (() => {
    if (!joinDateRaw) {
      return 'Not set';
    }
    const parsed = new Date(joinDateRaw);
    if (Number.isNaN(parsed.getTime())) {
      return 'Not set';
    }
    return parsed.toLocaleDateString();
  })();

  const dobRaw = driver.dob || driver.date_of_birth || '';
  const formattedDateOfBirth = (() => {
    if (!dobRaw) {
      return 'Not set';
    }
    const parsed = new Date(dobRaw);
    if (Number.isNaN(parsed.getTime())) {
      return 'Not set';
    }
    return parsed.toLocaleDateString();
  })();

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center group">
            <User className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
            <div>
              <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">
                Driver Details
              </h1>
              <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-0.5">
                License: {driver.license_number}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
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
      </div>
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

          {/* Modern Gradient Hero Section */}
          <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Profile Photo */}
                <div className="relative">
                  <div className={`w-32 h-32 rounded-2xl overflow-hidden shadow-xl ring-4 ${
                    driver.status === 'active' ? 'ring-green-200' :
                    driver.status === 'onLeave' ? 'ring-yellow-200' :
                    driver.status === 'suspended' ? 'ring-red-200' : 'ring-gray-200'
                  }`}>
                    {resolvedDriverPhotoUrl ? (
                      <img
                        src={resolvedDriverPhotoUrl || ''}
                        alt={driver.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${resolvedDriverPhotoUrl ? 'hidden' : ''} w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-green-100 dark:from-gray-700 dark:to-gray-800`}>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Personal Information Panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </h3>
                </div>
              </div>

              <div className="p-6">

              <div className="space-y-4">
                {/* Driver Photo */}
                <div className="flex justify-center mb-6">
                  {resolvedDriverPhotoUrl ? (
                    <img
                      src={resolvedDriverPhotoUrl}
                      alt={driver.name}
                      className="h-32 w-32 rounded-full object-cover shadow-md"
                    />
                  ) : (
                    <div className="h-32 w-32 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 divide-y divide-gray-100">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{driver.name}</p>
                  </div>

                  <div className="pt-3">
                    <p className="text-sm text-gray-500">License Number</p>
                    <p className="font-medium">{driver.license_number}</p>
                  </div>

                  {driver.contact_number && (
                    <div className="pt-3">
                      <p className="text-sm text-gray-500">Contact</p>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="font-medium">{driver.contact_number}</p>
                      </div>
                    </div>
                  )}

                  {driver.email && (
                    <div className="pt-3">
                      <p className="text-sm text-gray-500">Email</p>
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="font-medium">{driver.email}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-3">
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="font-medium">{formattedDateOfBirth}</p>
                    </div>
                  </div>

                  <div className="pt-3">
                    <p className="text-sm text-gray-500">Join Date</p>
                    <p className="font-medium">{formattedJoinDate}</p>
                  </div>

                  <div className="pt-3">
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="font-medium">
                      {driver.experience_years} years
                    </p>
                  </div>

                  <div className="pt-3">
                    <p className="text-sm text-gray-500">Status</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        driver.status === "active"
                          ? "bg-success-100 text-success-800"
                          : driver.status === "onLeave"
                          ? "bg-warning-100 text-warning-800"
                          : driver.status === "suspended" ||
                            driver.status === "blacklisted"
                          ? "bg-error-100 text-error-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {driver.status.replace("_", " ")}
                    </span>
                  </div>

                  {driver.driver_status_reason && (
                    <div className="pt-3">
                      <p className="text-sm text-gray-500">Status Reason</p>
                      <p className="text-sm text-error-600">
                        {driver.driver_status_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>

            {/* Document Status Panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-400 to-indigo-400 px-6 py-4">
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
                    {driver.documents_verified ? "✓ Verified" : "Pending"}
                  </span>
                </div>
              </div>

              <div className="p-6">

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">
                      License Status
                    </h4>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        hasExpiredLicense
                          ? "bg-error-100 text-error-700"
                          : licenseExpiringIn30Days
                          ? "bg-warning-100 text-warning-700"
                          : "bg-success-100 text-success-700"
                      }`}
                    >
                      {hasExpiredLicense
                        ? "Expired"
                        : licenseExpiringIn30Days
                        ? "Expiring Soon"
                        : "Valid"}
                    </span>
                  </div>

                  {driver.license_expiry_date && (
                    <div className="text-sm mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">License Class</span>
                        <span className="font-medium">
                          {Array.isArray(driver.vehicle_class)
                            ? driver.vehicle_class.join(", ")
                            : "Not Specified"}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Issue Date</span>
                        <span className="font-medium">
                          {driver.license_issue_date
                            ? new Date(
                                driver.license_issue_date
                              ).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Expiry Date</span>
                        <span
                          className={`font-medium ${
                            hasExpiredLicense
                              ? "text-error-600"
                              : licenseExpiringIn30Days
                              ? "text-warning-600"
                              : ""
                          }`}
                        >
                          {new Date(
                            driver.license_expiry_date
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">
                      Document Verification
                    </h4>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        driver.documents_verified
                          ? "bg-success-100 text-success-700"
                          : "bg-warning-100 text-warning-700"
                      }`}
                    >
                      {driver.documents_verified ? "Verified" : "Pending"}
                    </span>
                  </div>

                  <div className="flex items-center mt-2 p-3 bg-white rounded border border-gray-200">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        License Document
                      </p>
                      <p className="text-xs text-gray-500">
                        {driver.license_doc_url && Array.isArray(driver.license_doc_url) && driver.license_doc_url.length > 0 ? "Available" : "Not uploaded"}
                      </p>
                    </div>
                    {driver.license_doc_url && Array.isArray(driver.license_doc_url) && driver.license_doc_url.length > 0 && (
                      <Button 
                        variant="outline" 
                        inputSize="sm"
                        onClick={() => setShowDocumentManagerModal(true)}
                      >
                        View
                      </Button>
                    )}
                  </div>

                  {/* Display other documents if any */}
                  {driver.other_documents &&
                    Array.isArray(driver.other_documents) &&
                    driver.other_documents.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Additional Documents
                        </h5>
                        {driver.other_documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center mt-2 p-3 bg-white rounded border border-gray-200"
                          >
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {doc.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {doc.file_path ? "Available" : "Not uploaded"}
                              </p>
                            </div>
                            {doc.file_path && (
                              <Button variant="outline" inputSize="sm">
                                View
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
              </div>
            </div>

            {/* Primary Vehicle Panel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-400 to-rose-400 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Primary Vehicle
                  </h3>
                </div>
              </div>

              <div className="p-6">

              {primaryVehicle ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Vehicle Details
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registration</span>
                        <span className="font-medium">
                          {primaryVehicle.registration_number}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Make & Model</span>
                        <span className="font-medium">
                          {primaryVehicle.make} {primaryVehicle.model}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Type</span>
                        <span className="font-medium capitalize">
                          {primaryVehicle.type}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            primaryVehicle.status === "active"
                              ? "bg-success-100 text-success-800"
                              : primaryVehicle.status === "maintenance"
                              ? "bg-warning-100 text-warning-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {primaryVehicle.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="w-full text-center px-4 py-2 border border-gray-300 rounded-md text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                    onClick={() => navigate(`/vehicles/${primaryVehicle.id}`)}
                  >
                    View Vehicle Details
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-lg">
                  <Truck className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-gray-500">No primary vehicle assigned</p>
                </div>
              )}
              </div>
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

          {/* Document Manager Modal */}
          {showDocumentManagerModal && driver && (
            <DriverDocumentManagerModal
              isOpen={showDocumentManagerModal}
              onClose={() => setShowDocumentManagerModal(false)}
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
