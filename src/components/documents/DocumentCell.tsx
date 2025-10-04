import React, { useState, useRef, useEffect } from 'react';
import { signedUrlFromPath } from '@/utils/supaSignedUrl';
import { fmtDateWithYear } from '@/utils/dateFmt';
import { shareDocument } from '@/utils/documentShare';
import { 
  Share2, 
  Download, 
  Link, 
  AlertCircle 
} from 'lucide-react';

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
    
    setIsPopoverOpen(!isPopoverOpen);
    
    if (!signedUrl && hasDocument && !isPopoverOpen) {
      setIsLoading(true);
      setError(null);
      
      try {
        const url = await signedUrlFromPath(docPaths![0]);
        setSignedUrl(url);
      } catch (err) {
        setError('Failed to generate link. Please try again.');
        console.error('Error generating signed URL:', err);
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
      'Shree Durga ENT'
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
        title="Tap for actions"
        type="button"
      >
        {formattedDate}
      </button>

      {isPopoverOpen && (
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
          padding: 4px 12px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          min-width: 80px;
        }

        .doc-cell:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .doc-cell--valid {
          color: #16a34a;
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .doc-cell--valid:hover:not(:disabled) {
          background: #dcfce7;
        }

        .doc-cell--expired {
          color: #dc2626;
          border-color: #fecaca;
          background: #fef2f2;
        }

        .doc-cell--expired:hover:not(:disabled) {
          background: #fee2e2;
        }

        .doc-cell--empty {
          color: #6b7280;
          border-color: #e5e7eb;
          background: #f9fafb;
        }

        .doc-popover {
          position: absolute;
          top: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 8px;
          width: 280px;
          z-index: 50;
        }

        .doc-popover__loading,
        .doc-popover__error,
        .doc-popover__hint {
          padding: 8px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }

        .doc-popover__error {
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .doc-popover__actions {
          display: flex;
          gap: 4px;
        }

        .doc-popover__btn {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .doc-popover__btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .doc-popover__btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default DocumentCell;
