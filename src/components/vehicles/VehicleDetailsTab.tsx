import React, { useState } from 'react';
import {
  FileText, Download, Share2, Eye, Calendar, AlertTriangle,
  Truck, Settings, User, MapPin, Fuel, Hash, Car
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

  return (
    <div className="space-y-6">
      {/* Vehicle Photo Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <VehiclePhotoUpload
          vehicleId={vehicle.id}
          currentPhotoUrl={vehicle.photo_url}
          onPhotoUpdate={(url) => onUpdate({ photo_url: url })}
        />
      </div>

      {/* Vehicle Details Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-gray-600" />
          Vehicle Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicleDetails.map((detail, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-400 mt-0.5">{detail.icon}</div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">{detail.label}</p>
                <p className="text-sm font-medium text-gray-900">
                  {detail.value || '-'}
                </p>
              </div>
            </div>
          ))}
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
                  <div className="flex flex-wrap gap-2">
                    {doc.urls.map((url, index) => (
                      <div key={index} className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                        <button
                          onClick={() => setSelectedDocument({ type: doc.type, url })}
                          className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm font-medium">View</span>
                        </button>
                        
                        <button
                          onClick={() => handleDownload(url, `${vehicle.registration_number}_${doc.type}_${index + 1}`)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span className="text-sm font-medium">Download</span>
                        </button>
                        
                        <button
                          onClick={() => handleShare(doc.type, url)}
                          className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Share</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">No document uploaded</p>
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

export default VehicleDetailsTab;
