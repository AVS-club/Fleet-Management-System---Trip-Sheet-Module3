import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { getDriver, getVehicle, getTrips, getDrivers, getVehicles } from "../utils/storage";
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
  Mail,
  Edit,
} from "lucide-react";
import Button from "../components/ui/Button";
import DriverMetrics from "../components/drivers/DriverMetrics";
import { getAIAlerts } from "../utils/aiAnalytics";
import DriverDocumentManagerModal from '../components/drivers/DriverDocumentManagerModal';
import DriverInsightsPanel from '../components/drivers/DriverInsightsPanel';
import DriverAIInsights from '../components/ai/DriverAIInsights';
import DriverForm from "../components/drivers/DriverForm";
import {
  generateDriverPDF,
  createShareableDriverLink,
} from "../utils/exportUtils";
import { toast } from "react-toastify";
import WhatsAppButton from "../components/drivers/WhatsAppButton";
import DriverDocumentDownloadModal from "../components/drivers/DriverDocumentDownloadModal";

const DriverPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
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
        const allDriversData = await getDrivers();
        setAllDrivers(Array.isArray(allDriversData) ? allDriversData : []);

        const allVehiclesData = await getVehicles();
        setAllVehicles(Array.isArray(allVehiclesData) ? allVehiclesData : []);

        // Generate signed URLs for documents if driver is available
        if (driverData) {
          await generateSignedUrls(driverData);
        }
      } catch (error) {
        console.error("Error fetching driver data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Function to generate signed URLs for all documents
  const generateSignedUrls = async (driverData: Driver) => {
    const urls: {
      license?: string;
      police_verification?: string;
      medical_certificate?: string;
      id_proof?: string;
      other: Record<string, string>;
    } = {
      other: {},
    };

    try {
      // Generate signed URL for license document
      if (driverData.license_doc_url) {
        urls.license = await getSignedDriverDocumentUrl(driverData.license_doc_url);
      }

      // Generate signed URLs for other documents
      if (
        driverData.other_documents &&
        Array.isArray(driverData.other_documents)
      ) {
        for (let i = 0; i < driverData.other_documents.length; i++) {
          const doc = driverData.other_documents[i];
          if (doc.file_path) {
            urls.other[`other_${i}`] = await getSignedDriverDocumentUrl(
              doc.file_path
            );
          }
        }
      }

      setSignedDocUrls(urls);
    } catch (error) {
      console.error("Error generating signed URLs:", error);
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
      console.error("Error exporting driver profile:", error);
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
      console.error("Error creating shareable link:", error);
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
    try {
      // Update logic would go here
      // For now, just close the edit mode
      setIsEditing(false);
      // Reload driver data
      // This would be replaced with actual update logic
      window.location.reload();
    } catch (error) {
      console.error('Error updating driver:', error);
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Personal Information Panel */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Personal Information
                </h3>
                <User className="h-6 w-6 text-primary-500" />
              </div>

              <div className="space-y-4">
                {/* Driver Photo */}
                <div className="flex justify-center mb-6">
                  {driver.driver_photo_url ? (
                    <img
                      src={driver.driver_photo_url}
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
                    <p className="text-sm text-gray-500">Join Date</p>
                    <p className="font-medium">
                      {new Date(driver.join_date).toLocaleDateString()}
                    </p>
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

            {/* Document Status Panel */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Document Status
                </h3>
                <Shield className="h-6 w-6 text-primary-500" />
              </div>

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
                        {driver.license_doc_url ? "Available" : "Not uploaded"}
                      </p>
                    </div>
                    {driver.license_doc_url && (
                      <Button variant="outline" size="sm">
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
                              <Button variant="outline" size="sm">
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

            {/* Primary Vehicle Panel */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Primary Vehicle
                </h3>
                <Truck className="h-6 w-6 text-primary-500" />
              </div>

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

          {/* Performance Metrics */}
          <DriverMetrics driver={driver} trips={trips} />

          {/* Driver Insights Panel */}
          <DriverInsightsPanel 
            driver={driver} 
            trips={trips} 
            vehicles={primaryVehicle ? [primaryVehicle] : undefined} 
          />

          {/* Driver AI Insights */}
          {allDrivers && allDrivers.length > 0 && allVehicles && allVehicles.length > 0 && (
            <DriverAIInsights
              driver={driver}
              allDrivers={allDrivers}
              trips={trips}
              vehicles={allVehicles}
              maintenanceTasks={[]}
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