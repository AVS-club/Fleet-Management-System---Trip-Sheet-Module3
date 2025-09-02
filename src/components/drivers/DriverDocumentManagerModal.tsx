import React, { useState, useEffect } from 'react';
import { X, Download, MessageSquare, Eye } from 'lucide-react';
import Button from '../ui/Button';
import { Driver } from '@/types';
import DocumentModalBase, { DocumentItemBase } from '../shared/DocumentModalBase';

interface DocumentFile extends DocumentItemBase {
  size?: string;
  status: 'available' | 'missing' | 'expired' | 'expiring';
}

interface DriverDocumentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  signedDocUrls: {
    license?: string[];
    police_verification?: string[];
    medical_certificate?: string[];
    medical_doc_url?: string[];
    id_proof?: string[];
    other: Record<string, string>;
  };
}

const DriverDocumentManagerModal: React.FC<DriverDocumentManagerModalProps> = ({
  isOpen,
  onClose,
  driver,
  signedDocUrls
}) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [activeTab, setActiveTab] = useState<'view' | 'download'>('view');

  useEffect(() => {
    const docs: DocumentFile[] = [
      {
        id: 'license',
        name: 'License Document',
        url: signedDocUrls.license?.[0],
        selected: !!(signedDocUrls.license && signedDocUrls.license.length > 0),
        size: (signedDocUrls.license && signedDocUrls.license.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.license && signedDocUrls.license.length > 0)
          ? getDocumentStatus(driver.license_expiry_date)
          : 'missing'
      },
      {
        id: 'police_verification',
        name: 'Police Verification',
        url: signedDocUrls.police_verification?.[0],
        selected: !!(signedDocUrls.police_verification && signedDocUrls.police_verification.length > 0),
        size: (signedDocUrls.police_verification && signedDocUrls.police_verification.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.police_verification && signedDocUrls.police_verification.length > 0) ? 'available' : 'missing'
      },
      {
        id: 'id_proof',
        name: 'Aadhaar / ID Proof',
        url: signedDocUrls.id_proof?.[0],
        selected: !!(signedDocUrls.id_proof && signedDocUrls.id_proof.length > 0),
        size: (signedDocUrls.id_proof && signedDocUrls.id_proof.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.id_proof && signedDocUrls.id_proof.length > 0) ? 'available' : 'missing'
      },
      {
        id: 'medical_doc_url',
        name: 'Medical Certificate',
        url: signedDocUrls.medical_doc_url && signedDocUrls.medical_doc_url.length > 0 ? signedDocUrls.medical_doc_url[0] : undefined,
        selected: !!(signedDocUrls.medical_doc_url && signedDocUrls.medical_doc_url.length > 0),
        size: (signedDocUrls.medical_doc_url && signedDocUrls.medical_doc_url.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.medical_doc_url && signedDocUrls.medical_doc_url.length > 0) ? 'available' : 'missing'
      },
      {
        id: 'id_proof',
        name: 'Aadhaar / ID Proof',
        url: signedDocUrls.id_proof,
        selected: !!signedDocUrls.id_proof,
        size: signedDocUrls.id_proof ? 'PDF' : undefined,
        status: signedDocUrls.id_proof ? 'available' : 'missing'
      }
    ];

    if (driver.other_documents && Array.isArray(driver.other_documents)) {
      driver.other_documents.forEach((doc, index) => {
        const url = signedDocUrls.other[`other_${index}`];
        docs.push({
          id: `other_${index}`,
          name: doc.name || `Additional Document ${index + 1}`,
          url,
          selected: !!url,
          size: url ? 'PDF' : undefined,
          status: url ? 'available' : 'missing'
        });
      });
    }

    setDocuments(docs);
  }, [signedDocUrls, driver.other_documents, driver.license_expiry_date]);

  const getDocumentStatus = (expiryDate?: string): DocumentFile['status'] => {
    if (!expiryDate) return 'available';

    const today = new Date();
    const expiry = new Date(expiryDate);

    if (expiry < today) {
      return 'expired';
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expiry < thirtyDaysFromNow) {
      return 'expiring';
    }

    return 'available';
  };

  const handleShareViaWhatsApp = (document: DocumentFile) => {
    if (!document.url) return;

    const message = encodeURIComponent(
      `📄 *Document: ${document.name} for ${driver.name}*\n\n` +
      `View document: ${document.url}\n\n` +
      `✅ Shared via Auto Vital Solution`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const getStatusClass = (status: DocumentFile['status']) => {
    switch (status) {
      case 'expired':
        return 'bg-error-100 text-error-800';
      case 'expiring':
        return 'bg-warning-100 text-warning-800';
      case 'available':
        return 'bg-success-100 text-success-800';
      case 'missing':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: DocumentFile['status']) => {
    switch (status) {
      case 'expired':
        return 'Expired';
      case 'expiring':
        return 'Expiring Soon';
      case 'available':
        return 'Available';
      case 'missing':
        return 'Missing';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Driver Documents</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`py-2 px-4 ${activeTab === 'view' ? 'border-b-2 border-primary-500 text-primary-600 font-medium' : 'text-gray-500'}`}
              onClick={() => setActiveTab('view')}
            >
              View & Share
            </button>
            <button
              className={`py-2 px-4 ${activeTab === 'download' ? 'border-b-2 border-primary-500 text-primary-600 font-medium' : 'text-gray-500'}`}
              onClick={() => setActiveTab('download')}
            >
              Bulk Download
            </button>
          </div>

          {activeTab === 'view' ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800 mb-2">Available Documents</h4>
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-medium text-gray-800">{doc.name}</h5>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusClass(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </div>
                    </div>
                    {doc.url && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => window.open(doc.url, '_blank')}
                          className="p-1.5 bg-primary-50 text-primary-600 rounded hover:bg-primary-100"
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleShareViaWhatsApp(doc)}
                          className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100"
                          title="Share via WhatsApp"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <a
                          href={doc.url}
                          download
                          className="p-1.5 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                          title="Download Document"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DocumentModalBase
              documents={documents}
              setDocuments={setDocuments}
              entityName={driver.name.replace(/\s+/g, '_')}
              onClose={onClose}
              renderStatus={(doc) => (
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(doc.status)}`}>
                  {getStatusLabel(doc.status)}
                </span>
              )}
              renderActions={(doc) =>
                doc.url ? (
                  <>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-900"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleShareViaWhatsApp(doc)}
                      className="text-green-600 hover:text-green-900"
                      title="Share via WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-gray-300 opacity-50">
                      <Eye className="h-4 w-4" />
                    </span>
                    <span className="text-gray-300 opacity-50">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                  </>
                )
              }
            />
          )}
        </div>

        {activeTab === 'view' && (
          <div className="p-4 border-t border-gray-200 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDocumentManagerModal;
