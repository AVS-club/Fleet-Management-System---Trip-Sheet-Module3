import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { createLogger } from '../../utils/logger';

const logger = createLogger('MultiDocumentViewer');

interface MultiDocumentViewerProps {
  documents: string[];
  documentType: string;
  vehicleNumber: string;
  onClose: () => void;
}

// Error Boundary for Document Viewer
class DocumentViewerErrorBoundary extends React.Component<
  { children: React.ReactNode; documentUrl: string; onClose: () => void },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Document Viewer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="bg-gray-900 rounded-lg p-8 max-w-md text-center">
            <FileText className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Unable to Load Document
            </h3>
            <p className="text-gray-400 mb-6">
              {this.state.errorMessage || 'An error occurred while loading the document'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.open(this.props.documentUrl, '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Open in New Tab
              </button>
              <button
                onClick={this.props.onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const MultiDocumentViewer: React.FC<MultiDocumentViewerProps> = ({ 
  documents, 
  documentType, 
  vehicleNumber, 
  onClose 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDocument = documents[currentIndex];
  
  // Log document changes
  useEffect(() => {
    logger.debug(`📄 Loading document ${currentIndex + 1}/${documents.length}:`, currentDocument);
  }, [currentIndex, currentDocument]);
  
  const getFileType = (url: string) => {
    const decodedUrl = decodeURIComponent(url);
    const filename = decodedUrl.split('/').pop()?.split('?')[0] || '';
    
    if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (filename.match(/\.pdf$/i)) return 'pdf';
    return 'unknown';
  };
  
  const fileType = getFileType(currentDocument || '');
  const isImage = fileType === 'image';
  const isPDF = fileType === 'pdf';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrevious = () => {
    logger.debug('⬅️ Previous document');
    setCurrentIndex(prev => (prev - 1 + documents.length) % documents.length);
    setZoom(1);
    setRotation(0);
    setIsLoading(true);
    setError(null);
  };

  const handleNext = () => {
    logger.debug('➡️ Next document');
    setCurrentIndex(prev => (prev + 1) % documents.length);
    setZoom(1);
    setRotation(0);
    setIsLoading(true);
    setError(null);
  };

  // Auto-clear loading state after timeout for each document
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        logger.debug('⏰ Load timeout - clearing loading state');
        setIsLoading(false);
      }, 3000); // 3 second timeout per document

      return () => clearTimeout(timeout);
    }
  }, [isLoading, currentIndex]); // Reset timeout when document changes

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = async () => {
    try {
      const response = await fetch(currentDocument);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${vehicleNumber}_${documentType}_${currentIndex + 1}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Document downloaded successfully');
    } catch (error) {
      logger.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const handleImageLoad = () => {
    logger.debug('✅ Document loaded successfully');
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    logger.error('❌ Document failed to load');
    setIsLoading(false);
    setError('Failed to load document');
  };

  return (
    <DocumentViewerErrorBoundary 
      documentUrl={currentDocument}
      onClose={onClose}
    >
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      {/* Compact Header */}
      <div className="bg-gray-900 text-white px-3 py-2 flex items-center justify-between flex-shrink-0">
        {/* Left: Document Info */}
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-400" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{documentType}</span>
            <span className="text-xs text-gray-400">{vehicleNumber}</span>
          </div>
        </div>

        {/* Center: Navigation (if multiple docs) */}
        {documents.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors"
              title="Previous (←)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm px-2 py-1 bg-gray-800 rounded">
              {currentIndex + 1} / {documents.length}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors"
              title="Next (→)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {isImage && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={handleRotate}
                className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                title="Rotate"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-600 rounded transition-colors ml-1"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Document Content - Maximum Space */}
      <div className="flex-1 overflow-auto bg-black relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Loading...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <FileText className="h-12 w-12 mx-auto mb-2 text-red-500" />
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.open(currentDocument, '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        )}

        {isImage && !isLoading && !error && (
          <div className="h-full flex items-center justify-center p-4">
            <img
              key={currentDocument} // Force remount when document changes
              src={currentDocument}
              alt={`${documentType} ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s',
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        )}

        {isPDF && !isLoading && !error && (
          <iframe
            key={currentDocument} // Force remount when document changes
            src={currentDocument}
            className="w-full h-full border-0"
            onLoad={handleImageLoad}
            onError={handleImageError}
            title={`${documentType} ${currentIndex + 1}`}
          />
        )}

        {!isImage && !isPDF && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-400 mb-4">Unsupported file type</p>
              <button
                onClick={() => window.open(currentDocument, '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Document Switcher (if multiple docs) - Bottom */}
      {documents.length > 1 && (
        <div className="bg-gray-900 px-3 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          {documents.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setZoom(1);
                setRotation(0);
                setIsLoading(true);
                setError(null);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded text-sm transition-colors ${
                index === currentIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
      </div>
    </DocumentViewerErrorBoundary>
  );
};

export default MultiDocumentViewer;