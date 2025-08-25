import React, { useState, useEffect } from 'react';
import { X, Download, Link as LinkIcon } from 'lucide-react';
import { Vehicle } from '../../types';
import { toast } from 'react-toastify';
import DocumentModalBase, { DocumentItemBase } from '../shared/DocumentModalBase';

interface DocumentDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
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

interface DocumentItem extends DocumentItemBase {
  size?: string;
}

const DocumentDownloadModal: React.FC<DocumentDownloadModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  signedDocUrls,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    const docs: DocumentItem[] = [
      {
        id: 'rc',
        name: 'RC Document',
        url: signedDocUrls.rc?.[0],
        selected: !!(signedDocUrls.rc && signedDocUrls.rc.length > 0),
        size: (signedDocUrls.rc && signedDocUrls.rc.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.rc && signedDocUrls.rc.length > 0) ? 'available' : 'missing',
      },
      {
        id: 'insurance',
        name: 'Insurance',
        url: signedDocUrls.insurance?.[0],
        selected: !!(signedDocUrls.insurance && signedDocUrls.insurance.length > 0),
        size: (signedDocUrls.insurance && signedDocUrls.insurance.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.insurance && signedDocUrls.insurance.length > 0) ? 'available' : 'missing',
      },
      {
        id: 'fitness',
        name: 'Fitness Certificate',
        url: signedDocUrls.fitness?.[0],
        selected: !!(signedDocUrls.fitness && signedDocUrls.fitness.length > 0),
        size: (signedDocUrls.fitness && signedDocUrls.fitness.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.fitness && signedDocUrls.fitness.length > 0) ? 'available' : 'missing',
      },
      {
        id: 'tax',
        name: 'Tax Receipt',
        url: signedDocUrls.tax?.[0],
        selected: !!(signedDocUrls.tax && signedDocUrls.tax.length > 0),
        size: (signedDocUrls.tax && signedDocUrls.tax.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.tax && signedDocUrls.tax.length > 0) ? 'available' : 'missing',
      },
      {
        id: 'permit',
        name: 'Permit',
        url: signedDocUrls.permit?.[0],
        selected: !!(signedDocUrls.permit && signedDocUrls.permit.length > 0),
        size: (signedDocUrls.permit && signedDocUrls.permit.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.permit && signedDocUrls.permit.length > 0) ? 'available' : 'missing',
      },
      {
        id: 'puc',
        name: 'PUC Certificate',
        url: signedDocUrls.puc?.[0],
        selected: !!(signedDocUrls.puc && signedDocUrls.puc.length > 0),
        size: (signedDocUrls.puc && signedDocUrls.puc.length > 0) ? 'PDF' : undefined,
        status: (signedDocUrls.puc && signedDocUrls.puc.length > 0) ? 'available' : 'missing',
      },
    ];

    Object.entries(signedDocUrls.other).forEach(([key, url], index) => {
      const docName =
        vehicle.other_documents &&
        Array.isArray(vehicle.other_documents) &&
        vehicle.other_documents[index]?.name
          ? vehicle.other_documents[index].name
          : `Additional Document ${index + 1}`;

      docs.push({
        id: `other_${key}`,
        name: docName,
        url,
        selected: true,
        size: 'PDF',
        status: 'available',
      });
    });

    setDocuments(docs);
  }, [signedDocUrls, vehicle.other_documents]);

  const handleShareLink = async (url: string, docName: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`${docName} link copied to clipboard`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Download Documents
          </h3>
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
          entityName={vehicle.registration_number}
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
                  onClick={() => handleShareLink(doc.url!, doc.name)}
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

export default DocumentDownloadModal;
