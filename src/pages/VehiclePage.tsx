import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { usePermissions } from "../hooks/usePermissions";
import { Permissions } from "../types/permissions";
import { getVehicle, getVehicleStats } from "../utils/storage";
import { generateVehicleDocumentUrls, getSignedVehiclePhotoUrl } from "../utils/supabaseStorage";
import { updateVehicle } from "../utils/api/vehicles";
import { assignTagToVehicle, removeTagFromVehicle } from "../utils/api/tags";
import { supabase } from "../utils/supabaseClient";
import {
  PenTool as PenToolIcon,
  ChevronLeft,
  Shield,
  BarChart2,
  Wrench,
  MapPin,
  FileCheck,
  Fuel,
  Route,
  FileText,
  Edit,
} from "lucide-react";
import { Vehicle } from "@/types";
import Button from "../components/ui/Button";
import VehicleForm, { VehicleFormSubmission } from "../components/vehicles/VehicleForm";
import {
  generateVehiclePDF,
  createShareableVehicleLink,
} from "../utils/exportUtils";
import { toast } from "react-toastify";
import VehicleWhatsAppShareModal from "../components/vehicles/VehicleWhatsAppShareModal";
import WhatsAppButton from "../components/vehicles/WhatsAppButton";
import DocumentDownloadModal from "../components/vehicles/DocumentDownloadModal";
import DocumentViewerModal from "../components/vehicles/DocumentViewerModal";
import FuelEfficiencyChart from "../components/analytics/FuelEfficiencyChart";
import CostAnalytics from "../components/analytics/CostAnalytics";
import VehicleDetailsTab from "../components/vehicles/VehicleDetailsTab";
import VehicleDetailsTabMobile from "../components/vehicles/VehicleDetailsTabMobile";
import VehicleMaintenanceTab from "../components/vehicles/VehicleMaintenanceTab";
import VehicleTripsTab from "../components/vehicles/VehicleTripsTab";
import { createLogger } from '../utils/logger';
import { trackEntityView } from '../utils/entityViewTracking';

const logger = createLogger('VehiclePage');

const VehiclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  
  // Helper function for type-safe permission checking
  const hasPermission = (permKey: keyof Permissions | string): boolean => {
    if (!permissions) return false;
    return Boolean(permissions[permKey as keyof Permissions]);
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDocumentViewerModal, setShowDocumentViewerModal] = useState(false);
  const [selectedVehicleForShare, setSelectedVehicleForShare] =
    useState<Vehicle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'overview' | 'trips' | 'maintenance'>('details');
  
  // Set default tab based on permissions
  useEffect(() => {
    if (permissions && !permissions.canViewVehicleOverview && activeTab === 'overview') {
      setActiveTab('trips');
    }
  }, [permissions, activeTab]);

  const [stats, setStats] = useState<{
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
    totalCost?: number;
    costPerKm?: number;
    monthlyAverage?: number;
    tripAverage?: number;
  }>({
    totalTrips: 0,
    totalDistance: 0,
    totalCost: 0,
    costPerKm: 0,
    monthlyAverage: 0,
    tripAverage: 0,
  });

  // State for signed document URLs
  const [signedDocUrls, setSignedDocUrls] = useState<{
    rc?: (string | null)[];
    insurance?: (string | null)[];
    fitness?: (string | null)[];
    tax?: (string | null)[];
    permit?: (string | null)[];
    puc?: (string | null)[];
    other: Record<string, string | null>;
  }>({
    other: {},
  });

  // Add these refs to prevent duplicate calls
  const urlGenerationRef = useRef<boolean>(false);
  const lastVehicleId = useRef<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Ensure a brief loading state to avoid flashing "Not Found" before data arrives
      const MIN_LOAD_MS = 1200; // 1.2s minimum loader time
      const loadStartedAt = Date.now();
      setLoading(true);
      try {
        const [vehicleData, vehicleStats] = await Promise.all([
          getVehicle(id),
          getVehicleStats(id),
        ]);

        // Generate signed URL for vehicle photo if vehicle_photo_url exists
        if (vehicleData && vehicleData.vehicle_photo_url) {
          logger.debug('📸 Vehicle has photo_url field:', vehicleData.vehicle_photo_url);
          const signedPhotoUrl = await getSignedVehiclePhotoUrl(vehicleData.vehicle_photo_url);
          logger.debug('📸 Generated signed photo URL:', signedPhotoUrl);
          if (signedPhotoUrl) {
            vehicleData.photo_url = signedPhotoUrl;
            logger.debug('✅ Set photo_url to:', vehicleData.photo_url);
          } else {
            logger.warn('⚠️ Failed to generate signed URL for photo');
          }
        } else {
          logger.debug('📸 No vehicle_photo_url found in vehicle data');
        }

        setVehicle(vehicleData);
        setStats(vehicleStats || {
          totalTrips: 0,
          totalDistance: 0,
          totalCost: 0,
          costPerKm: 0,
          monthlyAverage: 0,
          tripAverage: 0
        });

        // Generate signed URLs only once when vehicle data is fetched
        if (vehicleData) {
          await generateSignedUrls(vehicleData);

          // Track vehicle view for AI Alerts feed
          if (vehicleData.organization_id) {
            trackEntityView({
              entityType: 'vehicles',
              entityId: vehicleData.id,
              entityName: vehicleData.registration_number,
              organizationId: vehicleData.organization_id
            }).catch(error => {
              logger.error('Failed to track vehicle view:', error);
              // Don't throw - tracking is non-critical
            });
          }
        }
      } catch (error) {
        logger.error("Error fetching vehicle data:", error);
        toast.error("Failed to load vehicle details");
      } finally {
        // Enforce minimum loader duration
        const elapsed = Date.now() - loadStartedAt;
        const remaining = Math.max(0, MIN_LOAD_MS - elapsed);
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [id]); // Remove generateSignedUrls from dependencies - only depend on id

  // Memoized function to generate signed URLs
  const generateSignedUrls = useCallback(async (vehicleData: Vehicle) => {
    // Prevent duplicate calls
    if (urlGenerationRef.current || lastVehicleId.current === vehicleData.id) {
      logger.debug('✅ Using cached URLs for vehicle:', vehicleData.id);
      return;
    }

    logger.debug('🔄 Generating fresh URLs for vehicle:', vehicleData.id);
    urlGenerationRef.current = true;
    lastVehicleId.current = vehicleData.id;

    try {
      logger.debug('Generating signed URLs for vehicle:', vehicleData.id);
      
      // Use the new safe batch generation function
      const urls = await generateVehicleDocumentUrls(vehicleData);
      
      logger.debug('🔍 VehiclePage - Generated URLs:', urls);
      logger.debug('🔍 VehiclePage - Insurance URLs specifically:', urls.insurance);
      
      setSignedDocUrls(urls);
      
      // Check if any documents are missing and show a single info message
      const missingDocs = [];
      if (!urls.rc || urls.rc.every(url => url === null)) missingDocs.push('RC');
      if (!urls.insurance || urls.insurance.every(url => url === null)) missingDocs.push('Insurance');
      if (!urls.fitness || urls.fitness.every(url => url === null)) missingDocs.push('Fitness');
      if (!urls.tax || urls.tax.every(url => url === null)) missingDocs.push('Tax');
      if (!urls.permit || urls.permit.every(url => url === null)) missingDocs.push('Permit');
      if (!urls.puc || urls.puc.every(url => url === null)) missingDocs.push('PUC');
      
      if (missingDocs.length > 0) {
        logger.info(`Some documents could not be loaded: ${missingDocs.join(', ')}`);
        // Don't show toast for missing documents - they're expected
      }
      
    } catch (error) {
      logger.error("Error generating signed URLs:", error);
      // Only show error toast for unexpected errors
      if (error instanceof Error && !error.message.includes('not found')) {
        toast.error("Some documents could not be loaded");
      }
    } finally {
      urlGenerationRef.current = false;
    }
  }, []);

  // Function to refresh signed URLs (e.g., after document upload)
  const refreshSignedUrls = async () => {
    if (!vehicle) return;
    
    // Reset the ref to allow regeneration
    lastVehicleId.current = null;
    urlGenerationRef.current = false;
    
    await generateSignedUrls(vehicle);
  };

  // Function to safely get document URL with fallback
  const getDocumentUrl = (urls: (string | null)[] | undefined, index: number = 0): string | null => {
    if (!urls || urls.length === 0) return null;
    return urls[index];
  };

  // Function to check if a document is available
  const isDocumentAvailable = (urls: (string | null)[] | undefined): boolean => {
    return urls ? urls.some(url => url !== null) : false;
  };

  // Simple compliance score calculation
  const complianceScore = React.useMemo(() => {
    if (!vehicle) return 0;
    const docs = [
      vehicle.rc_document_url?.length,
      vehicle.insurance_document_url?.length,
      vehicle.fitness_document_url?.length,
      vehicle.tax_document_url?.length,
      vehicle.permit_document_url?.length,
      vehicle.puc_document_url?.length,
    ].filter(Boolean).length;
    return (docs / 6) * 100;
  }, [vehicle]);

  // IMPORTANT: All hooks are now defined above this point
  // Now we can have conditional returns

  // Show loader while fetching to prevent premature "Not Found"
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  // Only show Not Found once loading has fully completed
  if (!vehicle) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Vehicle Not Found</h1>
          <p className="text-gray-500">
            The requested vehicle could not be found.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/vehicles")}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Vehicles
          </Button>
        </div>
      </Layout>
    );
  }

  if (isEditing) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Edit Vehicle</h1>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto">
            <VehicleForm
              initialData={vehicle}
              onSubmit={async (formData: VehicleFormSubmission) => {
                if (!vehicle) return;

                try {
                  const { tagUpdates, tags: _ignoredTags, ...vehiclePayload } = formData;
                  const updatedVehicle = await updateVehicle(vehicle.id, vehiclePayload);

                  if (updatedVehicle) {
                    let tagUpdateError = false;
                    let nextTags = vehicle.tags ?? [];

                    if (tagUpdates && ((tagUpdates.add?.length ?? 0) > 0 || (tagUpdates.remove?.length ?? 0) > 0)) {
                      try {
                        if (Array.isArray(tagUpdates.remove)) {
                          for (const tagId of tagUpdates.remove) {
                            await removeTagFromVehicle(vehicle.id, tagId);
                          }
                        }

                        if (Array.isArray(tagUpdates.add)) {
                          for (const tagId of tagUpdates.add) {
                            await assignTagToVehicle(vehicle.id, tagId);
                          }
                        }

                        nextTags = tagUpdates.nextTags;
                      } catch (tagError) {
                        tagUpdateError = true;
                        logger.error('Error updating vehicle tags:', tagError);
                        toast.error('Vehicle updated, but tags could not be saved. Please try again.');
                      }
                    }

                    // Create the updated vehicle data
                    const updatedVehicleData = {
                      ...vehicle,
                      ...vehiclePayload,
                      tags: !tagUpdateError && tagUpdates ? nextTags : vehicle.tags,
                    };

                    // Update local state
                    setVehicle(updatedVehicleData);
                    
                    // Refresh signed URLs with the updated data
                    await generateSignedUrls(updatedVehicleData);

                    if (!tagUpdateError) {
                      toast.success('Vehicle updated successfully');
                      setIsEditing(false);
                    }
                  } else {
                    toast.error('Failed to update vehicle');
                  }
                } catch (error) {
                  logger.error('Error updating vehicle:', error);
                  toast.error('Failed to update vehicle');
                }
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        </div>
      </Layout>
    );
  }

  // Handle export as PDF
  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const doc = await generateVehiclePDF(vehicle, stats);
      doc.save(`${vehicle.registration_number}_profile.pdf`);
      toast.success("Vehicle profile exported successfully");
    } catch (error) {
      logger.error("Error exporting vehicle profile:", error);
      toast.error("Failed to export vehicle profile");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle download documents
  const handleDownloadDocuments = () => {
    setShowDownloadModal(true);
  };

  // Handle create shareable link
  const handleCreateShareableLink = async () => {
    try {
      setShareLoading(true);
      const link = await createShareableVehicleLink(vehicle.id);

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

  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    setSelectedVehicleForShare(vehicle);
    setShowShareModal(true);
  };

  // Handle individual vehicle refresh
  const handleVehicleRefresh = async () => {
    if (!vehicle || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('fetch-rc-details', {
        body: {
          registration_number: vehicle.registration_number,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch details');
      }

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch vehicle details');
      }

      // Extract the RC data from the response
      const rcData = result.data?.response || result.data || {};
      
      // Helper function to check if date is valid
      const isValidDate = (dateStr: string | undefined): boolean => {
        return dateStr !== undefined && dateStr !== '1900-01-01' && dateStr !== '';
      };

      // Prepare update payload with only the expiry dates - FIXED FIELD MAPPINGS
      const updatePayload: Partial<Vehicle> = {
        insurance_expiry_date: isValidDate(rcData.insurance_expiry) ? rcData.insurance_expiry : vehicle.insurance_expiry_date,
        tax_paid_upto: rcData.tax_upto === 'LTT' ? '2099-12-31' : (isValidDate(rcData.tax_upto) ? rcData.tax_upto : vehicle.tax_paid_upto),
        permit_expiry_date: isValidDate(rcData.permit_valid_upto) ? rcData.permit_valid_upto : vehicle.permit_expiry_date,
        puc_expiry_date: isValidDate(rcData.pucc_upto) ? rcData.pucc_upto : vehicle.puc_expiry_date,
        rc_expiry_date: isValidDate(rcData.rc_expiry) ? rcData.rc_expiry : vehicle.rc_expiry_date,
        fitness_expiry_date: isValidDate(rcData.fitness_upto) ? rcData.fitness_upto : vehicle.fitness_expiry_date,
        vahan_last_fetched_at: new Date().toISOString(),
      };

      // Update the vehicle in the database
      const updatedVehicle = await updateVehicle(vehicle.id, updatePayload);

      if (updatedVehicle) {
        // Update local state
        setVehicle(prevVehicle => prevVehicle ? { ...prevVehicle, ...updatePayload } : null);
        toast.success(`✅ ${vehicle.registration_number} updated successfully!`);
      } else {
        toast.error(`❌ Failed to update ${vehicle.registration_number}`);
      }
    } catch (error: any) {
      logger.error(`Error refreshing vehicle ${vehicle.registration_number}:`, error);
      toast.error(`❌ Failed to refresh ${vehicle.registration_number}: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/vehicles')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {vehicle.registration_number}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {vehicle.make} {vehicle.model} • {vehicle.year}
                </p>
              </div>
            </div>
            
            {/* Clean Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                title="Export as PDF"
              >
                <FileText className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Vehicle</span>
              </button>
            </div>
          </div>
        </div>
      {(
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'details', name: 'Details & Documents', icon: <FileCheck className="h-4 w-4" /> },
                { id: 'overview', name: 'Overview', icon: <BarChart2 className="h-4 w-4" />, requiresPermission: 'canViewVehicleOverview' },
                { id: 'trips', name: 'Trips', icon: <Route className="h-4 w-4" /> },
                { id: 'maintenance', name: 'Maintenance', icon: <Wrench className="h-4 w-4" /> },
              ].filter(tab => !tab.requiresPermission || hasPermission(tab.requiresPermission)).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <>
              {/* Desktop Version */}
              <div className="hidden md:block">
                <VehicleDetailsTab
                  vehicle={vehicle}
                  onUpdate={(updates: Partial<Vehicle>) => setVehicle(prev => prev ? { ...prev, ...updates } : null)}
                  signedDocUrls={signedDocUrls}
                />
              </div>
              
              {/* Mobile Version */}
              <div className="md:hidden">
                <VehicleDetailsTabMobile
                  vehicle={vehicle}
                  signedDocUrls={signedDocUrls}
                />
              </div>
            </>
          )}


          {activeTab === 'maintenance' && (
            <VehicleMaintenanceTab vehicleId={id || ''} />
          )}

          {activeTab === 'overview' && permissions?.canViewVehicleOverview && (
            <div className="space-y-6">
              {/* Simple Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Trips</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTrips}</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Route className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Distance</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalDistance.toLocaleString()} km</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Fuel Efficiency</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.averageKmpl?.toFixed(1) || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">km/L</p>
                    </div>
                    <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Fuel className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compliance</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{Math.round(complianceScore)}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Document compliance</p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      complianceScore >= 80 ? 'bg-green-100' : 
                      complianceScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <Shield className={`h-6 w-6 ${
                        complianceScore >= 80 ? 'text-green-600' : 
                        complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Simple Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FuelEfficiencyChart
                  current={stats.averageKmpl || 0}
                  baseline={stats.averageKmpl || 0}
                  trend={0}
                  period="30 days"
                />
                <CostAnalytics
                  totalCost={stats.totalCost || 0}
                  costPerKm={stats.costPerKm || 0}
                  totalDistance={stats.totalDistance}
                  totalTrips={stats.totalTrips}
                  monthlyAverage={stats.monthlyAverage || 0}
                  tripAverage={stats.tripAverage || 0}
                />
              </div>
            </div>
          )}

          {activeTab === 'trips' && (
            <VehicleTripsTab vehicleId={id || ''} />
          )}
        </div>
      )}
      </div>

      {/* Modals */}
      {showShareModal && selectedVehicleForShare && (
        <VehicleWhatsAppShareModal
          isOpen={showShareModal}
          vehicle={selectedVehicleForShare}
          onClose={() => {
            setShowShareModal(false);
            setSelectedVehicleForShare(null);
          }}
        />
      )}

      {showDownloadModal && vehicle && (
        <DocumentDownloadModal
          isOpen={showDownloadModal}
          vehicle={vehicle}
          signedDocUrls={signedDocUrls}
          onClose={() => setShowDownloadModal(false)}
        />
      )}

      {showDocumentViewerModal && vehicle && (
        <DocumentViewerModal
          isOpen={showDocumentViewerModal}
          vehicleNumber={vehicle.registration_number}
          documents={[]} // TODO: Convert signedDocUrls to DocumentFile format
          onClose={() => setShowDocumentViewerModal(false)}
        />
      )}
    </Layout>
  );
};

export default VehiclePage;
