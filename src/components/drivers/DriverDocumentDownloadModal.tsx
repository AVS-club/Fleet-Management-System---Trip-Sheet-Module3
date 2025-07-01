import React, { useState, useEffect } from 'react';
import { X, Download, CheckSquare, Square, Link as LinkIcon } from 'lucide-react';
import Button from '../ui/Button';
import { Driver } from '../../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

interface DriverDocumentDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  signedDocUrls: {
    license?: string;
    police_verification?: string;
    medical_certificate?: string;
    id_proof?: string;
    other: Record<string, string>;
  };
}

interface DocumentItem {
  id: string;
  name: string;
  url?: string;
  selected: boolean;
  size?: string;
  status: 'available' | 'missing';
}

const DriverDocumentDownloadModal: React.FC<DriverDocumentDownloadModalProps> = ({
  isOpen,
  onClose,
  driver,
  signedDocUrls
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Initialize documents based on signedDocUrls
  useEffect(() => {
    const docs: DocumentItem[] = [
      {
        id: 'license',
        name: 'License Document',
        url: signedDocUrls.license,
        selected: !!signedDocUrls.license,
        size: signedDocUrls.license ? 'PDF' : undefined,
        status: signedDocUrls.license ? 'available' : 'missing'
      },
      {
        id: 'police_verification',
        name: 'Police Verification',
        url: signedDocUrls.police_verification,
        selected: !!signedDocUrls.police_verification,
        size: signedDocUrls.police_verification ? 'PDF' : undefined,
        status: signedDocUrls.police_verification ? 'available' : 'missing'
      },
      {
        id: 'medical_certificate',
        name: 'Medical Certificate',
        url: signedDocUrls.medical_certificate,
        selected: !!signedDocUrls.medical_certificate,
        size: signedDocUrls.medical_certificate ? 'PDF' : undefined,
        status: signedDocUrls.medical_certificate ? 'available' : 'missing'
      },
      {
        id: 'id_proof',
        name: 'Aadhaar / ID Proof',
        url: signedDocUrls.id_proof,
        selected: !!signedDocUrls.id_proof,
        size: signedDocUrls.id_proof ? 'PDF' : undefined,
        status: signedDocUrls.id_proof ? 'available' : 'missing'
      },
    ];
    
    // Add other documents
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
      const folder = zip.folder(`${driver.name.replace(/\s+/g, '_')}_documents`);
      
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
      saveAs(content, `${driver.name.replace(/\s+/g, '_')}_documents.zip`);
    } catch (error) {
      console.error('Error creating zip file:', error);
      toast.error('Failed to download documents');
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };
  
  const anySelected = documents.some(doc => doc.selected);
  const anyDocumentsAvailable = documents.some(doc => doc.url);
  
  if (!isOpen) return null;
  
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
        
        <div className="p-4">
          <div className="mb-4 flex justify-between">
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={!anyDocumentsAvailable}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={!anyDocumentsAvailable}
              >
                Deselect All
              </Button>
            </div>
          </div>
          
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-[40px] px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th scope="col" className="w-[80px] px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="w-[80px] px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className={!doc.url ? 'bg-gray-50' : ''}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        className={`${!doc.url ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        onClick={() => doc.url && toggleDocumentSelection(doc.id)}
                        disabled={!doc.url}
                        title={doc.url ? 'Select document' : 'Document not available'}
                      >
                        {doc.selected && doc.url ? (
                          <CheckSquare className="h-5 w-5 text-primary-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm ${!doc.url ? 'text-gray-400' : 'text-gray-900'}`}>
                      {doc.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        doc.status === 'available' 
                          ? 'bg-success-100 text-success-800' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {doc.status === 'available' ? 'Available' : 'Missing'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex justify-center items-center space-x-3">
                        {doc.url ? (
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                      <Download className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      No documents available for download
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

export default DriverDocumentDownloadModal;