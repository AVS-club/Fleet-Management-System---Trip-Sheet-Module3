import React, { useState } from 'react';
import Button from '../ui/Button';
import WhatsAppButton from './WhatsAppButton';
import VehicleWhatsAppShareModal from './VehicleWhatsAppShareModal';
import DocumentDownloadModal from './DocumentDownloadModal';
import { generateVehiclePDF, createShareableVehicleLink } from '../../utils/exportUtils';
import { toast } from 'react-toastify';
import { FileDown, Download, Share2 } from 'lucide-react';
import type { Vehicle } from '@/types';

interface VehicleActionsProps {
  vehicle: Vehicle;
  stats: {
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
  };
  signedDocUrls: {
    rc?: string[];
    insurance?: string[];
    fitness?: string[];
    tax?: string[];
    permit?: string[];
    puc?: string[];
    other: Record<string, string>;
  };
}

const VehicleActions: React.FC<VehicleActionsProps> = ({ vehicle, stats, signedDocUrls }) => {
  const [exportLoading, setExportLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedVehicleForShare, setSelectedVehicleForShare] = useState<Vehicle | null>(null);

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const doc = await generateVehiclePDF(vehicle, stats);
      doc.save(`${vehicle.registration_number}_profile.pdf`);
      toast.success('Vehicle profile exported successfully');
    } catch (error) {
      console.error('Error exporting vehicle profile:', error);
      toast.error('Failed to export vehicle profile');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadDocuments = () => {
    setShowDownloadModal(true);
  };

  const handleCreateShareableLink = async () => {
    try {
      setShareLoading(true);
      const link = await createShareableVehicleLink(vehicle.id);
      await navigator.clipboard.writeText(link);
      toast.success('Shareable link copied to clipboard (valid for 7 days)');
    } catch (error) {
      console.error('Error creating shareable link:', error);
      toast.error('Failed to create shareable link');
    } finally {
      setShareLoading(false);
    }
  };

  const handleWhatsAppShare = () => {
    setSelectedVehicleForShare(vehicle);
    setShowShareModal(true);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleExportPDF}
        isLoading={exportLoading}
        icon={<FileDown className="h-4 w-4" />}
      >
        Export PDF
      </Button>

      <Button
        variant="outline"
        onClick={handleDownloadDocuments}
        isLoading={downloadLoading}
        icon={<Download className="h-4 w-4" />}
        title="Download Documents"
      />

      <WhatsAppButton
        onClick={handleWhatsAppShare}
        className="text-green-600 hover:text-green-800"
      />

      <Button
        variant="outline"
        onClick={handleCreateShareableLink}
        isLoading={shareLoading}
        icon={<Share2 className="h-4 w-4" />}
      >
        Share
      </Button>

      {showShareModal && selectedVehicleForShare && (
        <VehicleWhatsAppShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          vehicle={selectedVehicleForShare}
          signedDocUrls={signedDocUrls}
        />
      )}

      {showDownloadModal && (
        <DocumentDownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          vehicle={vehicle}
          signedDocUrls={signedDocUrls}
        />
      )}
    </>
  );
};

export default VehicleActions;
