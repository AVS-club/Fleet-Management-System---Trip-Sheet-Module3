import React, { useState } from 'react';
import { X, MessageSquare, FileText, Link as LinkIcon } from 'lucide-react';
import Button from '../ui/Button';
import { Driver } from '../../types';

interface DriverWhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  signedDocUrls?: {
    license?: string;
    police_verification?: string;
    medical_doc_url?: string[]; // ⚠️ Confirm field refactor here
    medical_doc_url?: string[]; // Changed from medical_certificate
    other: Record<string, string>;
  };
}

const DriverWhatsAppShareModal: React.FC<DriverWhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  driver,
  signedDocUrls = { other: {} }
}) => {
  // Add state for showing document files section
  const [showDocumentFiles, setShowDocumentFiles] = useState(false);

  if (!isOpen) return null;
  // ⚠️ Confirm field refactor here
  // Generate Driver Details message
  const generateDriverDetailsMessage = () => {
    return encodeURIComponent(
      `👨‍✈️ *Driver Profile (Auto Vital Solution)*\n\n` +
      `📌 *Name:* ${driver.name}\n` +
      `🪪 *License:* ${driver.license_number || 'N/A'}\n` +
      `📞 *Contact:* ${driver.contact_number || 'N/A'}\n` +
      `📧 *Email:* ${driver.email || 'N/A'}\n` +
      `⏱️ *Experience:* ${driver.experience_years} years\n` +
      `📅 *Join Date:* ${new Date(driver.join_date).toLocaleDateString() || 'N/A'}\n` +
      `🚦 *Status:* ${driver.status || 'N/A'}\n\n` +
      `✅ Track & manage your fleet on: www.autovitalsolution.com`
    );
  };
  
  // Generate Document Expiry message
  const generateDocumentExpiryMessage = () => {
    return encodeURIComponent(
      `📄 *Driver Document Validity (Auto Vital Solution)*\n\n` +
      `👨‍✈️ ${driver.name} - ${driver.license_number || 'N/A'}\n\n` +
      `🪪 *License Expiry:* ${driver.license_expiry_date ? new Date(driver.license_expiry_date).toLocaleDateString() : 'N/A'}\n\n` +
      `✅ Track & manage your fleet on: www.autovitalsolution.com`
    );
  };

  // Generate Document File message
  const generateDocumentFileMessage = (docType: string, url: string) => {
    return encodeURIComponent(
      `📄 *Document: ${docType} for ${driver.name}*\n\n` +
      `View Document: ${url}\n\n` +
      `✅ Shared via Auto Vital Solution`
    );
  };
  
  // Handle share on WhatsApp
  const handleShareDriverDetails = () => {
    const message = generateDriverDetailsMessage();
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
    signedDocUrls.license || 
    signedDocUrls.police_verification || 
    signedDocUrls.medical_certificate || 
    signedDocUrls.id_proof || 
    Object.keys(signedDocUrls.other).length > 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Share Driver Info</h3>
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
            onClick={handleShareDriverDetails}
            className="w-full justify-between"
          >
            <span>Driver Details</span>
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
                  {/* License Document */}
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm">License Document</span>
                    <div className="flex items-center gap-2">
                      {signedDocUrls.license ? (
                        <>
                          <a 
                            href={signedDocUrls.license} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-primary-600 hover:text-primary-700"
                            title="Open document"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleShareDocumentFile('License Document', signedDocUrls.license!)}
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
                  
                  {/* Medical Document */}
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm">Medical Certificate</span>
                    <div className="flex items-center gap-2">
                      {signedDocUrls.medical_doc_url && signedDocUrls.medical_doc_url.length > 0 ? (
                        <>
                          <a 
                            href={signedDocUrls.medical_doc_url[0]} // Assuming only one medical doc for sharing
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-primary-600 hover:text-primary-700"
                            title="Open document"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleShareDocumentFile('Medical Certificate', signedDocUrls.medical_doc_url![0])}
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
                      <span className="text-sm">Other Document {index + 1}</span>
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
                          onClick={() => handleShareDocumentFile(`Additional Document ${index + 1}`, url)}
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

export default DriverWhatsAppShareModal;