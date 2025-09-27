import React, { useState } from 'react';
import { Download, MessageCircle, Link, Check } from 'lucide-react';
import { toast } from 'react-toastify';

interface VehicleShareActionsProps {
  vehicleId: string;
  vehicleNumber: string;
  documents: Array<{
    type: string;
    url: string;
    available: boolean;
  }>;
}

const VehicleShareActions: React.FC<VehicleShareActionsProps> = ({
  vehicleId,
  vehicleNumber,
  documents
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleDownloadAll = async () => {
    const availableDocs = documents.filter(d => d.available && d.url);
    
    if (availableDocs.length === 0) {
      toast.warning('No documents available to download');
      return;
    }

    // Download each document
    for (const doc of availableDocs) {
      try {
        const link = document.createElement('a');
        link.href = doc.url;
        link.download = `${vehicleNumber}_${doc.type}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download ${doc.type}:`, error);
      }
    }
    
    toast.success(`Downloaded ${availableDocs.length} documents`);
  };

  const handleWhatsAppShare = () => {
    const vehicleUrl = `${window.location.origin}/vehicles/${vehicleId}`;
    const message = `Vehicle Details - ${vehicleNumber}\n\nView complete details and documents:\n${vehicleUrl}`;
    
    // Open WhatsApp with pre-filled message
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  const handleCopyLink = async () => {
    const vehicleUrl = `${window.location.origin}/vehicles/${vehicleId}`;
    
    try {
      await navigator.clipboard.writeText(vehicleUrl);
      setLinkCopied(true);
      toast.success('Link copied to clipboard');
      
      // Reset after 3 seconds
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="flex gap-2">
      {/* Download All */}
      <button
        onClick={handleDownloadAll}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Download</span>
      </button>

      {/* WhatsApp Share */}
      <button
        onClick={handleWhatsAppShare}
        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          linkCopied 
            ? 'bg-green-50 text-green-600' 
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
      >
        {linkCopied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
        <span className="hidden sm:inline">
          {linkCopied ? 'Copied!' : 'Copy Link'}
        </span>
      </button>
    </div>
  );
};

export default VehicleShareActions;
