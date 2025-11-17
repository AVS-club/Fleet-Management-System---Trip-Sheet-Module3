import React, { useState, useRef, useEffect } from 'react';
import { signedUrlFromPath } from '@/utils/supaSignedUrl';
import { fmtDateWithYear } from '@/utils/dateFmt';
import { shareDocument } from '@/utils/documentShare';
import { createLogger } from '../../utils/logger';
import {
  Share2,
  Download,
  Link,
  AlertCircle
} from 'lucide-react';

const logger = createLogger('DocumentCell');

interface DocumentCellProps {
  vehicleId: string;
  vehicleNumber: string;
  docKind: "insurance" | "fitness" | "permit" | "puc" | "tax" | "rc";
  expiryDate?: string | Date | null;
  docPaths?: string[] | null;
  preferredFormat?: "short" | "long";
  whatsappTo?: string;
}

export const DocumentCell: React.FC<DocumentCellProps> = ({
  vehicleId,
  vehicleNumber,
  docKind,
  expiryDate,
  docPaths,
  preferredFormat = "short",
  whatsappTo
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Check if document exists
  const hasDocument = docPaths && docPaths.length > 0 && docPaths[0];
  
  // Check if date is expired
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
  
  // Format the date
  const formattedDate = fmtDateWithYear(expiryDate, preferredFormat);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        cellRef.current &&
        !cellRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPopoverOpen(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPopoverOpen]);

  // Generate signed URL when popover opens
  const handleCellClick = async () => {
    if (!expiryDate || formattedDate === "—") return;
    
    // Only open popover if document exists
    if (!hasDocument) return;
    
    setIsPopoverOpen(!isPopoverOpen);
    
    if (!signedUrl && hasDocument && !isPopoverOpen) {
      setIsLoading(true);
      setError(null);
      
      try {
        const url = await signedUrlFromPath(docPaths![0]);
        setSignedUrl(url);
      } catch (err) {
        setError('Failed to generate link. Please try again.');
        logger.error('Error generating signed URL:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Enhanced share handler using document sharing utility
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
  };

  // Download handler
  const handleDownload = () => {
    if (!signedUrl) return;
    
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = `${vehicleNumber}_${docKind}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy link handler
  const handleCopyLink = async () => {
    if (!signedUrl) return;
    
    try {
      await navigator.clipboard.writeText(signedUrl);
      // Optional: Show a toast notification here
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const input = document.createElement('input');
      input.value = signedUrl;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  // Determine cell styling
  const getCellClassName = () => {
    if (!expiryDate || formattedDate === "—") {
      return 'doc-cell doc-cell--empty';
    }
    return isExpired ? 'doc-cell doc-cell--expired' : 'doc-cell doc-cell--valid';
  };

  return (
    <div className="doc-cell-wrapper" ref={cellRef}>
      <button
        className={getCellClassName()}
        onClick={handleCellClick}
        disabled={!expiryDate || formattedDate === "—"}
        title={hasDocument ? "Click for actions" : formattedDate}
        type="button"
        style={{ cursor: hasDocument ? 'pointer' : 'default' }}
      >
        {formattedDate}
      </button>

      {isPopoverOpen && hasDocument && (
        <div className="doc-popover" ref={popoverRef}>
          {isLoading && (
            <div className="doc-popover__loading">
              Preparing a 24-hour link...
            </div>
          )}
          
          {error && (
            <div className="doc-popover__error">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          
          {!hasDocument && !isLoading && (
            <div className="doc-popover__hint">
              Document not available
            </div>
          )}
          
          {(signedUrl || !hasDocument) && !isLoading && (
            <div className="doc-popover__actions">
              <button
                onClick={handleShare}
                disabled={!hasDocument}
                className="doc-popover__btn"
                title="Share Document"
              >
                <Share2 size={16} />
                Share
              </button>
              
              <button
                onClick={handleDownload}
                disabled={!hasDocument}
                className="doc-popover__btn"
                title="Download file"
              >
                <Download size={16} />
                Download
              </button>
              
              <button
                onClick={handleCopyLink}
                disabled={!hasDocument}
                className="doc-popover__btn"
                title="Copy link"
              >
                <Link size={16} />
                Copy Link
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .doc-cell-wrapper {
          position: relative;
          display: inline-block;
        }

        .doc-cell {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1.5px solid transparent;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          letter-spacing: -0.01em;
          transition: all 0.2s ease;
          background: transparent;
          min-width: 90px;
          display: inline-block;
          text-align: center;
        }

        .doc-cell:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .doc-cell--valid {
          color: #15803d;
          border-color: #86efac;
          background: #f0fdf4;
          font-weight: 600;
        }

        .doc-cell--valid:hover:not(:disabled) {
          background: #dcfce7;
          border-color: #4ade80;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
        }

        .doc-cell--expired {
          color: #dc2626;
          border-color: #fca5a5;
          background: #fef2f2;
          font-weight: 600;
        }

        .doc-cell--expired:hover:not(:disabled) {
          background: #fee2e2;
          border-color: #f87171;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
        }

        .doc-cell--empty {
          color: #9ca3af;
          border-color: #e5e7eb;
          background: #f9fafb;
          font-weight: 500;
        }

        .doc-popover {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          padding: 12px;
          z-index: 1000;
          min-width: 200px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .doc-popover::before {
          content: '';
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 12px;
          background: white;
          border-left: 1px solid #e5e7eb;
          border-top: 1px solid #e5e7eb;
          transform: translateX(-50%) rotate(45deg);
        }

        .doc-popover__loading,
        .doc-popover__error,
        .doc-popover__hint {
          padding: 8px;
          text-align: center;
          font-size: 13px;
          color: #6b7280;
        }

        .doc-popover__error {
          color: #dc2626;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .doc-popover__actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .doc-popover__btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s ease;
          width: 100%;
        }

        .doc-popover__btn:hover:not(:disabled) {
          background: #10b981;
          color: white;
          transform: translateX(2px);
        }

        .doc-popover__btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .doc-cell {
            font-size: 13px;
            padding: 5px 10px;
            min-width: 75px;
          }

          .doc-popover {
            min-width: 160px;
          }
        }
      `}</style>
    </div>
  );
};

export default DocumentCell;
