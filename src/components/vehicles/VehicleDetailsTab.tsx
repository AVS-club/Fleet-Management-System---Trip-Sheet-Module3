import React, { useState } from 'react';
import {
  FileText, Download, Share2, Eye, Calendar, AlertTriangle,
  Truck, Settings, User, MapPin, Fuel, Hash, Car, Camera, MessageCircle, Link
} from 'lucide-react';
import { Vehicle } from '../../types';
import VehiclePhotoUpload from './VehiclePhotoUpload';
import DocumentViewer from './DocumentViewer';
import { formatDate, daysUntil } from '../../utils/dateUtils';
import { toast } from 'react-toastify';

interface VehicleDetailsTabProps {
  vehicle: Vehicle;
  onUpdate: (updates: Partial<Vehicle>) => void;
}

const VehicleDetailsTab: React.FC<VehicleDetailsTabProps> = ({
  vehicle,
  onUpdate
}) => {
  const [selectedDocument, setSelectedDocument] = useState<{
    type: string;
    url: string;
  } | null>(null);

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
      urls: vehicle.rc_document_url,
      expiryDate: vehicle.rc_expiry_date,
      expiryField: 'RC Expiry'
    },
    {
      type: 'Insurance',
      label: 'Insurance Document',
      urls: vehicle.insurance_document_url,
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
      urls: vehicle.fitness_document_url,
      expiryDate: vehicle.fitness_expiry_date,
      expiryField: 'Fitness Expiry',
      additionalInfo: [
        { label: 'Certificate Number', value: vehicle.fitness_certificate_number }
      ]
    },
    {
      type: 'Permit',
      label: 'Permit Document',
      urls: vehicle.permit_document_url,
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
      urls: vehicle.puc_document_url,
      expiryDate: vehicle.puc_expiry_date,
      expiryField: 'PUC Expiry',
      additionalInfo: [
        { label: 'Certificate Number', value: vehicle.puc_certificate_number }
      ]
    },
    {
      type: 'Tax',
      label: 'Tax Receipt',
      urls: vehicle.tax_document_url,
      expiryDate: vehicle.tax_paid_upto,
      expiryField: 'Tax Paid Upto',
      additionalInfo: [
        { label: 'Receipt Number', value: vehicle.tax_receipt_number },
        { label: 'Tax Amount', value: vehicle.tax_amount ? `₹${vehicle.tax_amount.toLocaleString()}` : null }
      ]
    }
  ];

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
        console.log('Share failed:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const handlePhotoChange = () => {
    // Trigger photo upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Handle photo upload logic here
        console.log('Photo upload triggered');
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Vehicle Profile Section - Compact */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start gap-4">
          {/* Small Circular Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
              {vehicle.photo_url ? (
                <img
                  src={vehicle.photo_url}
                  alt="Vehicle"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Truck className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <button
              onClick={handlePhotoChange}
              className="absolute bottom-0 right-0 p-1.5 bg-primary-500 text-white rounded-full hover:bg-primary-600"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>

          {/* Vehicle Information Grid - Next to Photo */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Vehicle Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Always show these main fields */}
              <InfoField label="Registration" value={vehicle.registration_number} icon={<Hash />} required />
              <InfoField label="Chassis No." value={vehicle.chassis_number} icon={<Settings />} required />
              <InfoField label="Engine No." value={vehicle.engine_number} icon={<Settings />} required />
              <InfoField label="Make" value={vehicle.make} icon={<Car />} required />
              <InfoField label="Model" value={vehicle.model} icon={<Car />} required />
              <InfoField label="Year" value={vehicle.year} icon={<Calendar />} required />
              <InfoField label="Type" value={vehicle.type} icon={<Truck />} required />
              <InfoField label="Fuel" value={vehicle.fuel_type?.toUpperCase()} icon={<Fuel />} required />
              <InfoField label="Owner" value={vehicle.owner_name} icon={<User />} required />
              
              {/* Show these only if they have values */}
              {vehicle.registration_date && <InfoField label="Reg. Date" value={formatDate(vehicle.registration_date)} icon={<Calendar />} />}
              {vehicle.current_odometer && vehicle.current_odometer > 0 && <InfoField label="Odometer" value={`${vehicle.current_odometer?.toLocaleString()} km`} icon={<MapPin />} />}
              {vehicle.tyre_size && <InfoField label="Tyre Size" value={vehicle.tyre_size} icon={<Settings />} />}
              {vehicle.number_of_tyres && <InfoField label="No. of Tyres" value={vehicle.number_of_tyres} icon={<Settings />} />}
            </div>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-600" />
          Compliance Documents
        </h3>

        <div className="space-y-4">
          {documents.map((doc) => {
            const expiry = getExpiryStatus(doc.expiryDate);
            const hasDocument = doc.urls && doc.urls.length > 0;

            return (
              <div
                key={doc.type}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Document Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{doc.label}</h4>
                    
                    {/* Expiry Status */}
                    {doc.expiryDate && (
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {doc.expiryField}: {formatDate(doc.expiryDate)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${expiry.color}-100 text-${expiry.color}-700`}>
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
                    <AlertTriangle className="h-5 w-5 text-warning-500" />
                  )}
                </div>

                {/* Document Actions */}
                {hasDocument ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(doc.urls[0], '_blank')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </button>
                    
                    <button
                      onClick={() => handleDownload(doc.urls[0], `${vehicle.registration_number}_${doc.type}`)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const message = `${doc.label} for vehicle ${vehicle.registration_number}: ${doc.urls[0]}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </button>
                    
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(doc.urls[0]);
                        toast.success('Link copied to clipboard');
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                    >
                      <Link className="h-4 w-4" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded p-3 text-center text-sm text-gray-500">
                    No document uploaded
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
    </div>
  );
};

// Helper Component for Info Fields
const InfoField: React.FC<{
  label: string;
  value: any;
  icon: React.ReactNode;
  required?: boolean;
}> = ({ label, value, icon, required = false }) => {
  // Show main fields even if empty, hide optional fields if empty
  if (!required && !value) return null;
  
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">
          {value || '-'}
        </p>
      </div>
    </div>
  );
};

export default VehicleDetailsTab;
