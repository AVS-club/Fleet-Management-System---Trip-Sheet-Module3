/**
 * MobileDocumentCell - Mobile-optimized document cell with bottom sheet actions
 * 
 * Features:
 * - Touch-friendly tap interaction
 * - Bottom sheet action menu instead of popover
 * - Large, accessible action buttons
 * - Smooth animations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signedUrlFromPath } from '@/utils/supaSignedUrl';
import { fmtDateWithYear } from '@/utils/dateFmt';
import { shareDocument } from '@/utils/documentShare';
import { createLogger } from '../../utils/logger';
import {
  Share2,
  Download,
  Link,
  AlertCircle,
  X,
  FileText,
  ExternalLink
} from 'lucide-react';

const logger = createLogger('MobileDocumentCell');

interface MobileDocumentCellProps {
  vehicleId: string;
  vehicleNumber: string;
  docKind: "insurance" | "fitness" | "permit" | "puc" | "tax" | "rc";
  expiryDate?: string | Date | null;
  docPaths?: string[] | null;
  preferredFormat?: "short" | "long";
}

export const MobileDocumentCell: React.FC<MobileDocumentCellProps> = ({
  vehicleId,
  vehicleNumber,
  docKind,
  expiryDate,
  docPaths,
  preferredFormat = "short"
}) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Check if document exists
  const hasDocument = docPaths && docPaths.length > 0 && docPaths[0];
  
  // Check if date is expired
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
  
  // Check if expiring soon (within 30 days)
  const isExpiringSoon = expiryDate ? (() => {
    const daysUntil = Math.floor((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil > 0 && daysUntil <= 30;
  })() : false;
  
  // Format the date
  const formattedDate = fmtDateWithYear(expiryDate, preferredFormat);

  // Handle cell tap
  const handleCellTap = async () => {
    if (!expiryDate || formattedDate === "—" || !hasDocument) return;
    
    setIsSheetOpen(true);
    
    // Generate signed URL if not already generated
    if (!signedUrl) {
      setIsLoading(true);
      setError(null);
      
      try {
        const url = await signedUrlFromPath(docPaths![0]);
        setSignedUrl(url);
      } catch (err) {
        setError('Failed to load document. Please try again.');
        logger.error('Error generating signed URL:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // View document
  const handleView = () => {
    if (!signedUrl) return;
    
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
    showFeedback('Opening document...');
    setTimeout(() => setIsSheetOpen(false), 1000);
  };

  // Share document
  const handleShare = async () => {
    if (!signedUrl) return;
    
    const documentData = {
      url: signedUrl,
      expiryDate: formattedDate,
      type: docKind.toUpperCase()
    };
    
    await shareDocument(
      documentData,
      vehicleNumber,
      docKind.toUpperCase(),
      'AVS Logistics'
    );
    
    showFeedback('Share options opened');
    setTimeout(() => setIsSheetOpen(false), 1000);
  };

  // Download document
  const handleDownload = () => {
    if (!signedUrl) return;
    
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = `${vehicleNumber}_${docKind}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showFeedback('Download started');
    setTimeout(() => setIsSheetOpen(false), 1000);
  };

  // Copy link
  const handleCopyLink = async () => {
    if (!signedUrl) return;
    
    try {
      await navigator.clipboard.writeText(signedUrl);
      showFeedback('Link copied to clipboard!');
    } catch (err) {
      // Fallback
      const input = document.createElement('input');
      input.value = signedUrl;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showFeedback('Link copied!');
    }
    
    setTimeout(() => setIsSheetOpen(false), 1500);
  };

  // Show feedback message
  const showFeedback = (message: string) => {
    setActionFeedback(message);
    setTimeout(() => setActionFeedback(null), 2000);
  };

  // Determine cell styling
  const getCellClassName = () => {
    let baseClasses = 'inline-block px-3 py-1.5 rounded-lg font-semibold text-sm transition-all touch-manipulation';
    
    if (!expiryDate || formattedDate === "—") {
      return `${baseClasses} bg-gray-100 text-gray-500 border-2 border-gray-200`;
    }
    
    if (isExpired) {
      return `${baseClasses} bg-error-100 text-error-700 border-2 border-error-300 ${hasDocument ? 'active:scale-95' : ''}`;
    }
    
    if (isExpiringSoon) {
      return `${baseClasses} bg-warning-100 text-warning-700 border-2 border-warning-300 ${hasDocument ? 'active:scale-95' : ''}`;
    }
    
    return `${baseClasses} bg-success-100 text-success-700 border-2 border-success-300 ${hasDocument ? 'active:scale-95' : ''}`;
  };

  return (
    <>
      {/* Document Cell Button */}
      <button
        className={getCellClassName()}
        onClick={handleCellTap}
        disabled={!hasDocument}
        type="button"
        style={{ 
          cursor: hasDocument ? 'pointer' : 'default',
          minHeight: '36px',
          minWidth: '85px'
        }}
      >
        {formattedDate}
      </button>

      {/* Bottom Sheet Action Menu */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSheetOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[101] max-h-[70vh] overflow-hidden"
            >
              {/* Handle Bar */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {docKind.toUpperCase()} Document
                  </h3>
                  <p className="text-sm text-gray-600">
                    {vehicleNumber} • Expires: {formattedDate}
                  </p>
                </div>
                <button
                  onClick={() => setIsSheetOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full touch-manipulation"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="px-4 py-4">
                {isLoading && (
                  <div className="text-center py-8 text-gray-600">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-2" />
                    <p className="text-sm">Loading document...</p>
                  </div>
                )}

                {error && (
                  <div className="bg-error-50 border-l-4 border-error-500 p-4 mb-4">
                    <div className="flex items-center gap-2 text-error-700">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {actionFeedback && (
                  <div className="bg-success-50 border-l-4 border-success-500 p-4 mb-4">
                    <p className="text-sm font-medium text-success-700">{actionFeedback}</p>
                  </div>
                )}

                {signedUrl && !isLoading && (
                  <div className="space-y-3">
                    {/* View Document Button */}
                    <button
                      onClick={handleView}
                      className="w-full flex items-center gap-3 px-4 py-4 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl font-medium text-base transition-colors touch-manipulation active:scale-98"
                    >
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <ExternalLink className="h-5 w-5" />
                      </div>
                      <span className="flex-1 text-left">View Document</span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={handleShare}
                      className="w-full flex items-center gap-3 px-4 py-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-medium text-base transition-colors touch-manipulation active:scale-98"
                    >
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Share2 className="h-5 w-5" />
                      </div>
                      <span className="flex-1 text-left">Share</span>
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={handleDownload}
                      className="w-full flex items-center gap-3 px-4 py-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium text-base transition-colors touch-manipulation active:scale-98"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Download className="h-5 w-5" />
                      </div>
                      <span className="flex-1 text-left">Download</span>
                    </button>

                    {/* Copy Link Button */}
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-3 px-4 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium text-base transition-colors touch-manipulation active:scale-98"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Link className="h-5 w-5" />
                      </div>
                      <span className="flex-1 text-left">Copy Link</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Safe area padding for bottom */}
              <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileDocumentCell;

