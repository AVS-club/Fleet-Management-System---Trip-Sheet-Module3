import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { usePermissions } from "../hooks/usePermissions";
import { Permissions } from "../types/permissions";
import { getVehicle, getVehicleStats } from "../utils/storage";
import { getSignedDocumentUrl } from "../utils/supabaseStorage";
import { updateVehicle } from "../utils/api/vehicles";
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
import VehicleForm from "../components/vehicles/VehicleForm";
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
    rc?: string[];
    insurance?: string[];
    fitness?: string[];
    tax?: string[];
    permit?: string[];
    puc?: string[];
    other: Record<string, string>;
  }>({
    other: {},
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const [vehicleData, vehicleStats] = await Promise.all([
          getVehicle(id),
          getVehicleStats(id),
        ]);

        setVehicle(vehicleData);
        setStats(vehicleStats || { 
          totalTrips: 0, 
          totalDistance: 0, 
          totalCost: 0,
          costPerKm: 0,
          monthlyAverage: 0,
          tripAverage: 0
        });

        // Generate signed URLs for documents
        if (vehicleData) {
          await generateSignedUrls(vehicleData);
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Function to generate signed URLs for all documents
  const generateSignedUrls = async (vehicleData: Vehicle) => {
    const urls: {
      rc?: string[];
      insurance?: string[];
      fitness?: string[];
      tax?: string[];
      permit?: string[];
      puc?: string[];
      other: Record<string, string>;
    } = {
      other: {},
    };

    try {
      // Generate signed URL for RC document
      if (vehicleData.rc_document_url && Array.isArray(vehicleData.rc_document_url)) {
        urls.rc = await Promise.all(
          vehicleData.rc_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for insurance document
      if (vehicleData.insurance_document_url && Array.isArray(vehicleData.insurance_document_url)) {
        urls.insurance = await Promise.all(
          vehicleData.insurance_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for fitness document
      if (vehicleData.fitness_document_url && Array.isArray(vehicleData.fitness_document_url)) {
        urls.fitness = await Promise.all(
          vehicleData.fitness_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for tax document
      if (vehicleData.tax_document_url && Array.isArray(vehicleData.tax_document_url)) {
        urls.tax = await Promise.all(
          vehicleData.tax_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for permit document
      if (vehicleData.permit_document_url && Array.isArray(vehicleData.permit_document_url)) {
        urls.permit = await Promise.all(
          vehicleData.permit_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for PUC document
      if (vehicleData.puc_document_url && Array.isArray(vehicleData.puc_document_url)) {
        urls.puc = await Promise.all(
          vehicleData.puc_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URLs for other documents
      if (
        vehicleData.other_documents &&
        Array.isArray(vehicleData.other_documents)
      ) {
        for (let i = 0; i < vehicleData.other_documents.length; i++) {
          const doc = vehicleData.other_documents[i];
          if (doc.file_path) {
            urls.other[`other_${i}`] = await getSignedDocumentUrl(
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
              onSubmit={async (formData) => {
                try {
                  // Update the vehicle in the database
                  const updatedVehicle = await updateVehicle(vehicle.id, formData);
                  
                  if (updatedVehicle) {
                    // Update local state
                    setVehicle(prevVehicle => prevVehicle ? { ...prevVehicle, ...formData } : null);
                    
                    // Regenerate signed URLs for updated documents
                    await generateSignedUrls({ ...vehicle, ...formData });
                    
                    toast.success('Vehicle updated successfully');
                    setIsEditing(false);
                  } else {
                    toast.error('Failed to update vehicle');
                  }
                } catch (error) {
                  console.error('Error updating vehicle:', error);
                  toast.error('Failed to update vehicle');
                }
              }}
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
      console.error("Error exporting vehicle profile:", error);
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
      console.error("Error creating shareable link:", error);
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
      console.error(`Error refreshing vehicle ${vehicle.registration_number}:`, error);
      toast.error(`❌ Failed to refresh ${vehicle.registration_number}: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/vehicles')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {vehicle.registration_number}
                </h1>
                <p className="text-sm text-gray-600">
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
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border-b border-gray-200">
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
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Trips</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalTrips}</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100">
                      <Route className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Distance</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalDistance.toLocaleString()} km</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Fuel Efficiency</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.averageKmpl?.toFixed(1) || 'N/A'}</p>
                      <p className="text-xs text-gray-500">km/L</p>
                    </div>
                    <div className="p-3 rounded-full bg-yellow-100">
                      <Fuel className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Compliance</p>
                      <p className="text-3xl font-bold text-gray-900">{Math.round(complianceScore)}%</p>
                      <p className="text-xs text-gray-500">Document compliance</p>
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
