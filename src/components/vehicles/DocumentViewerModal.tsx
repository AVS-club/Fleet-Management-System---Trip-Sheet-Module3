import React, { useState } from 'react';
import { X, Eye, Download, FileText, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

interface DocumentFile {
  type: string;
  name: string;
  url: string | null;
  status: 'submitted' | 'missing' | 'expired' | 'expiring';
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleNumber: string;
  documents: DocumentFile[];
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  vehicleNumber,
  documents
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleView = async (url: string) => {
    try {
      // Check if file is PDF (assume it's PDF if the URL includes .pdf)
      if (url.toLowerCase().includes('.pdf')) {
        // Use download-then-open approach for PDFs to handle spaces in filenames
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch document');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        // Assume it's an image
        setSelectedImage(url);
      }
    } catch (error) {
      console.error('View error:', error);
      // Fallback to direct open
      window.open(url, "_blank");
    }
  };

  const handleDownload = (url: string, docName: string) => {
    const link = document.createElement("a");
    link.href = url;
    // Create a filename with vehicle number and document type
    link.download = `${vehicleNumber}_${docName.replace(/\s+/g, '_')}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: DocumentFile['status']) => {
    switch (status) {
      case 'submitted':
        return <Check className="h-4 w-4 text-success-500" />;
      case 'missing':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-error-500" />;
      case 'expiring':
        return <AlertCircle className="h-4 w-4 text-warning-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: DocumentFile['status']) => {
    switch (status) {
      case 'submitted':
        return <span className="text-success-600">Submitted</span>;
      case 'missing':
        return <span className="text-gray-500">Missing</span>;
      case 'expired':
        return <span className="text-error-600">Expired</span>;
      case 'expiring':
        return <span className="text-warning-600">Expiring Soon</span>;
      default:
        return null;
    }
  };

  const getFileIcon = (url: string | null) => {
    if (!url) return <FileText className="h-5 w-5 text-gray-400" />;
    
    if (url.toLowerCase().includes('.pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  // Truncate filename to a reasonable length
  const truncateFilename = (url: string | null) => {
    if (!url) return '';
    
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    
    if (filename.length > 20) {
      return filename.substring(0, 17) + '...';
    }
    
    return filename;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Vehicle Documents - {vehicleNumber}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc, index) => (
                <tr key={index} className={`hover:bg-gray-50 ${doc.status === 'missing' ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getFileIcon(doc.url)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{doc.type}</div>
                        {doc.url && (
                          <div className="text-xs text-gray-500" title={doc.name}>
                            {truncateFilename(doc.url)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(doc.status)}
                      <span className="ml-2 text-sm">
                        {getStatusText(doc.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    {doc.url && (
                      <div className="flex justify-center space-x-3">
                        <button
                          onClick={() => handleView(doc.url!)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="View Document"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc.url!, doc.type)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="Download Document"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              
              {documents.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                    No documents available for this vehicle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg shadow-xl p-2">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-md text-gray-500 hover:text-gray-700 z-10"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-full h-[80vh] flex items-center justify-center">
              <img 
                src={selectedImage} 
                alt="Document Preview" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewerModal;