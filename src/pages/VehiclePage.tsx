import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getVehicle, getVehicleStats, getTrips } from '../utils/storage';
import { 
  Truck, Calendar, PenTool as Tool, AlertTriangle, ChevronLeft, 
  Fuel, FileText, Shield, Download, Share2, FileDown, Eye, 
  Info, User, Check, Clock, TrendingUp, BarChart2, Database, Tag
} from 'lucide-react';
import Button from '../components/ui/Button';
import MileageChart from '../components/dashboard/MileageChart';
import VehicleForm from '../components/vehicles/VehicleForm';
import { generateVehiclePDF, downloadVehicleDocuments, createShareableVehicleLink } from '../utils/exportUtils';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import CollapsibleSection from '../components/ui/CollapsibleSection';

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
  const [stats, setStats] = useState<{ totalTrips: number; totalDistance: number; averageKmpl?: number }>({
    totalTrips: 0,
    totalDistance: 0
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
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
        toast.error('Failed to load vehicle data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (!vehicle && !loading) {
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

  if (isEditing && vehicle) {
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
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </Layout>
    );
  }

  // Handle export as PDF
  const handleExportPDF = async () => {
    if (!vehicle) return;
    
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
  const handleDownloadDocuments = async () => {
    if (!vehicle) return;
    
    try {
      setDownloadLoading(true);
      await downloadVehicleDocuments(vehicle);
      toast.success('Vehicle documents downloaded successfully');
    } catch (error) {
      console.error('Error downloading vehicle documents:', error);
      toast.error('Failed to download vehicle documents');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Handle create shareable link
  const handleCreateShareableLink = async () => {
    if (!vehicle) return;
    
    try {
      setShareLoading(true);
      const link = await createShareableVehicleLink(vehicle.id);
      
      // Copy link to clipboard
      await navigator.clipboard.writeText(link);
      toast.success('Shareable link copied to clipboard (valid for 7 days)');
    } catch (error) {
      console.error('Error creating shareable link:', error);
      toast.error('Error creating shareable link: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setShareLoading(false);
    }
  };

  // Helper function to format date for display
  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not set';
    try {
      return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Helper function to determine document status
  const getDocumentStatus = (
    documentExists: boolean | undefined, 
    expiryDate: string | null | undefined
  ) => {
    if (!documentExists) return { label: 'Missing', color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-3.5 w-3.5 mr-1" /> };
    
    if (!expiryDate) return { label: 'Uploaded', color: 'bg-gray-100 text-gray-800', icon: <Check className="h-3.5 w-3.5 mr-1" /> };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    
    // Calculate days until expiry
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (expiry < today) {
      return { label: 'Expired', color: 'bg-error-100 text-error-800', icon: <AlertTriangle className="h-3.5 w-3.5 mr-1" /> };
    } else if (daysUntilExpiry <= 30) {
      return { label: 'Expiring Soon', color: 'bg-warning-100 text-warning-800', icon: <Clock className="h-3.5 w-3.5 mr-1" /> };
    } else {
      return { label: 'Valid', color: 'bg-success-100 text-success-800', icon: <Check className="h-3.5 w-3.5 mr-1" /> };
    }
  };

  return (
    <Layout
      title={`Vehicle: ${vehicle?.registration_number}`}
      subtitle={`${vehicle?.make} ${vehicle?.model} (${vehicle?.year})`}
      actions={
        <div className="flex flex-wrap gap-2">
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
            onClick={handleDownloadDocuments}
            isLoading={downloadLoading}
            icon={<Download className="h-4 w-4" />}
          >
            Download Docs
          </Button>
          
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
            icon={<Tool className="h-4 w-4" />}
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
          {/* Vehicle Information Section */}
          <CollapsibleSection 
            title="Vehicle Information" 
            icon={<Truck className="h-5 w-5" />}
            iconColor="text-blue-600" 
            defaultExpanded={true}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Info Card */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                  <Tag className="h-5 w-5 text-primary-500" />
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Registration</span>
                    <span className="font-medium text-right">{vehicle?.registration_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Make & Model</span>
                    <span className="font-medium text-right">{vehicle?.make} {vehicle?.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Year</span>
                    <span className="font-medium text-right">{vehicle?.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Vehicle Type</span>
                    <span className="font-medium text-right capitalize">{vehicle?.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Fuel Type</span>
                    <span className="font-medium text-right capitalize">{vehicle?.fuel_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      vehicle?.status === 'active' 
                        ? 'bg-success-100 text-success-800'
                        : vehicle?.status === 'maintenance'
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle?.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Odometer Reading</span>
                    <span className="font-medium text-right">{vehicle?.current_odometer?.toLocaleString()} km</span>
                  </div>
                </div>
              </div>

              {/* Owner & Registration Card */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900">Ownership & Registration</h3>
                  <User className="h-5 w-5 text-primary-500" />
                </div>
                
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Owner Name</span>
                    <span className="font-medium text-right">{vehicle?.owner_name || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Engine Number</span>
                    <span className="font-medium text-right font-mono">{vehicle?.engine_number || 'Not available'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Chassis Number</span>
                    <span className="font-medium text-right font-mono">{vehicle?.chassis_number || 'Not available'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Registration Date</span>
                    <span className="font-medium text-right">
                      {vehicle?.registration_date ? formatDate(vehicle.registration_date) : 'Not available'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">RC Expiry Date</span>
                    <span className="font-medium text-right">
                      {vehicle?.rc_expiry_date ? formatDate(vehicle.rc_expiry_date) : 'Not available'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tyre Size</span>
                    <span className="font-medium text-right">{vehicle?.tyre_size || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Number of Tyres</span>
                    <span className="font-medium text-right">{vehicle?.number_of_tyres || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Performance Stats */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900">Performance Stats</h3>
                  <BarChart2 className="h-5 w-5 text-primary-500" />
                </div>
                
                <div className="mt-4 space-y-6">
                  <div>
                    <span className="text-sm text-gray-500">Total Trips</span>
                    <p className="text-2xl font-semibold">{stats?.totalTrips || 0}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Total Distance</span>
                    <p className="text-2xl font-semibold">{stats?.totalDistance?.toLocaleString() || 0} km</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Average Mileage</span>
                    <p className="text-2xl font-semibold text-success-600">
                      {stats?.averageKmpl?.toFixed(2) || '-'} km/L
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Compliance Documents Section */}
          <CollapsibleSection 
            title="Compliance Documents" 
            icon={<FileText className="h-5 w-5" />}
            iconColor="text-amber-600" 
            defaultExpanded={true}
          >
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* RC Document Card */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="font-medium text-gray-900">Registration Certificate (RC)</h4>
                        <p className="text-xs text-gray-500">
                          {vehicle?.rc_expiry_date ? `Expires: ${formatDate(vehicle.rc_expiry_date)}` : 'No expiry data'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getDocumentStatus(vehicle?.rc_copy, vehicle?.rc_expiry_date).color
                    }`}>
                      {getDocumentStatus(vehicle?.rc_copy, vehicle?.rc_expiry_date).icon}
                      {getDocumentStatus(vehicle?.rc_copy, vehicle?.rc_expiry_date).label}
                    </div>
                  </div>
                  
                  {vehicle?.rc_document_url && (
                    <div className="mt-3 flex justify-end">
                      <a 
                        href={vehicle.rc_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Document
                      </a>
                    </div>
                  )}
                </div>

                {/* Insurance Document Card */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="font-medium text-gray-900">Insurance</h4>
                        <p className="text-xs text-gray-500">
                          {vehicle?.insurance_expiry_date 
                            ? `Expires: ${formatDate(vehicle.insurance_expiry_date)}` 
                            : 'No expiry data'}
                        </p>
                        {vehicle?.policy_number && (
                          <p className="text-xs text-gray-500">Policy: {vehicle.policy_number}</p>
                        )}
                        {vehicle?.insurer_name && (
                          <p className="text-xs text-gray-500">Insurer: {vehicle.insurer_name}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getDocumentStatus(vehicle?.insurance_document, vehicle?.insurance_expiry_date).color
                    }`}>
                      {getDocumentStatus(vehicle?.insurance_document, vehicle?.insurance_expiry_date).icon}
                      {getDocumentStatus(vehicle?.insurance_document, vehicle?.insurance_expiry_date).label}
                    </div>
                  </div>
                  
                  {vehicle?.insurance_document_url && (
                    <div className="mt-3 flex justify-end">
                      <a 
                        href={vehicle.insurance_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Document
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Fitness Certificate Card */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="font-medium text-gray-900">Fitness Certificate</h4>
                        <p className="text-xs text-gray-500">
                          {vehicle?.fitness_expiry_date 
                            ? `Expires: ${formatDate(vehicle.fitness_expiry_date)}` 
                            : 'No expiry data'}
                        </p>
                        {vehicle?.fitness_certificate_number && (
                          <p className="text-xs text-gray-500">Cert No: {vehicle.fitness_certificate_number}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getDocumentStatus(vehicle?.fitness_document, vehicle?.fitness_expiry_date).color
                    }`}>
                      {getDocumentStatus(vehicle?.fitness_document, vehicle?.fitness_expiry_date).icon}
                      {getDocumentStatus(vehicle?.fitness_document, vehicle?.fitness_expiry_date).label}
                    </div>
                  </div>
                  
                  {vehicle?.fitness_document_url && (
                    <div className="mt-3 flex justify-end">
                      <a 
                        href={vehicle.fitness_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Document
                      </a>
                    </div>
                  )}
                </div>

                {/* Permit Document Card */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="font-medium text-gray-900">Permit</h4>
                        <p className="text-xs text-gray-500">
                          {vehicle?.permit_expiry_date 
                            ? `Expires: ${formatDate(vehicle.permit_expiry_date)}` 
                            : 'No expiry data'}
                        </p>
                        {vehicle?.permit_number && (
                          <p className="text-xs text-gray-500">Permit No: {vehicle.permit_number}</p>
                        )}
                        {vehicle?.permit_type && (
                          <p className="text-xs text-gray-500">Type: {vehicle.permit_type}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getDocumentStatus(vehicle?.permit_document, vehicle?.permit_expiry_date).color
                    }`}>
                      {getDocumentStatus(vehicle?.permit_document, vehicle?.permit_expiry_date).icon}
                      {getDocumentStatus(vehicle?.permit_document, vehicle?.permit_expiry_date).label}
                    </div>
                  </div>
                  
                  {vehicle?.permit_document_url && (
                    <div className="mt-3 flex justify-end">
                      <a 
                        href={vehicle.permit_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Document
                      </a>
                    </div>
                  )}
                </div>

                {/* Tax Receipt Card */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="font-medium text-gray-900">Tax Receipt</h4>
                        <p className="text-xs text-gray-500">
                          {vehicle?.tax_period && `Period: ${vehicle.tax_period}`}
                        </p>
                        {vehicle?.tax_receipt_number && (
                          <p className="text-xs text-gray-500">Receipt No: {vehicle.tax_receipt_number}</p>
                        )}
                        {vehicle?.tax_amount && (
                          <p className="text-xs text-gray-500">Amount: ₹{vehicle.tax_amount.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getDocumentStatus(vehicle?.tax_receipt_document, null).color
                    }`}>
                      {getDocumentStatus(vehicle?.tax_receipt_document, null).icon}
                      {getDocumentStatus(vehicle?.tax_receipt_document, null).label}
                    </div>
                  </div>
                  
                  {vehicle?.tax_document_url && (
                    <div className="mt-3 flex justify-end">
                      <a 
                        href={vehicle.tax_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Document
                      </a>
                    </div>
                  )}
                </div>

                {/* PUC Certificate Card */}
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <h4 className="font-medium text-gray-900">PUC Certificate</h4>
                        <p className="text-xs text-gray-500">
                          {vehicle?.puc_expiry_date 
                            ? `Expires: ${formatDate(vehicle.puc_expiry_date)}` 
                            : 'No expiry data'}
                        </p>
                        {vehicle?.puc_certificate_number && (
                          <p className="text-xs text-gray-500">Cert No: {vehicle.puc_certificate_number}</p>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      getDocumentStatus(vehicle?.puc_document, vehicle?.puc_expiry_date).color
                    }`}>
                      {getDocumentStatus(vehicle?.puc_document, vehicle?.puc_expiry_date).icon}
                      {getDocumentStatus(vehicle?.puc_document, vehicle?.puc_expiry_date).label}
                    </div>
                  </div>
                  
                  {vehicle?.puc_document_url && (
                    <div className="mt-3 flex justify-end">
                      <a 
                        href={vehicle.puc_document_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded hover:bg-primary-100"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Document
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Other Documents */}
              {vehicle?.other_documents && Array.isArray(vehicle.other_documents) && vehicle.other_documents.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-3">Additional Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicle.other_documents.map((doc, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                          </div>
                          {doc.file && (
                            <a 
                              href={typeof doc.file === 'string' ? doc.file : '#'} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary-600 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        {doc.expiry_date && (
                          <div className="mt-1 text-xs text-gray-500">
                            Expiry: {formatDate(doc.expiry_date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Expiry Summary */}
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Document Status Summary</h3>
                <div className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-900">RC Copy</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getDocumentStatus(vehicle?.rc_copy, vehicle?.rc_expiry_date).color
                          }`}>
                            {getDocumentStatus(vehicle?.rc_copy, vehicle?.rc_expiry_date).icon}
                            {getDocumentStatus(vehicle?.rc_copy, vehicle?.rc_expiry_date).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vehicle?.rc_expiry_date ? formatDate(vehicle.rc_expiry_date) : '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {vehicle?.rc_document_url ? (
                            <a 
                              href={vehicle.rc_document_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary-600 hover:text-primary-800"
                            >
                              View
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-900">Insurance</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getDocumentStatus(vehicle?.insurance_document, vehicle?.insurance_expiry_date).color
                          }`}>
                            {getDocumentStatus(vehicle?.insurance_document, vehicle?.insurance_expiry_date).icon}
                            {getDocumentStatus(vehicle?.insurance_document, vehicle?.insurance_expiry_date).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vehicle?.insurance_expiry_date ? formatDate(vehicle.insurance_expiry_date) : '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {vehicle?.insurance_document_url ? (
                            <a 
                              href={vehicle.insurance_document_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary-600 hover:text-primary-800"
                            >
                              View
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-900">Fitness Certificate</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getDocumentStatus(vehicle?.fitness_document, vehicle?.fitness_expiry_date).color
                          }`}>
                            {getDocumentStatus(vehicle?.fitness_document, vehicle?.fitness_expiry_date).icon}
                            {getDocumentStatus(vehicle?.fitness_document, vehicle?.fitness_expiry_date).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vehicle?.fitness_expiry_date ? formatDate(vehicle.fitness_expiry_date) : '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {vehicle?.fitness_document_url ? (
                            <a 
                              href={vehicle.fitness_document_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary-600 hover:text-primary-800"
                            >
                              View
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-900">Permit</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getDocumentStatus(vehicle?.permit_document, vehicle?.permit_expiry_date).color
                          }`}>
                            {getDocumentStatus(vehicle?.permit_document, vehicle?.permit_expiry_date).icon}
                            {getDocumentStatus(vehicle?.permit_document, vehicle?.permit_expiry_date).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vehicle?.permit_expiry_date ? formatDate(vehicle.permit_expiry_date) : '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {vehicle?.permit_document_url ? (
                            <a 
                              href={vehicle.permit_document_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary-600 hover:text-primary-800"
                            >
                              View
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm text-gray-900">PUC Certificate</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getDocumentStatus(vehicle?.puc_document, vehicle?.puc_expiry_date).color
                          }`}>
                            {getDocumentStatus(vehicle?.puc_document, vehicle?.puc_expiry_date).icon}
                            {getDocumentStatus(vehicle?.puc_document, vehicle?.puc_expiry_date).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vehicle?.puc_expiry_date ? formatDate(vehicle.puc_expiry_date) : '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {vehicle?.puc_document_url ? (
                            <a 
                              href={vehicle.puc_document_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary-600 hover:text-primary-800"
                            >
                              View
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* VAHAN Data Information Section */}
          <CollapsibleSection 
            title="Additional Information" 
            icon={<Database className="h-5 w-5" />}
            iconColor="text-green-600" 
            defaultExpanded={false}
          >
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Technical Specifications Card */}
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-3">Technical Specifications</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Cubic Capacity</span>
                      <span className="font-medium text-right">{vehicle?.cubic_capacity || '-'} cc</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Cylinders</span>
                      <span className="font-medium text-right">{vehicle?.cylinders || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Unladen Weight</span>
                      <span className="font-medium text-right">{vehicle?.unladen_weight ? `${vehicle.unladen_weight} kg` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Seating Capacity</span>
                      <span className="font-medium text-right">{vehicle?.seating_capacity || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Emission Norms</span>
                      <span className="font-medium text-right">{vehicle?.emission_norms || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Vehicle Class</span>
                      <span className="font-medium text-right">{vehicle?.vehicle_class || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Color</span>
                      <span className="font-medium text-right">{vehicle?.color || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Financing Details Card */}
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-3">Financing & Ownership</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Financed By</span>
                      <span className="font-medium text-right">{vehicle?.financer || 'Self-Financed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">NOC Details</span>
                      <span className="font-medium text-right">{vehicle?.noc_details || 'Not Applicable'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">RC Status</span>
                      <span className="font-medium text-right">{vehicle?.rc_status || 'Active'}</span>
                    </div>
                  </div>
                </div>

                {/* National Permit Details Card */}
                <div>
                  <h3 className="text-base font-medium text-gray-900 mb-3">National Permit Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">National Permit No.</span>
                      <span className="font-medium text-right">{vehicle?.national_permit_number || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Valid Until</span>
                      <span className="font-medium text-right">
                        {vehicle?.national_permit_upto && vehicle.national_permit_upto !== "1900-01-01" 
                          ? formatDate(vehicle.national_permit_upto) 
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Documents */}
              {vehicle?.other_info_documents && Array.isArray(vehicle.other_info_documents) && vehicle.other_info_documents.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-base font-medium text-gray-900 mb-3">Additional Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {vehicle.other_info_documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700">Document {index + 1}</span>
                        </div>
                        {typeof doc === 'string' && (
                          <a 
                            href={doc} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary-600 hover:text-primary-800 text-sm"
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VAHAN Data Last Updated */}
              {vehicle?.vahan_last_fetched_at && (
                <div className="mt-4 text-xs text-gray-500 text-right">
                  <div className="flex items-center justify-end">
                    <Info className="h-3 w-3 mr-1" />
                    <span>
                      Last fetched from VAHAN: {format(new Date(vehicle.vahan_last_fetched_at), 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Maintenance & Analytics Section */}
          <CollapsibleSection 
            title="Maintenance & Analytics" 
            icon={<Tool className="h-5 w-5" />}
            iconColor="text-red-600" 
            defaultExpanded={true}
          >
            <div className="space-y-6">
              {/* Service Reminder Settings */}
              {vehicle && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Service Reminders</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      vehicle.remind_service 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.remind_service ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Time-Based Reminders</h4>
                      <p className="text-sm text-gray-700">
                        {vehicle.service_reminder_days_before 
                          ? `Remind ${vehicle.service_reminder_days_before} days before service is due` 
                          : 'No time-based reminder set'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Distance-Based Reminders</h4>
                      <p className="text-sm text-gray-700">
                        {vehicle.service_reminder_km 
                          ? `Remind when odometer is ${vehicle.service_reminder_km} km away from service` 
                          : 'No distance-based reminder set'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mileage Chart */}
              {trips.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Mileage Trends</h3>
                  <div className="h-64">
                    <MileageChart trips={trips} />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Mileage Trends</h3>
                  <p className="text-gray-500">No trip data available to display mileage trends</p>
                </div>
              )}

              {/* Maintenance & Service History */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Maintenance History</h3>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/maintenance', { state: { vehicleId: vehicle?.id } })}
                  >
                    View All Maintenance
                  </Button>
                </div>
                
                <div className="flex flex-col">
                  <div className="-my-2 overflow-x-auto">
                    <div className="py-2 align-middle inline-block min-w-full">
                      <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Service Type
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Odometer
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cost
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {/* This would typically be populated from maintenance tasks data */}
                            <tr className="text-center">
                              <td colSpan={5} className="px-6 py-8 text-sm text-gray-500">
                                No maintenance records available
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </Layout>
  );
};

export default VehiclePage;