/**
 * MobileDocumentActions - Inline action buttons for documents
 * 
 * Features:
 * - View, Share, WhatsApp, Download actions
 * - Compact inline design
 * - Touch-optimized buttons
 * - WhatsApp-specific sharing
 */

import React, { useState } from 'react';
import { Eye, Share2, Download, MessageCircle, Loader2 } from 'lucide-react';
import { signedUrlFromPath } from '@/utils/supaSignedUrl';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'react-toastify';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('MobileDocumentActions');

interface MobileDocumentActionsProps {
  vehicleNumber: string;
  docKind: string;
  docPaths: string[] | null;
  expiryDate: string;
}

export const MobileDocumentActions: React.FC<MobileDocumentActionsProps> = ({
  vehicleNumber,
  docKind,
  docPaths,
  expiryDate
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasDocument = docPaths && docPaths.length > 0 && docPaths[0];

  // Generate signed URL
  const getSignedUrl = async () => {
    if (signedUrl) return signedUrl;
    if (!hasDocument) return null;

    setIsLoading(true);
    try {
      const url = await signedUrlFromPath(docPaths[0]);
      setSignedUrl(url);
      return url;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      toast.error('Failed to load document');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // View document
  const handleView = async () => {
    const url = await getSignedUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Share via native API
  const handleShare = async () => {
    const url = await getSignedUrl();
    if (!url) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${docKind.toUpperCase()} - ${vehicleNumber}`,
          text: `${docKind.toUpperCase()} document for ${vehicleNumber}, expires: ${expiryDate}`,
          url: url
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('Share failed:', error);
        toast.error('Share failed');
      }
    }
  };

  // WhatsApp share
  const handleWhatsAppShare = async () => {
    const url = await getSignedUrl();
    if (!url) return;

    try {
      // Try to download and share the actual file
      const filePath = docPaths![0];
      const cleanedPath = filePath
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//, '')
        .replace(/^vehicle-docs\//, '')
        .replace(/^driver-docs\//, '')
        .trim();

      const { data, error } = await supabase.storage
        .from('vehicle-docs')
        .download(cleanedPath);

      if (error) throw error;

      const fileName = `${vehicleNumber}_${docKind}.pdf`;
      const file = new File([data], fileName, { type: data.type || 'application/pdf' });

      // Try Web Share API with file
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${docKind.toUpperCase()} - ${vehicleNumber}`,
          text: `${docKind.toUpperCase()} for ${vehicleNumber}\nExpires: ${expiryDate}`
        });
      } else {
        // Fallback to WhatsApp Web with link
        const message = encodeURIComponent(
          `📄 *${docKind.toUpperCase()} Document*\n` +
          `🚛 Vehicle: ${vehicleNumber}\n` +
          `📅 Expiry: ${expiryDate}\n\n` +
          `View: ${url}\n\n` +
          `_Powered by AVS Logistics_`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
      }
    } catch (error) {
      logger.error('WhatsApp share failed:', error);
      // Fallback to link share
      const message = encodeURIComponent(
        `📄 ${docKind.toUpperCase()} - ${vehicleNumber}\n📅 Expires: ${expiryDate}\n\n${url}`
      );
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };

  // Download document
  const handleDownload = async () => {
    const url = await getSignedUrl();
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = `${vehicleNumber}_${docKind}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  if (!hasDocument) {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="text-xs text-gray-400">No document available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* View */}
      <button
        onClick={handleView}
        disabled={isLoading}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg font-medium text-xs transition-colors touch-manipulation active:scale-95 disabled:opacity-50"
        title="View document"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        <span>View</span>
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        disabled={isLoading}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-xs transition-colors touch-manipulation active:scale-95 disabled:opacity-50"
        title="Share document"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>Share</span>
      </button>

      {/* WhatsApp */}
      <button
        onClick={handleWhatsAppShare}
        disabled={isLoading}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium text-xs transition-colors touch-manipulation active:scale-95 disabled:opacity-50"
        title="Share on WhatsApp"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span>WhatsApp</span>
      </button>

      {/* Download */}
      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="flex items-center justify-center gap-1.5 p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium text-xs transition-colors touch-manipulation active:scale-95 disabled:opacity-50"
        title="Download document"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

