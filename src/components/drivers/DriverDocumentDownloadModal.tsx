import React, { useState, useEffect } from 'react';
import { X, Download, Link as LinkIcon } from 'lucide-react';
import { Driver } from '@/types';
import { toast } from 'react-toastify';
import DocumentModalBase, { DocumentItemBase } from '../shared/DocumentModalBase';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DriverDocumentDownloadModal');

interface DriverDocumentDownloadModalProps {
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

interface DocumentItem extends DocumentItemBase {
  size?: string;
}

const DriverDocumentDownloadModal: React.FC<DriverDocumentDownloadModalProps> = ({
  isOpen,
  onClose,
  driver,
  signedDocUrls
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    const docs: DocumentItem[] = [
      {
        id: 'license',
        name: 'License Document',
        url: signedDocUrls.license?.[0],
        selected: !!(signedDocUrls.license && signedDocUrls.license.length > 0),
        size: (signedDocUrls.license && signedDocUrls.license.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.license && signedDocUrls.license.length > 0) ? 'available' : 'missing'
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
  }, [signedDocUrls, driver.other_documents]);

  const handleShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (error) {
      logger.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  if (!isOpen) return null;

  const entityName = driver.name.replace(/\s+/g, '_');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Download Driver Documents</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <DocumentModalBase
          documents={documents}
          setDocuments={setDocuments}
          entityName={entityName}
          onClose={onClose}
          renderActions={(doc) =>
            doc.url ? (
              <>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-900"
                  title="Download document"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleShareLink(doc.url!)}
                  className="text-primary-600 hover:text-primary-900"
                  title="Copy share link"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-gray-300 opacity-50">
                  <Download className="h-4 w-4" />
                </span>
                <span className="text-gray-300 opacity-50">
                  <LinkIcon className="h-4 w-4" />
                </span>
              </>
            )
          }
        />
      </div>
    </div>
  );
};

export default DriverDocumentDownloadModal;
