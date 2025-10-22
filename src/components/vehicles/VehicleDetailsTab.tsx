import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Eye, Calendar, AlertTriangle,
  Truck, Settings, User, MapPin, Fuel, Hash, Car, Camera, MessageCircle, Link, Tag as TagIcon
} from 'lucide-react';
import { Vehicle } from '../../types';
import { Tag } from '../../types/tags';
import DocumentViewer from './DocumentViewer';
import MultiDocumentViewer from './MultiDocumentViewer';
import VehicleTagSelector from './VehicleTagSelector';
import VehicleTagHistoryModal from '../admin/VehicleTagHistoryModal';
import VehicleTagBadges from './VehicleTagBadges';
import { removeTagFromVehicle } from '../../utils/api/tags';
import { formatDate, daysUntil } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import { vehicleColors } from '../../utils/vehicleColors';
import { createShortUrl, createWhatsAppShareLink } from '../../utils/urlShortener';
import { supabase } from '../../utils/supabaseClient';
import { usePermissions } from '../../hooks/usePermissions';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VehicleDetailsTab');

interface VehicleDetailsTabProps {
  vehicle: Vehicle;
  onUpdate: (updates: Partial<Vehicle>) => void;
  signedDocUrls: {
    rc?: string[];
    insurance?: string[];
    fitness?: string[];
    tax?: string[];
    permit?: string[];
    puc?: string[];
    other: Record<string, string>;
  };
}

const VehicleDetailsTab: React.FC<VehicleDetailsTabProps> = ({
  vehicle,
  onUpdate,
  signedDocUrls
}) => {
  const { permissions } = usePermissions();
  
  // Debug logging for insurance documents
  logger.debug('🔍 VehicleDetailsTab - received signedDocUrls:', signedDocUrls);
  logger.debug('🔍 VehicleDetailsTab - insurance URLs:', signedDocUrls.insurance);
  logger.debug('🔍 Insurance URLs from vehicle:', vehicle.insurance_document_url);
  logger.debug('🔍 Full vehicle object:', vehicle);
  const [selectedDocument, setSelectedDocument] = useState<{
    type: string;
    url: string;
  } | null>(null);
  const [documentViewer, setDocumentViewer] = useState<{
    show: boolean;
    urls: string[];
    type: string;
  } | null>(null);
  const [isViewingDocuments, setIsViewingDocuments] = useState(false);
  const [vehicleTags, setVehicleTags] = useState<Tag[]>([]);
  const [showTagHistory, setShowTagHistory] = useState(false);

  // Load vehicle tags
  useEffect(() => {
    if (vehicle?.id) {
      loadVehicleTags();
    }
  }, [vehicle?.id]);

  const loadVehicleTags = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_tags')
        .select(`
          tags (*)
        `)
        .eq('vehicle_id', vehicle.id);

      if (error) throw error;
      const tags = (data || []).map(item => item.tags).filter(Boolean);
      setVehicleTags(tags);
    } catch (error) {
      logger.error('Error loading vehicle tags:', error);
    }
  };

  const vehicleDetails = [
    { label: 'Registration Number', value: vehicle.registration_number, icon: <Hash /> },
    { label: 'Chassis Number', value: vehicle.chassis_number, icon: <Settings /> },
    { label: 'Engine Number', value: vehicle.engine_number, icon: <Settings /> },
    { label: 'Make', value: vehicle.make, icon: <Car /> },
    { label: 'Model', value: vehicle.model, icon: <Car /> },
    { label: 'Year', value: vehicle.year, icon: <Calendar /> },
    { label: 'Type', value: vehicle.type, icon: <Truck /> },
    { label: 'Fuel Type', value: vehicle.fuel_type?.toUpperCase(), icon: <Fuel /> },
    { label: 'Owner Name', value: vehicle.owner_name, icon: <User /> },
    { label: 'Registration Date', value: formatDate(vehicle.registration_date), icon: <Calendar /> },
    { label: 'Current Odometer', value: `${vehicle.current_odometer?.toLocaleString()} km`, icon: <MapPin /> },
    { label: 'Tyre Size', value: vehicle.tyre_size, icon: <Settings /> },
    { label: 'Number of Tyres', value: vehicle.number_of_tyres, icon: <Settings /> },
  ];

  const documents = [
    {
      type: 'RC',
      label: 'Registration Certificate',
      urls: signedDocUrls.rc || [],
      expiryDate: vehicle.rc_expiry_date,
      expiryField: 'RC Expiry'
    },
    {
      type: 'Insurance',
      label: 'Insurance Document',
      urls: signedDocUrls.insurance || [],
      expiryDate: vehicle.insurance_expiry_date,
      expiryField: 'Insurance Expiry',
      additionalInfo: [
        { label: 'Policy Number', value: vehicle.policy_number },
        { label: 'Insurer', value: vehicle.insurer_name },
        { label: 'Premium', value: vehicle.insurance_premium_amount ? `₹${vehicle.insurance_premium_amount.toLocaleString()}` : null }
      ]
    },
    {
      type: 'Fitness',
      label: 'Fitness Certificate',
      urls: signedDocUrls.fitness || [],
      expiryDate: vehicle.fitness_expiry_date,
      expiryField: 'Fitness Expiry',
      additionalInfo: [
        { label: 'Certificate Number', value: vehicle.fitness_certificate_number }
      ]
    },
    {
      type: 'Permit',
      label: 'Permit Document',
      urls: signedDocUrls.permit || [],
      expiryDate: vehicle.permit_expiry_date,
      expiryField: 'Permit Expiry',
      additionalInfo: [
        { label: 'Permit Number', value: vehicle.permit_number },
        { label: 'Permit Type', value: vehicle.permit_type },
        { label: 'Issuing State', value: vehicle.issuing_state }
      ]
    },
    {
      type: 'PUC',
      label: 'PUC Certificate',
      urls: signedDocUrls.puc || [],
      expiryDate: vehicle.puc_expiry_date,
      expiryField: 'PUC Expiry',
      additionalInfo: [
        { label: 'Certificate Number', value: vehicle.puc_certificate_number }
      ]
    },
    {
      type: 'Tax',
      label: 'Tax Receipt',
      urls: signedDocUrls.tax || [],
      expiryDate: vehicle.tax_paid_upto,
      expiryField: 'Tax Paid Upto',
      additionalInfo: [
        { label: 'Receipt Number', value: vehicle.tax_receipt_number },
        { label: 'Tax Amount', value: vehicle.tax_amount ? `₹${vehicle.tax_amount.toLocaleString()}` : null }
      ]
    }
  ];

  // Debug the documents array
  logger.debug('🔍 Documents array created:', documents);
  logger.debug('🔍 Insurance document in array:', documents.find(doc => doc.type === 'Insurance'));

  const getExpiryStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return { status: 'unknown', color: 'gray', days: null };
    
    const days = daysUntil(expiryDate);
    
    if (days < 0) return { status: 'expired', color: 'red', days: Math.abs(days) };
    if (days <= 7) return { status: 'critical', color: 'red', days };
    if (days <= 30) return { status: 'warning', color: 'yellow', days };
    if (days <= 60) return { status: 'upcoming', color: 'blue', days };
    return { status: 'valid', color: 'green', days };
  };

  const handleShare = async (docType: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vehicle ${docType} - ${vehicle.registration_number}`,
          text: `${docType} document for vehicle ${vehicle.registration_number}`,
          url: url
        });
      } catch (error) {
        logger.debug('Share failed:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      } catch (error) {
        logger.error('Failed to copy to clipboard:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      // Use fetch to download the file
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch document');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Document downloaded successfully');
    } catch (error) {
      logger.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const handleViewDocuments = async (docType: string, docPaths: string[] | null) => {
    logger.debug(`🔍 handleViewDocuments called for ${docType}:`, docPaths);
    
    if (!docPaths || docPaths.length === 0) {
      toast.info(`No ${docType} documents available`);
      return;
    }

    setIsViewingDocuments(true);

    try {
      // CRITICAL: signedDocUrls already contains valid signed URLs
      // We should NOT try to reconstruct them - just use them directly!
      
      // Filter out any null values
      const validUrls = docPaths.filter(url => url != null) as string[];
      
      if (validUrls.length === 0) {
        toast.error('No valid document URLs available');
        setIsViewingDocuments(false);
        return;
      }

      logger.debug(`✅ Opening viewer with ${validUrls.length} documents:`, validUrls);
      
      // For single documents, open in new tab
      if (validUrls.length === 1) {
        window.open(validUrls[0], '_blank');
        toast.success('Document opened in new tab');
      } else {
        // For multiple documents, use MultiDocumentViewer
        setDocumentViewer({
          show: true,
          urls: validUrls,
          type: docType
        });
      }
      
    } catch (error) {
      logger.error('❌ View error:', error);
      toast.error('Unable to view documents');
    } finally {
      setIsViewingDocuments(false);
    }
  };

  const handlePhotoChange = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Upload photo to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${vehicle.id}/photo_${Date.now()}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('vehicle-photos')
            .upload(fileName, file);

          if (error) {
            throw error;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('vehicle-photos')
            .getPublicUrl(fileName);

          // Update vehicle with new photo URL
          onUpdate({ photo_url: publicUrl });
          toast.success('Vehicle photo updated successfully');
        } catch (error) {
          logger.error('Photo upload failed:', error);
          toast.error('Failed to upload photo');
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Vehicle Profile Section - Mobile Responsive */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Small Circular Photo */}
          <div className="relative flex-shrink-0 self-center sm:self-start">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
              {vehicle.photo_url ? (
                <img
                  src={vehicle.photo_url}
                  alt="Vehicle"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
              )}
            </div>
            <button
              onClick={handlePhotoChange}
              className="absolute bottom-0 right-0 p-1 sm:p-1.5 bg-primary-500 text-white rounded-full hover:bg-primary-600"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>

          {/* Vehicle Information Grid - Mobile Responsive */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Vehicle Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Always show these main fields with colors */}
              <InfoField label="Registration" value={vehicle.registration_number} icon={<Hash />} required color="registration" />
              <InfoField label="Chassis No." value={vehicle.chassis_number} icon={<Settings />} required color="technical" />
              <InfoField label="Engine No." value={vehicle.engine_number} icon={<Settings />} required color="technical" />
              <InfoField label="Make" value={vehicle.make} icon={<Car />} required color="vehicle" />
              <InfoField label="Model" value={vehicle.model} icon={<Car />} required color="vehicle" />
              <InfoField label="Year" value={vehicle.year} icon={<Calendar />} required color="vehicle" />
              <InfoField label="Type" value={vehicle.type} icon={<Truck />} required color="vehicle" />
              <InfoField label="Fuel" value={vehicle.fuel_type?.toUpperCase()} icon={<Fuel />} required color="fuel" />
              <InfoField label="Owner" value={vehicle.owner_name} icon={<User />} required color="owner" />
              
              {/* Show these only if they have values */}
              {vehicle.registration_date && <InfoField label="Reg. Date" value={formatDate(vehicle.registration_date)} icon={<Calendar />} color="registration" />}
              {vehicle.current_odometer && vehicle.current_odometer > 0 && <InfoField label="Odometer" value={`${vehicle.current_odometer?.toLocaleString()} km`} icon={<MapPin />} color="technical" />}
              {vehicle.tyre_size && <InfoField label="Tyre Size" value={vehicle.tyre_size} icon={<Settings />} color="technical" />}
              {vehicle.number_of_tyres && <InfoField label="No. of Tyres" value={vehicle.number_of_tyres} icon={<Settings />} color="technical" />}
              
              {/* Compact Tags Row */}
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <TagIcon className="h-4 w-4 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Tags</p>
                  {vehicleTags.length > 0 ? (
                    <VehicleTagBadges 
                      tags={vehicleTags} 
                      onRemove={async (tagId) => {
                        try {
                          await removeTagFromVehicle(vehicle.id, tagId);
                          setVehicleTags(prev => prev.filter(t => t.id !== tagId));
                          toast.success('Tag removed');
                        } catch (error) {
                          logger.error('Error:', error);
                          toast.error('Failed to remove tag');
                        }
                      }}
                      size="sm"
                      maxDisplay={2}
                    />
                  ) : (
                    <span className="text-sm text-gray-400">None</span>
                  )}
                </div>
                <button
                  onClick={() => setShowTagHistory(true)}
                  className="text-xs text-primary-600 hover:underline shrink-0"
                >
                  History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Section - Mobile Responsive */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-600" />
          Compliance Documents
        </h3>

        <div className="space-y-3 sm:space-y-4">
          {documents.map((doc) => {
            const expiry = getExpiryStatus(doc.expiryDate);
            const hasDocument = doc.urls && doc.urls.length > 0;

            return (
              <div
                key={doc.type}
                className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
              >
                {/* Document Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{doc.label}</h4>
                    
                    {/* Expiry Status - Always show if expiry date exists */}
                    {doc.expiryDate && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {doc.expiryField}: {formatDate(doc.expiryDate)}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${expiry.color}-100 text-${expiry.color}-700 self-start sm:self-auto`}>
                          {expiry.status === 'expired' ? `Expired ${expiry.days} days ago` :
                           expiry.status === 'valid' ? 'Valid' :
                           `Expires in ${expiry.days} days`}
                        </span>
                      </div>
                    )}

                    {/* Additional Info */}
                    {doc.additionalInfo && (
                      <div className="mt-2 space-y-1">
                        {doc.additionalInfo.map((info, idx) => (
                          info.value && (
                            <p key={idx} className="text-sm text-gray-600">
                              <span className="font-medium">{info.label}:</span> {info.value}
                            </p>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Document Status Icon */}
                  {!hasDocument && (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>

                {/* Document Actions - Mobile Responsive */}
                {hasDocument ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleViewDocuments(doc.type, doc.urls)}
                      disabled={isViewingDocuments}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${
                        isViewingDocuments 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">
                        {isViewingDocuments ? 'Loading...' : `View (${doc.urls.length})`}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => handleDownload(doc.urls[0], `${vehicle.registration_number}_${doc.type}`)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">Download</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const whatsappUrl = createWhatsAppShareLink(
                          doc.label,
                          vehicle.registration_number,
                          doc.urls[0]
                        );
                        window.open(whatsappUrl, '_blank');
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">WhatsApp</span>
                    </button>
                    
                    <button
                      onClick={async () => {
                        try {
                          const shortUrl = createShortUrl(doc.urls[0]);
                          await navigator.clipboard.writeText(shortUrl);
                          toast.success('Short link copied to clipboard');
                        } catch (error) {
                          logger.error('Failed to copy to clipboard:', error);
                          toast.error('Failed to copy link');
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition-colors"
                    >
                      <Link className="h-4 w-4" />
                      <span className="text-sm">Copy Link</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-center text-sm text-gray-500 mb-2">
                      No document uploaded
                    </div>
                    {/* Show expiry info even when no document */}
                    {doc.expiryDate && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-2 text-xs text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {doc.expiryField}: {formatDate(doc.expiryDate)}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${expiry.color}-100 text-${expiry.color}-700 self-center sm:self-auto`}>
                          {expiry.status === 'expired' ? `Expired ${expiry.days} days ago` :
                           expiry.status === 'valid' ? 'Valid' :
                           `Expires in ${expiry.days} days`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Multi Document Viewer Modal */}
      {documentViewer?.show && (
        <MultiDocumentViewer
          documents={documentViewer.urls}
          documentType={documentViewer.type}
          vehicleNumber={vehicle.registration_number}
          onClose={() => setDocumentViewer(null)}
        />
      )}

      {/* Tag History Modal */}
      <VehicleTagHistoryModal
        isOpen={showTagHistory}
        onClose={() => setShowTagHistory(false)}
        vehicleId={vehicle.id}
        registrationNumber={vehicle.registration_number}
      />
    </div>
  );
};

// Helper Component for Info Fields
const InfoField: React.FC<{
  label: string;
  value: any;
  icon: React.ReactNode;
  required?: boolean;
  color?: 'registration' | 'vehicle' | 'fuel' | 'owner' | 'technical';
}> = ({ label, value, icon, required = false, color = 'technical' }) => {
  // Show main fields even if empty, hide optional fields if empty
  if (!required && !value) return null;
  
  const colorClasses = vehicleColors.cards[color];
  
  return (
    <div className={`rounded-lg p-3 border ${colorClasses}`}>
      <div className="flex items-start gap-2">
        <div className="text-gray-400 mt-0.5">{icon}</div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-sm font-bold text-gray-900">
            {value || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsTab;
