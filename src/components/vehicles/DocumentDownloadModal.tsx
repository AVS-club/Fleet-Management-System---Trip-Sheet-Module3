import React, { useState, useEffect } from 'react';
import { X, Download, CheckSquare, Square } from 'lucide-react';
import Button from '../ui/Button';
import { Vehicle } from '../../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface DocumentDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  signedDocUrls: {
    rc?: string;
    insurance?: string;
    fitness?: string;
    tax?: string;
    permit?: string;
    puc?: string;
    other: Record<string, string>;
  };
}

interface DocumentItem {
  id: string;
  name: string;
  url?: string;
  selected: boolean;
  size?: string;
}

const DocumentDownloadModal: React.FC<DocumentDownloadModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  signedDocUrls
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Initialize documents based on signedDocUrls
  useEffect(() => {
    const docs: DocumentItem[] = [
      {
        id: 'rc',
        name: 'RC Document',
        url: signedDocUrls.rc,
        selected: !!signedDocUrls.rc,
        size: signedDocUrls.rc ? 'PDF' : undefined,
      },
      {
        id: 'insurance',
        name: 'Insurance',
        url: signedDocUrls.insurance,
        selected: !!signedDocUrls.insurance,
        size: signedDocUrls.insurance ? 'PDF' : undefined,
      },
      {
        id: 'fitness',
        name: 'Fitness Certificate',
        url: signedDocUrls.fitness,
        selected: !!signedDocUrls.fitness,
        size: signedDocUrls.fitness ? 'PDF' : undefined,
      },
      {
        id: 'tax',
        name: 'Tax Receipt',
        url: signedDocUrls.tax,
        selected: !!signedDocUrls.tax,
        size: signedDocUrls.tax ? 'PDF' : undefined,
      },
      {
        id: 'permit',
        name: 'Permit',
        url: signedDocUrls.permit,
        selected: !!signedDocUrls.permit,
        size: signedDocUrls.permit ? 'PDF' : undefined,
      },
      {
        id: 'puc',
        name: 'PUC Certificate',
        url: signedDocUrls.puc,
        selected: !!signedDocUrls.puc,
        size: signedDocUrls.puc ? 'PDF' : undefined,
      },
    ];
    
    // Add other documents
    Object.entries(signedDocUrls.other).forEach(([key, url], index) => {
      const docName = vehicle.other_documents && 
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
      });
    });
    
    setDocuments(docs);
  }, [signedDocUrls, vehicle.other_documents]);
  
  const toggleDocumentSelection = (id: string) => {
    setDocuments(docs =>
      docs.map(doc =>
        doc.id === id && doc.url // Only toggle if URL exists
          ? { ...doc, selected: !doc.selected }
          : doc
      )
    );
  };
  
  const selectAll = () => {
    setDocuments(docs =>
      docs.map(doc => ({
        ...doc,
        selected: !!doc.url // Only select if URL exists
      }))
    );
  };
  
  const deselectAll = () => {
    setDocuments(docs =>
      docs.map(doc => ({
        ...doc,
        selected: false
      }))
    );
  };
  
  const handleDownload = async () => {
    const selectedDocs = documents.filter(doc => doc.selected && doc.url);
    if (selectedDocs.length === 0) return;
    
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${vehicle.registration_number}_documents`);
      
      if (!folder) {
        throw new Error('Failed to create zip folder');
      }
      
      // Add all selected documents to the zip
      await Promise.all(selectedDocs.map(async (doc) => {
        if (!doc.url) return;
        
        try {
          // Fetch the document using the signed URL
          const response = await fetch(doc.url);
          if (!response.ok) throw new Error(`Failed to fetch ${doc.name}`);
          
          const blob = await response.blob();
          
          // Determine file extension based on content type or default to pdf
          const contentType = response.headers.get('content-type');
          let fileExt = 'pdf'; // Default extension
          if (contentType) {
            if (contentType.includes('image/jpeg')) fileExt = 'jpg';
            else if (contentType.includes('image/png')) fileExt = 'png';
            else if (contentType.includes('application/pdf')) fileExt = 'pdf';
          }
          
          // Generate a safe filename
          const safeName = doc.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const fileName = `${safeName}.${fileExt}`;
          
          folder.file(fileName, blob);
        } catch (error) {
          console.error(`Error downloading ${doc.name}:`, error);
        }
      }));
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${vehicle.registration_number}_documents.zip`);
    } catch (error) {
      console.error('Error creating zip file:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  const anySelected = documents.some(doc => doc.selected);
  const anyDocumentsAvailable = documents.some(doc => doc.url);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Download Documents</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {anyDocumentsAvailable ? (
            <>
              <div className="mb-4 flex justify-between">
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      !doc.url ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <button
                        type="button"
                        className={`mr-3 ${!doc.url ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        onClick={() => doc.url && toggleDocumentSelection(doc.id)}
                        disabled={!doc.url}
                      >
                        {doc.selected && doc.url ? (
                          <CheckSquare className="h-5 w-5 text-primary-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <span className={`text-sm ${!doc.url ? 'text-gray-400' : 'text-gray-900'}`}>
                        {doc.name}
                      </span>
                    </div>
                    {doc.url ? (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {doc.size}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        Missing
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <Download className="mx-auto h-10 w-10 text-gray-400 mb-4" />
              <p className="text-gray-500">No documents available for download</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDownloading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!anySelected || isDownloading}
            isLoading={isDownloading}
            icon={<Download className="h-4 w-4" />}
          >
            Download Selected
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDownloadModal;