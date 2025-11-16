import React, { useState, useEffect } from 'react';
import { X, Download, Share2, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DocumentViewer');

interface DocumentViewerProps {
  document: {
    type: string;
    url: string;
  };
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = document.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPDF = document.url.match(/\.pdf$/i);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, document]);

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
      const response = await fetch(document.url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${document.type}_document`;
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${document.type} Document`,
          text: `View this ${document.type} document`,
          url: document.url
        });
      } catch (error) {
        logger.debug('Share failed:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(document.url);
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

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-6xl max-h-full bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            {document.type} Document
          </h3>
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
                  onClick={() => window.open(document.url, '_blank')}
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
                src={document.url}
                alt={`${document.type} document`}
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
                src={document.url}
                className="w-full h-full border-0"
                onLoad={handleImageLoad}
                onError={handleImageError}
                title={`${document.type} document`}
              />
            </div>
          )}

          {!isImage && !isPDF && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Unsupported document type</p>
                <button
                  onClick={() => window.open(document.url, '_blank')}
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
            Pinch to zoom • Double tap to reset zoom • Swipe to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
