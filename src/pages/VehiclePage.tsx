import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getVehicle, getVehicleStats, getTrips } from '../utils/storage';
import { getSignedDocumentUrl } from '../utils/supabaseStorage';
import { 
  Truck, 
  Calendar, PenTool as PenToolIcon, AlertTriangle, ChevronLeft, Fuel, FileText, Shield, Download, Share2, 
  FileDown, Eye, Clock, Info, BarChart2, Database, IndianRupee, User 
} from 'lucide-react';
import Button from '../components/ui/Button';
import MileageChart from '../components/dashboard/MileageChart';
import VehicleForm from '../components/vehicles/VehicleForm';
import { generateVehiclePDF, downloadVehicleDocuments, createShareableVehicleLink } from '../utils/exportUtils';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import VehicleWhatsAppShareModal from '../components/vehicles/VehicleWhatsAppShareModal';
import VehicleSummaryChips from '../components/vehicles/VehicleSummaryChips';
import WhatsAppButton from '../components/vehicles/WhatsAppButton';
import DocumentDownloadModal from '../components/vehicles/DocumentDownloadModal';
import DocumentViewerModal from '../components/vehicles/DocumentViewerModal';

const VehiclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDocumentViewerModal, setShowDocumentViewerModal] = useState(false);
  const [selectedVehicleForShare, setSelectedVehicleForShare] = useState<Vehicle | null>(null);
  const [contactNumber, setContactNumber] = useState<string>("9876543210"); // Default fallback number
  
  const [stats, setStats] = useState<{ totalTrips: number; totalDistance: number; averageKmpl?: number }>({
    totalTrips: 0,
    totalDistance: 0
  });
  
  // State for signed document URLs
  const [signedDocUrls, setSignedDocUrls] = useState<{
    rc?: string;
    insurance?: string;
    fitness?: string;
    tax?: string;
    permit?: string;
    puc?: string;
    other: Record<string, string>;
  }>({
    other: {}
  });
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const [vehicleData, tripsData, vehicleStats] = await Promise.all([
          getVehicle(id),
          getTrips(),
          getVehicleStats(id)
        ]);
        
        setVehicle(vehicleData);
        setTrips(Array.isArray(tripsData) ? tripsData.filter(trip => trip.vehicle_id === id) : []);
        setStats(vehicleStats || { totalTrips: 0, totalDistance: 0 });
        
        // Generate signed URLs for documents
        if (vehicleData) {
          await generateSignedUrls(vehicleData);
        }
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  // Function to generate signed URLs for all documents
  const generateSignedUrls = async (vehicleData: Vehicle) => {
    const urls: {
      rc?: string;
      insurance?: string;
      fitness?: string;
      tax?: string;
      permit?: string;
      puc?: string;
      other: Record<string, string>;
    } = {
      other: {}
    };
    
    try {
      // Generate signed URL for RC document
      if (vehicleData.rc_document_url) {
        urls.rc = await vehicleData.rc_document_url;
      }
      
      // Generate signed URL for insurance document
      if (vehicleData.insurance_document_url) {
        urls.insurance = vehicleData.insurance_document_url;
      }
      
      // Generate signed URL for fitness document
      if (vehicleData.fitness_document_url) {
        urls.fitness = 
          vehicleData.fitness_document_url
        ;
      }
      
      // Generate signed URL for tax document
      if (vehicleData.tax_document_url) {
        urls.tax = vehicleData.tax_document_url;
      }
      
      // Generate signed URL for permit document
      if (vehicleData.permit_document_url) {
        urls.permit = vehicleData.permit_document_url;
      }
      
      // Generate signed URL for PUC document
      if (vehicleData.puc_document_url) {
        urls.puc = vehicleData.puc_document_url;
      }
      
      // Generate signed URLs for other documents
      if (vehicleData.other_documents && Array.isArray(vehicleData.other_documents)) {
        for (let i = 0; i < vehicleData.other_documents.length; i++) {
          const doc = vehicleData.other_documents[i];
          if (doc.file_path) {
            urls.other[`other_${i}`] = await getSignedDocumentUrl(doc.file_path);
          }
        }
      }
      
      setSignedDocUrls(urls);
    } catch (error) {
      console.error('Error generating signed URLs:', error);
      toast.error('Failed to generate document access links');
    }
  };

  // Prepare documents for document viewer modal
  const getDocumentsForViewer = () => {
    return [
      {
        type: 'RC Document',
        name: 'RC Document',
        url: signedDocUrls.rc || null,
        status: vehicle.rc_document_url ? 'submitted' : 'missing'
      },
      {
        type: 'Insurance',
        name: 'Insurance',
        url: signedDocUrls.insurance || null,
        status: vehicle.insurance_document_url ? 'submitted' : 'missing'
      },
      {
        type: 'Fitness Certificate',
        name: 'Fitness Certificate',
        url: signedDocUrls.fitness || null,
        status: vehicle.fitness_document_url ? 'submitted' : 'missing'
      },
      {
        type: 'Permit',
        name: 'Permit',
        url: signedDocUrls.permit || null,
        status: vehicle.permit_document_url ? 'submitted' : 'missing'
      },
      {
        type: 'PUC Certificate',
        name: 'PUC Certificate',
        url: signedDocUrls.puc || null,
        status: vehicle.puc_document_url ? 'submitted' : 'missing'
      },
      {
        type: 'Tax Receipt',
        name: 'Tax Receipt',
        url: signedDocUrls.tax || null,
        status: vehicle.tax_document_url ? 'submitted' : 'missing'
      },
      // Add other documents if any
      ...(vehicle.other_documents && Array.isArray(vehicle.other_documents) 
        ? vehicle.other_documents.map((doc, index) => ({
            type: doc.name || `Additional Document ${index + 1}`,
            name: doc.name || `Additional Document ${index + 1}`,
            url: signedDocUrls.other[`other_${index}`] || null,
            status: doc.file_path ? 'submitted' : 'missing'
          }))
        : [])
    ];
  };
  
  if (!vehicle) {
    return (
      <Layout title="Vehicle Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">The requested vehicle could not be found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/vehicles')}
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
      <Layout
        title="Edit Vehicle"
        subtitle={vehicle.registration_number}
        actions={
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        }
      >
        <div className="max-w-4xl mx-auto">
          <VehicleForm
            initialData={vehicle}
            onSubmit={(data) => {
              // Handle update
              setIsEditing(false);
            }}
          />
        </div>
      </Layout>
    );
  }

  // Helper functions for document status
  const getDocumentStatus = (docPath?: string, expiryDate?: string) => {
    if (!docPath) return { status: 'missing', label: 'Missing', color: 'bg-gray-100 text-gray-800' };
    
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      if (expiry < now) {
        return { status: 'expired', label: 'Expired', color: 'bg-error-100 text-error-800' };
      }
      
      // Check if expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      if (expiry < thirtyDaysFromNow) {
        return { status: 'expiring', label: 'Expiring Soon', color: 'bg-warning-100 text-warning-800' };
      }
    }
    
    return { status: 'valid', label: 'Valid', color: 'bg-success-100 text-success-800' };
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Calculate document statuses
  const rcStatus = getDocumentStatus(vehicle.rc_document_url, vehicle.rc_expiry_date);
  const insuranceStatus = getDocumentStatus(vehicle.insurance_document_url, vehicle.insurance_expiry_date);
  const fitnessStatus = getDocumentStatus(vehicle.fitness_document_url, vehicle.fitness_expiry_date);
  const taxStatus = getDocumentStatus(vehicle.tax_document_url, vehicle.tax_period ? 'future' : undefined); // Tax doesn't always have an expiry
  const permitStatus = getDocumentStatus(vehicle.permit_document_url, vehicle.permit_expiry_date);
  const pucStatus = getDocumentStatus(vehicle.puc_document_url, vehicle.puc_expiry_date);

  // Handle export as PDF
  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const doc = await generateVehiclePDF(vehicle, stats);
      doc.save(`${vehicle.registration_number}_profile.pdf`);
      toast.success('Vehicle profile exported successfully');
    } catch (error) {
      console.error('Error exporting vehicle profile:', error);
      toast.error('Failed to export vehicle profile');
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
      toast.success('Shareable link copied to clipboard (valid for 7 days)');
    } catch (error) {
      console.error('Error creating shareable link:', error);
      toast.error('Failed to create shareable link');
    } finally {
      setShareLoading(false);
    }
  };
  
  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    setSelectedVehicleForShare(vehicle);
    setShowShareModal(true);
    
    // Set contact number (use a real contact number here if available)
    // For example, get it from the primary driver if assigned
    if (vehicle.primary_driver_id) {
      // Here we would fetch the driver's contact number
      // For now, use the default
    }
  };

  return (
    <Layout
      title={`Vehicle: ${vehicle.registration_number}`}
      subtitle={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      actions={
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/vehicles')}
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
            onClick={() => setShowDocumentViewerModal(true)}
            icon={<Eye className="h-4 w-4" />}
            title="View Documents"
          />

          <Button
            variant="outline"
            onClick={handleDownloadDocuments}
            isLoading={downloadLoading}
            icon={<Download className="h-4 w-4" />}
            title="Download Documents"
          />
          
          <WhatsAppButton 
            phoneNumber={contactNumber}
            onClick={handleWhatsAppShare}
            className="text-green-600 hover:text-green-800"
          />
          
          <Button
            variant="outline"
            onClick={handleCreateShareableLink}
            isLoading={shareLoading}
            icon={<Share2 className="h-4 w-4" />}
          >
            Share
          </Button>
          
          <Button
            onClick={() => setIsEditing(true)}
            icon={<PenToolIcon className="h-4 w-4" />}
          >
            Edit Vehicle
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
        {/* Main Content Grid - 3 Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* SECTION 1: VEHICLE INFORMATION */}
          <div className="bg-white p-6 rounded-lg shadow-sm space-y-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
                {vehicle.owner_name && (
                  <p className="text-sm text-gray-500">
                    <span className="inline-flex items-center">
                      <User className="h-3.5 w-3.5 mr-1 text-gray-400" />
                      Owned by {vehicle.owner_name}
                    </span>
                  </p>
                )}
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                vehicle.status === 'active' 
                  ? 'bg-success-100 text-success-800'
                  : vehicle.status === 'maintenance'
                  ? 'bg-warning-100 text-warning-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {vehicle.status}
              </div>
            </div>
            
            <div className="space-y-3 divide-y divide-gray-100">
              <div className="grid grid-cols-2 gap-4 pb-3">
                <div>
                  <p className="text-xs text-gray-500">Registration</p>
                  <p className="font-medium">{vehicle.registration_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Make & Model</p>
                  <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-3">
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium capitalize">{vehicle.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Year</p>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-3">
                <div>
                  <p className="text-xs text-gray-500">Fuel Type</p>
                  <p className="font-medium capitalize">{vehicle.fuel_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Chassis Number</p>
                  <p className="font-medium font-mono text-sm">{vehicle.chassis_number || 'N/A'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-3">
                <div>
                  <p className="text-xs text-gray-500">Engine Number</p>
                  <p className="font-medium font-mono text-sm">{vehicle.engine_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Reg. Date</p>
                  <p className="font-medium">{formatDate(vehicle.registration_date)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-3">
                <div>
                  <p className="text-xs text-gray-500">Current Odometer</p>
                  <p className="font-medium">{vehicle.current_odometer?.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tyre Details</p>
                  <p className="font-medium">
                    {vehicle.tyre_size && vehicle.number_of_tyres ? 
                      `${vehicle.number_of_tyres}x ${vehicle.tyre_size}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* SECTION 2: DOCUMENT STATUS */}
          <div className="bg-white p-6 rounded-lg shadow-sm space-y-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium text-gray-900">Compliance Documents</h3>
              <Shield className="h-5 w-5 text-primary-500" />
            </div>
            
            <div className="space-y-4">
              {/* RC Document */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium">RC Document</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${rcStatus.color}`}>
                      {rcStatus.label}
                    </span>
                  </div>
                  {vehicle.rc_expiry_date && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Expires: {formatDate(vehicle.rc_expiry_date)}
                    </p>
                  )}
                </div>
                {signedDocUrls.rc && (
                  <a 
                    href={signedDocUrls.rc} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white rounded-md border border-primary-200 hover:bg-primary-50"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              {/* Insurance Document */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium">Insurance</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${insuranceStatus.color}`}>
                      {insuranceStatus.label}
                    </span>
                  </div>
                  {vehicle.insurer_name && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      {vehicle.insurer_name} 
                      {vehicle.policy_number && ` • ${vehicle.policy_number}`}
                    </p>
                  )}
                  {vehicle.insurance_expiry_date && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      Expires: {formatDate(vehicle.insurance_expiry_date)}
                    </p>
                  )}
                  {vehicle.insurance_premium_amount && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      Premium: ₹{vehicle.insurance_premium_amount.toLocaleString()}
                    </p>
                  )}
                </div>
                {signedDocUrls.insurance && (
                  <a 
                    href={signedDocUrls.insurance} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white rounded-md border border-primary-200 hover:bg-primary-50"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              {/* Fitness Document */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium">Fitness Certificate</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${fitnessStatus.color}`}>
                      {fitnessStatus.label}
                    </span>
                  </div>
                  {vehicle.fitness_certificate_number && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Cert: {vehicle.fitness_certificate_number}
                    </p>
                  )}
                  {vehicle.fitness_expiry_date && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      Expires: {formatDate(vehicle.fitness_expiry_date)}
                    </p>
                  )}
                </div>
                {signedDocUrls.fitness && (
                  <a 
                    href={signedDocUrls.fitness} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white rounded-md border border-primary-200 hover:bg-primary-50"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              {/* Permit Document */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium">Permit</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${permitStatus.color}`}>
                      {permitStatus.label}
                    </span>
                  </div>
                  {vehicle.permit_number && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      {vehicle.permit_number}
                      {vehicle.permit_type && ` (${vehicle.permit_type.charAt(0).toUpperCase() + vehicle.permit_type.slice(1)})`}
                    </p>
                  )}
                  {vehicle.permit_expiry_date && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      Expires: {formatDate(vehicle.permit_expiry_date)}
                    </p>
                  )}
                </div>
                {signedDocUrls.permit && (
                  <a 
                    href={signedDocUrls.permit} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white rounded-md border border-primary-200 hover:bg-primary-50"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              {/* PUC Document */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium">PUC Certificate</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${pucStatus.color}`}>
                      {pucStatus.label}
                    </span>
                  </div>
                  {vehicle.puc_certificate_number && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Cert: {vehicle.puc_certificate_number}
                    </p>
                  )}
                  {vehicle.puc_expiry_date && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      Expires: {formatDate(vehicle.puc_expiry_date)}
                    </p>
                  )}
                </div>
                {signedDocUrls.puc && (
                  <a 
                    href={signedDocUrls.puc} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white rounded-md border border-primary-200 hover:bg-primary-50"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
              
              {/* Tax Document */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium">Tax Receipt</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${taxStatus.color}`}>
                      {taxStatus.label}
                    </span>
                  </div>
                  {vehicle.tax_receipt_number && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Receipt: {vehicle.tax_receipt_number}
                    </p>
                  )}
                  {vehicle.tax_amount && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">
                      Amount: ₹{vehicle.tax_amount.toLocaleString()}
                      {vehicle.tax_period && ` (${vehicle.tax_period})`}
                    </p>
                  )}
                </div>
                {signedDocUrls.tax && (
                  <a 
                    href={signedDocUrls.tax} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white rounded-md border border-primary-200 hover:bg-primary-50"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {/* SECTION 3: PERFORMANCE STATS */}
          <div className="space-y-5">
            {/* Performance Stats Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">Performance</h3>
                <BarChart2 className="h-5 w-5 text-primary-500" />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">Total Trips</span>
                  </div>
                  <span className="text-lg font-medium text-gray-900">
                    {stats?.totalTrips || 0}
                  </span>
                </div>
                
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Truck className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">Distance Covered</span>
                  </div>
                  <span className="text-lg font-medium text-gray-900">
                    {stats?.totalDistance?.toLocaleString() || 0} km
                  </span>
                </div>
                
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Fuel className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700">Average Mileage</span>
                  </div>
                  <span className="text-lg font-medium text-success-600">
                    {stats?.averageKmpl?.toFixed(2) || '--'} km/L
                  </span>
                </div>
              </div>
            </div>
            
            {/* Reminders Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">Service Reminders</h3>
                <Clock className="h-5 w-5 text-primary-500" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2">
                  <span className="text-sm text-gray-700">Reminders Enabled</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${vehicle.remind_service ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'}`}>
                    {vehicle.remind_service ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                {vehicle.remind_service && (
                  <>
                    <div className="flex justify-between items-center p-2">
                      <span className="text-sm text-gray-700">Days Before Service</span>
                      <span className="text-sm font-medium">
                        {vehicle.service_reminder_days_before || 'Default'} days
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2">
                      <span className="text-sm text-gray-700">KM Before Service</span>
                      <span className="text-sm font-medium">
                        {vehicle.service_reminder_km?.toLocaleString() || 'Default'} km
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2">
                      <span className="text-sm text-gray-700">Contact Assigned</span>
                      <span className="text-sm font-medium">
                        {vehicle.service_reminder_contact_id ? 'Yes' : 'Default Contact'}
                      </span>
                    </div>
                  </>
                )}
                
                {!vehicle.remind_service && (
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Service reminders are disabled for this vehicle</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Additional VAHAN Data Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Database className="h-5 w-5 mr-2 text-primary-500" />
              Additional Vehicle Information
            </h3>
            {vehicle.vahan_last_fetched_at && (
              <span className="text-xs text-gray-500">
                Last updated: {new Date(vehicle.vahan_last_fetched_at).toLocaleString()}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 max-w-4xl">
            {vehicle.financer && (
              <div>
                <p className="text-xs text-gray-500">Financer</p>
                <p className="font-medium">{vehicle.financer}</p>
              </div>
            )}
            
            {vehicle.vehicle_class && (
              <div>
                <p className="text-xs text-gray-500">Vehicle Class</p>
                <p className="font-medium">{vehicle.vehicle_class}</p>
              </div>
            )}
            
            {vehicle.color && (
              <div>
                <p className="text-xs text-gray-500">Color</p>
                <p className="font-medium">{vehicle.color}</p>
              </div>
            )}
            
            {vehicle.cubic_capacity && (
              <div>
                <p className="text-xs text-gray-500">Cubic Capacity</p>
                <p className="font-medium">{vehicle.cubic_capacity} cc</p>
              </div>
            )}
            
            {vehicle.cylinders && (
              <div>
                <p className="text-xs text-gray-500">Cylinders</p>
                <p className="font-medium">{vehicle.cylinders}</p>
              </div>
            )}
            
            {vehicle.unladen_weight && (
              <div>
                <p className="text-xs text-gray-500">Unladen Weight</p>
                <p className="font-medium">{vehicle.unladen_weight} kg</p>
              </div>
            )}
            
            {vehicle.seating_capacity && (
              <div>
                <p className="text-xs text-gray-500">Seating Capacity</p>
                <p className="font-medium">{vehicle.seating_capacity}</p>
              </div>
            )}
            
            {vehicle.emission_norms && (
              <div>
                <p className="text-xs text-gray-500">Emission Norms</p>
                <p className="font-medium">{vehicle.emission_norms}</p>
              </div>
            )}
            
            {vehicle.rc_status && (
              <div>
                <p className="text-xs text-gray-500">RC Status</p>
                <p className="font-medium">{vehicle.rc_status}</p>
              </div>
            )}
            
            {vehicle.national_permit_number && (
              <div>
                <p className="text-xs text-gray-500">National Permit</p>
                <p className="font-medium">{vehicle.national_permit_number}</p>
              </div>
            )}
            
            {vehicle.national_permit_upto && (
              <div>
                <p className="text-xs text-gray-500">Permit Valid Till</p>
                <p className="font-medium">{formatDate(vehicle.national_permit_upto)}</p>
              </div>
            )}
            
            {vehicle.noc_details && (
              <div>
                <p className="text-xs text-gray-500">NOC Details</p>
                <p className="font-medium">{vehicle.noc_details}</p>
              </div>
            )}
          </div>
          
          {!vehicle.financer && 
           !vehicle.vehicle_class &&
           !vehicle.color && 
           !vehicle.cubic_capacity && 
           !vehicle.cylinders && 
           !vehicle.unladen_weight && 
           !vehicle.seating_capacity && 
           !vehicle.emission_norms && 
           !vehicle.rc_status && 
           !vehicle.national_permit_number && (
            <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg mt-4">
              <Info className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-gray-500">No additional information available for this vehicle</span>
            </div>
          )}
          
          {/* Other Info Documents */}
          {vehicle.other_documents && Array.isArray(vehicle.other_documents) && vehicle.other_documents.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vehicle.other_documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700 truncate max-w-[150px]">
                        {doc.name || `Document ${index + 1}`}
                      </span>
                    </div>
                    {signedDocUrls.other[`other_${index}`] && (
                      <a 
                        href={signedDocUrls.other[`other_${index}`]} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white rounded-md border border-primary-200 hover:bg-primary-50"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Financial Summary Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <IndianRupee className="h-5 w-5 mr-2 text-primary-500" />
              Financial Summary
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Insurance Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-1 text-blue-500" />
                Insurance
              </h4>
              <dl className="space-y-1">
                {vehicle.insurance_premium_amount && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">Premium</dt>
                    <dd className="text-sm font-medium">₹{vehicle.insurance_premium_amount.toLocaleString()}</dd>
                  </div>
                )}
                {vehicle.insurance_idv && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">IDV</dt>
                    <dd className="text-sm font-medium">₹{vehicle.insurance_idv.toLocaleString()}</dd>
                  </div>
                )}
                {vehicle.insurance_start_date && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">Start Date</dt>
                    <dd className="text-sm">{formatDate(vehicle.insurance_start_date)}</dd>
                  </div>
                )}
              </dl>
            </div>
            
            {/* Tax Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <IndianRupee className="h-4 w-4 mr-1 text-green-500" />
                Tax
              </h4>
              <dl className="space-y-1">
                {vehicle.tax_amount && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">Amount</dt>
                    <dd className="text-sm font-medium">₹{vehicle.tax_amount.toLocaleString()}</dd>
                  </div>
                )}
                {vehicle.tax_period && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">Period</dt>
                    <dd className="text-sm font-medium capitalize">{vehicle.tax_period}</dd>
                  </div>
                )}
                {vehicle.tax_scope && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">Scope</dt>
                    <dd className="text-sm">{vehicle.tax_scope}</dd>
                  </div>
                )}
              </dl>
            </div>
            
            {/* Other Costs */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <IndianRupee className="h-4 w-4 mr-1 text-purple-500" />
                Other Costs
              </h4>
              <dl className="space-y-1">
                {vehicle.fitness_cost && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">Fitness Cert.</dt>
                    <dd className="text-sm font-medium">₹{vehicle.fitness_cost.toLocaleString()}</dd>
                  </div>
                )}
                {vehicle.permit_cost && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">Permit</dt>
                    <dd className="text-sm font-medium">₹{vehicle.permit_cost.toLocaleString()}</dd>
                  </div>
                )}
                {vehicle.puc_cost && (
                  <div className="flex justify-between">
                    <dt className="text-xs text-gray-500">PUC</dt>
                    <dd className="text-sm font-medium">₹{vehicle.puc_cost.toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
        
        {/* Document Alerts Section */}
        {(insuranceStatus.status === 'expired' || fitnessStatus.status === 'expired' || permitStatus.status === 'expired' || pucStatus.status === 'expired') && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-error-500 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-error-800 font-medium">Expired Document Alert</h3>
                <ul className="mt-1 text-error-700 list-disc list-inside text-sm">
                  {insuranceStatus.status === 'expired' && (
                    <li>Insurance expired on {formatDate(vehicle.insurance_expiry_date)}</li>
                  )}
                  {fitnessStatus.status === 'expired' && (
                    <li>Fitness certificate expired on {formatDate(vehicle.fitness_expiry_date)}</li>
                  )}
                  {permitStatus.status === 'expired' && (
                    <li>Permit expired on {formatDate(vehicle.permit_expiry_date)}</li>
                  )}
                  {pucStatus.status === 'expired' && (
                    <li>PUC certificate expired on {formatDate(vehicle.puc_expiry_date)}</li>
                  )}
                </ul>
                <p className="mt-2 text-sm text-error-700">Please update these documents to maintain compliance.</p>
              </div>
            </div>
          </div>
        )}

        {/* Expiring Soon Alert */}
        {(insuranceStatus.status === 'expiring' || fitnessStatus.status === 'expiring' || permitStatus.status === 'expiring' || pucStatus.status === 'expiring') && 
        !(insuranceStatus.status === 'expired' || fitnessStatus.status === 'expired' || permitStatus.status === 'expired' || pucStatus.status === 'expired') && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-warning-500 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-warning-800 font-medium">Documents Expiring Soon</h3>
                <ul className="mt-1 text-warning-700 list-disc list-inside text-sm">
                  {insuranceStatus.status === 'expiring' && (
                    <li>Insurance expires on {formatDate(vehicle.insurance_expiry_date)}</li>
                  )}
                  {fitnessStatus.status === 'expiring' && (
                    <li>Fitness certificate expires on {formatDate(vehicle.fitness_expiry_date)}</li>
                  )}
                  {permitStatus.status === 'expiring' && (
                    <li>Permit expires on {formatDate(vehicle.permit_expiry_date)}</li>
                  )}
                  {pucStatus.status === 'expiring' && (
                    <li>PUC certificate expires on {formatDate(vehicle.puc_expiry_date)}</li>
                  )}
                </ul>
                <p className="mt-2 text-sm text-warning-700">Please prepare for renewal soon.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Mileage Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Mileage Trends</h3>
          <div className="h-64">
            <MileageChart trips={trips} />
          </div>
        </div>
      </div>
      )}
      
      {/* WhatsApp Share Modal */}
      {showShareModal && selectedVehicleForShare && (
        <VehicleWhatsAppShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          vehicle={selectedVehicleForShare}
          contactNumber={contactNumber}
          signedDocUrls={signedDocUrls}
        />
      )}

      {/* Document Download Modal */}
      {showDownloadModal && (
        <DocumentDownloadModal 
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          vehicle={vehicle}
          signedDocUrls={signedDocUrls}
        />
      )}

      {/* Document Viewer Modal */}
      {showDocumentViewerModal && (
        <DocumentViewerModal
          isOpen={showDocumentViewerModal}
          onClose={() => setShowDocumentViewerModal(false)}
          vehicleNumber={vehicle.registration_number}
          documents={getDocumentsForViewer()}
        />
      )}
    </Layout>
  );
};

export default VehiclePage;