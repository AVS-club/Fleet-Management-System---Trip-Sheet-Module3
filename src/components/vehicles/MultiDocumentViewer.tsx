import React, { useState, useEffect } from 'react';
import { X, Download, Share2, ZoomIn, ZoomOut, RotateCw, Maximize2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

interface MultiDocumentViewerProps {
  documents: string[];
  documentType: string;
  vehicleNumber: string;
  onClose: () => void;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const currentDocument = documents[currentIndex];
  
  // Better file type detection that handles URL-encoded filenames and tokens
  const getFileType = (url: string) => {
    // Decode URL and extract filename
    const decodedUrl = decodeURIComponent(url);
    const filename = decodedUrl.split('/').pop()?.split('?')[0] || '';
    
    if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (filename.match(/\.pdf$/i)) return 'pdf';
    if (filename.match(/\.(doc|docx)$/i)) return 'document';
    if (filename.match(/\.(txt)$/i)) return 'text';
    
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
    setCurrentIndex(prev => (prev - 1 + documents.length) % documents.length);
    setZoom(1);
    setRotation(0);
    setIsLoading(true);
    setError(null);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % documents.length);
    setZoom(1);
    setRotation(0);
    setIsLoading(true);
    setError(null);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

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
      console.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${documentType} Document - ${vehicleNumber}`,
          text: `${documentType} document for vehicle ${vehicleNumber}`,
          url: currentDocument
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(currentDocument);
      toast.success('Link copied to clipboard');
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
    setIsInitialLoad(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load document');
    setIsInitialLoad(false);
  };

  // Handle initial load timeout to prevent infinite loading
  useEffect(() => {
    if (isInitialLoad) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setError('Document took too long to load');
          setIsInitialLoad(false);
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isInitialLoad, isLoading]);

  const getFileName = (url: string) => {
    const segments = url.split('/');
    return segments[segments.length - 1] || 'document';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full h-full max-w-6xl max-h-full bg-white rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
              {documentType} Documents - {vehicleNumber}
            </h3>
            {documents.length > 1 && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 flex-shrink-0">
                <span className="hidden sm:inline">{currentIndex + 1} of {documents.length}</span>
                <span className="sm:hidden">{currentIndex + 1}/{documents.length}</span>
                <div className="flex gap-1">
                  <button
                    onClick={handlePrevious}
                    className="p-1 hover:bg-gray-100 rounded transition-colors touch-manipulation"
                    disabled={documents.length <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1 hover:bg-gray-100 rounded transition-colors touch-manipulation"
                    disabled={documents.length <= 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Zoom Controls - Hidden on mobile for space */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Rotate Button (for images) - Hidden on mobile */}
            {isImage && (
              <button
                onClick={handleRotate}
                className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            )}

            {/* Fullscreen Button - Hidden on mobile */}
            <button
              onClick={handleFullscreen}
              className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Share Button - Hidden on mobile */}
            <button
              onClick={handleShare}
              className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Document Navigation (if multiple documents) */}
        {documents.length > 1 && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2 overflow-x-auto">
              {documents.map((doc, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setZoom(1);
                    setRotation(0);
                    setIsLoading(true);
                    setError(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                    index === currentIndex
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>{getFileName(doc)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document Content */}
        <div className="flex-1 overflow-auto bg-gray-100 relative">
          {isLoading && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center p-4">
                <div className="text-red-500 mb-4">
                  <FileText className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-red-600 mb-2">{error}</p>
                </div>
                <button
                  onClick={() => window.open(currentDocument, '_blank')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors touch-manipulation"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          )}

          {isImage && !isLoading && !error && (
            <div className="flex items-center justify-center p-2 sm:p-4 min-h-full">
              <img
                src={currentDocument}
                alt={`${documentType} document ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          )}

          {isPDF && !isLoading && !error && (
            <div className="h-full w-full">
              <iframe
                src={currentDocument}
                className="w-full h-full border-0"
                onLoad={handleImageLoad}
                onError={handleImageError}
                title={`${documentType} document ${currentIndex + 1}`}
                style={{ minHeight: '500px' }}
              />
            </div>
          )}

          {!isImage && !isPDF && !isLoading && !error && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center p-4">
                <div className="text-gray-500 mb-4">
                  <FileText className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">Unsupported document type</p>
                </div>
                <button
                  onClick={() => window.open(currentDocument, '_blank')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors touch-manipulation"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Touch Instructions */}
        <div className="md:hidden p-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-500 text-center">
            Pinch to zoom • Double tap to reset zoom • Swipe to navigate • Tap to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiDocumentViewer;
