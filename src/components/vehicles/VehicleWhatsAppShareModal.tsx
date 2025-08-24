import React, { useState } from 'react';
import { X, MessageSquare, FileText, Link as LinkIcon } from 'lucide-react';
import { Vehicle } from '../../types';
import Button from '../ui/Button';

interface VehicleWhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  signedDocUrls?: {
    rc?: string;
    insurance?: string;
    fitness?: string;
    tax?: string;
    permit?: string;
    puc?: string;
    other: Record<string, string>;
  };
}

const VehicleWhatsAppShareModal: React.FC<VehicleWhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  signedDocUrls = { other: {} }
}) => {
  // Add state for showing document files section
  const [showDocumentFiles, setShowDocumentFiles] = useState(false);

  if (!isOpen) return null;
  
  // Generate Vehicle Details message
  const generateVehicleDetailsMessage = () => {
    return encodeURIComponent(
      `🚛 *Vehicle Snapshot (Auto Vital Solution)*\n\n` +
      `📌 *Registration:* ${vehicle.registration_number}\n` +
      `🏷️ *Make & Model:* ${vehicle.make} ${vehicle.model} (${vehicle.year})\n` +
      `🛞 *Type:* ${vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)} | ${vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1)}\n` +
      `⚙️ *Engine No:* ${vehicle.engine_number || 'N/A'}\n` +
      `🔩 *Chassis No:* ${vehicle.chassis_number || 'N/A'}\n` +
      `⚖️ *GVW/ULW:* ${vehicle.unladen_weight ? `${vehicle.unladen_weight} kg` : 'N/A'} ${vehicle.unladen_weight ? '/ N/A' : ''}\n` +
      `🛣️ *Current Odometer:* ${vehicle.current_odometer.toLocaleString()} km\n` +
      `📦 *Axle Count:* ${vehicle.cylinders || 'N/A'} | *Wheelbase:* ${vehicle.wheelbase || 'N/A'}\n` +
      `🎨 *Color:* ${vehicle.color || 'N/A'} | *Body Type:* ${vehicle.vehicle_class || 'N/A'}\n` +
      `🧾 *Owner:* ${vehicle.owner_name || 'N/A'}\n\n` +
      `✅ Track & manage your fleet on: www.autovitalsolution.com`
    );
  };
  
  // Generate Document Expiry message
  const generateDocumentExpiryMessage = () => {
    return encodeURIComponent(
      `📄 *Document Validity (Auto Vital Solution)*\n\n` +
      `🛻 ${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}\n\n` +
      `🧾 *RC Expiry:* ${vehicle.rc_expiry_date ? new Date(vehicle.rc_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `🛡️ *Insurance:* ${vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `📝 *Fitness:* ${vehicle.fitness_expiry_date ? new Date(vehicle.fitness_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `🚦 *Permit:* ${vehicle.permit_expiry_date ? new Date(vehicle.permit_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `🌬️ *PUC:* ${vehicle.puc_expiry_date ? new Date(vehicle.puc_expiry_date).toLocaleDateString() : 'N/A'}\n` +
      `💰 *Tax Paid Until:* ${vehicle.tax_paid_upto ? new Date(vehicle.tax_paid_upto).toLocaleDateString() : 'N/A'}\n\n` +
      `✅ Track & manage your fleet on: www.autovitalsolution.com`
    );
  };

  // Generate Document File message
  const generateDocumentFileMessage = (docType: string, url: string) => {
    return encodeURIComponent(
      `📄 *Document: ${docType} for ${vehicle.registration_number}*\n\n` +
      `View PDF: ${url}\n\n` +
      `✅ Shared via Auto Vital Solution`
    );
  };
  
  // Handle share on WhatsApp
  const handleShareVehicleDetails = () => {
    const message = generateVehicleDetailsMessage();
    window.open(`https://wa.me/?text=${message}`, '_blank');
    onClose();
  };
  
  const handleShareDocumentDates = () => {
    const message = generateDocumentExpiryMessage();
    window.open(`https://wa.me/?text=${message}`, '_blank');
    onClose();
  };

  // Handle share document file
  const handleShareDocumentFile = (docType: string, url: string) => {
    const message = generateDocumentFileMessage(docType, url);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };
  
  // Check if any document URLs exist
  const hasDocumentUrls = 
    (signedDocUrls.rc && signedDocUrls.rc.length > 0) || 
    (signedDocUrls.insurance && signedDocUrls.insurance.length > 0) || 
    (signedDocUrls.fitness && signedDocUrls.fitness.length > 0) || 
    (signedDocUrls.permit && signedDocUrls.permit.length > 0) || 
    (signedDocUrls.puc && signedDocUrls.puc.length > 0) || 
    (signedDocUrls.tax && signedDocUrls.tax.length > 0) || 
    Object.keys(signedDocUrls.other).length > 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Share Vehicle Info</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            Select what information you'd like to share via WhatsApp:
          </p>
          
          <Button
            onClick={handleShareVehicleDetails}
            className="w-full justify-between"
          >
            <span>Vehicle Details</span>
            <MessageSquare className="h-4 w-4 text-green-100" />
          </Button>
          
          <Button
            onClick={handleShareDocumentDates}
            className="w-full justify-between"
          >
            <span>Document Dates</span>
            <MessageSquare className="h-4 w-4 text-green-100" />
          </Button>

          <Button
            onClick={() => setShowDocumentFiles(!showDocumentFiles)}
            className="w-full justify-between"
          >
            <span>Document Files</span>
            <FileText className="h-4 w-4 text-green-100" />
          </Button>
          
          {showDocumentFiles && (
            <div className="mt-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium mb-3">Available Documents</h4>
              
              {hasDocumentUrls ? (
                <div className="space-y-3">
                  {/* RC Document */}
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm">RC Document</span>
                    <div className="flex items-center gap-2">
                      {signedDocUrls.rc ? (
                        <>
                          <a 
                            href={signedDocUrls.rc} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-primary-600 hover:text-primary-700"
                            title="Open document"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleShareDocumentFile('RC Document', signedDocUrls.rc!)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Missing</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Insurance */}
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm">Insurance</span>
                    <div className="flex items-center gap-2">
                      {signedDocUrls.insurance ? (
                        <>
                          <a 
                            href={signedDocUrls.insurance} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-primary-600 hover:text-primary-700"
                            title="Open document"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleShareDocumentFile('Insurance', signedDocUrls.insurance!)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Missing</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Fitness Certificate */}
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm">Fitness Certificate</span>
                    <div className="flex items-center gap-2">
                      {signedDocUrls.fitness ? (
                        <>
                          <a 
                            href={signedDocUrls.fitness} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-primary-600 hover:text-primary-700"
                            title="Open document"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleShareDocumentFile('Fitness Certificate', signedDocUrls.fitness!)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Missing</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Permit */}
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm">Permit</span>
                    <div className="flex items-center gap-2">
                      {signedDocUrls.permit ? (
                        <>
                          <a 
                            href={signedDocUrls.permit} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-primary-600 hover:text-primary-700"
                            title="Open document"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleShareDocumentFile('Permit', signedDocUrls.permit!)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Missing</span>
                      )}
                    </div>
                  </div>
                  
                  {/* PUC Certificate */}
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm">PUC Certificate</span>
                    <div className="flex items-center gap-2">
                      {signedDocUrls.puc ? (
                        <>
                          <a 
                            href={signedDocUrls.puc} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-primary-600 hover:text-primary-700"
                            title="Open document"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleShareDocumentFile('PUC Certificate', signedDocUrls.puc!)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Missing</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Tax Receipt */}
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm">Tax Receipt</span>
                    <div className="flex items-center gap-2">
                      {signedDocUrls.tax ? (
                        <>
                          <a 
                            href={signedDocUrls.tax} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-primary-600 hover:text-primary-700"
                            title="Open document"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleShareDocumentFile('Tax Receipt', signedDocUrls.tax!)}
                            className="p-1 text-green-600 hover:text-green-700"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Missing</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Other Documents */}
                  {Object.entries(signedDocUrls.other).map(([key, url], index) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-white rounded border">
                      <span className="text-sm">{key}</span>
                      <div className="flex items-center gap-2">
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-1 text-primary-600 hover:text-primary-700"
                          title="Open document"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleShareDocumentFile(key, url)}
                          className="p-1 text-green-600 hover:text-green-700"
                          title="Share on WhatsApp"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-100 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">No document files available for sharing</p>
                </div>
              )}
            </div>
          )}
          
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VehicleWhatsAppShareModal;