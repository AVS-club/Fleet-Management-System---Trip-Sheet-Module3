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

  const currentDocument = documents[currentIndex];
  const isImage = currentDocument?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPDF = currentDocument?.match(/\.pdf$/i);

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
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load document');
  };

  const getFileName = (url: string) => {
    const segments = url.split('/');
    return segments[segments.length - 1] || 'document';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-6xl max-h-full bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {documentType} Documents - {vehicleNumber}
            </h3>
            {documents.length > 1 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{currentIndex + 1} of {documents.length}</span>
                <div className="flex gap-1">
                  <button
                    onClick={handlePrevious}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    disabled={documents.length <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    disabled={documents.length <= 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            {/* Rotate Button (for images) */}
            {isImage && (
              <button
                onClick={handleRotate}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={handleFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
        <div className="flex-1 overflow-auto bg-gray-100">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => window.open(currentDocument, '_blank')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          )}

          {isImage && (
            <div className="flex items-center justify-center p-4 min-h-full">
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

          {isPDF && (
            <div className="h-full">
              <iframe
                src={currentDocument}
                className="w-full h-full border-0"
                onLoad={handleImageLoad}
                onError={handleImageError}
                title={`${documentType} document ${currentIndex + 1}`}
              />
            </div>
          )}

          {!isImage && !isPDF && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Unsupported document type</p>
                <button
                  onClick={() => window.open(currentDocument, '_blank')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Touch Instructions */}
        <div className="md:hidden p-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Pinch to zoom • Double tap to reset zoom • Swipe to close • Use arrow keys to navigate
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiDocumentViewer;
