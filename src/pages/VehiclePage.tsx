import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
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
} from "lucide-react";
import { Vehicle } from "@/types";
import Button from "../components/ui/Button";
import VehicleForm from "../components/vehicles/VehicleForm";
import { toast } from "react-toastify";
import VehicleWhatsAppShareModal from "../components/vehicles/VehicleWhatsAppShareModal";
import DocumentDownloadModal from "../components/vehicles/DocumentDownloadModal";
import DocumentViewerModal from "../components/vehicles/DocumentViewerModal";
import FuelEfficiencyChart from "../components/analytics/FuelEfficiencyChart";
import CostAnalytics from "../components/analytics/CostAnalytics";
import VehicleDetailsTab from "../components/vehicles/VehicleDetailsTab";
import VehicleShareActions from "../components/vehicles/VehicleShareActions";
import VehicleTripsTab from "../components/vehicles/VehicleTripsTab";
import VehicleMaintenanceTab from "../components/vehicles/VehicleMaintenanceTab";

const VehiclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDocumentViewerModal, setShowDocumentViewerModal] = useState(false);
  const [selectedVehicleForShare, setSelectedVehicleForShare] =
    useState<Vehicle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'overview' | 'trips' | 'maintenance'>('details');

  const [stats, setStats] = useState<{
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
  }>({
    totalTrips: 0,
    totalDistance: 0,
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
        setStats(vehicleStats || { totalTrips: 0, totalDistance: 0 });

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
              onSubmit={() => {
                // Handle update
                setIsEditing(false);
              }}
            />
          </div>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Photo and Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={() => navigate("/vehicles")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Vehicles</span>
            </button>
            
            {/* Share Actions - Single Location */}
            <VehicleShareActions
              vehicleId={id || ''}
              vehicleNumber={vehicle.registration_number}
              documents={[
                { type: 'RC', url: vehicle.rc_document_url?.[0] || '', available: !!vehicle.rc_document_url?.length },
                { type: 'Insurance', url: vehicle.insurance_document_url?.[0] || '', available: !!vehicle.insurance_document_url?.length },
                { type: 'Fitness', url: vehicle.fitness_document_url?.[0] || '', available: !!vehicle.fitness_document_url?.length },
                { type: 'Tax', url: vehicle.tax_document_url?.[0] || '', available: !!vehicle.tax_document_url?.length },
                { type: 'Permit', url: vehicle.permit_document_url?.[0] || '', available: !!vehicle.permit_document_url?.length },
                { type: 'PUC', url: vehicle.puc_document_url?.[0] || '', available: !!vehicle.puc_document_url?.length },
              ]}
            />
          </div>

          {/* Vehicle Photo and Info */}
          <VehiclePhotoUpload
            vehicleId={id || ''}
            vehicle={vehicle}
            currentPhotoUrl={vehicle.photo_url}
            onPhotoUpdate={(url: string) => setVehicle(prev => prev ? { ...prev, photo_url: url } : null)}
          />
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
                { id: 'overview', name: 'Overview', icon: <BarChart2 className="h-4 w-4" /> },
                { id: 'trips', name: 'Trips', icon: <Route className="h-4 w-4" /> },
                { id: 'maintenance', name: 'Maintenance', icon: <Wrench className="h-4 w-4" /> },
              ].map((tab) => (
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
            <VehicleDetailsTab
              vehicle={vehicle}
              onUpdate={(updates: Partial<Vehicle>) => setVehicle(prev => prev ? { ...prev, ...updates } : null)}
            />
          )}

          {activeTab === 'trips' && (
            <VehicleTripsTab vehicleId={id || ''} />
          )}

          {activeTab === 'maintenance' && (
            <VehicleMaintenanceTab 
              vehicleId={id || ''} 
              vehicleType={vehicle.type || 'truck'} 
            />
          )}

          {activeTab === 'overview' && (
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
                  totalCost={0}
                  costPerKm={0}
                  totalDistance={stats.totalDistance}
                  totalTrips={stats.totalTrips}
                  monthlyAverage={0}
                  tripAverage={0}
                />
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Floating Edit Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => setIsEditing(true)}
          icon={<PenToolIcon className="h-4 w-4" />}
          className="shadow-lg"
        >
          Edit Vehicle
        </Button>
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

      {showDownloadModal && (
        <DocumentDownloadModal
          isOpen={showDownloadModal}
          vehicle={vehicle}
          signedDocUrls={signedDocUrls}
          onClose={() => setShowDownloadModal(false)}
        />
      )}

      {showDocumentViewerModal && (
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
