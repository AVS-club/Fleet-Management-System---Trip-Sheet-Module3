import React, { useEffect, useState } from 'react';
import { FileDown, Share2, Download } from 'lucide-react';
import Button from '../ui/Button';
import WhatsAppButton from './WhatsAppButton';
import DriverDocumentManagerModal from './DriverDocumentManagerModal';
import DriverWhatsAppShareModal from './DriverWhatsAppShareModal';
import DriverDocumentDownloadModal from './DriverDocumentDownloadModal';
import { generateDriverPDF, createShareableDriverLink } from '../../utils/exportUtils';
import { getSignedDriverDocumentUrl } from '../../utils/supabaseStorage';
import { toast } from 'react-toastify';
import type { Driver, Vehicle, Trip } from '@/types';

interface DriverDocumentsProps {
  driver: Driver;
  trips: Trip[];
  primaryVehicle: Vehicle | null;
}

const DriverDocuments: React.FC<DriverDocumentsProps> = ({ driver, trips, primaryVehicle }) => {
  const [exportLoading, setExportLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showDocumentManagerModal, setShowDocumentManagerModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDriverForShare, setSelectedDriverForShare] = useState<Driver | null>(null);
  const [signedDocUrls, setSignedDocUrls] = useState<{
    license?: string[];
    police_verification?: string[];
    medical_certificate?: string[];
    medical_doc_url?: string[];
    id_proof?: string[];
    other: Record<string, string>;
  }>({ other: {} });

  useEffect(() => {
    if (driver) {
      generateSignedUrls(driver);
    }
  }, [driver]);

  const generateSignedUrls = async (driverData: Driver) => {
    const urls: {
      license?: string[];
      police_verification?: string[];
      medical_certificate?: string[];
      medical_doc_url?: string[];
      id_proof?: string[];
      other: Record<string, string>;
    } = { other: {} };
    try {
      if (Array.isArray(driverData.license_doc_url) && driverData.license_doc_url.length > 0) {
        urls.license = await Promise.all(
          driverData.license_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }
      if (Array.isArray(driverData.police_doc_url) && driverData.police_doc_url.length > 0) {
        urls.police_verification = await Promise.all(
          driverData.police_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }
      if (Array.isArray(driverData.aadhar_doc_url) && driverData.aadhar_doc_url.length > 0) {
        urls.id_proof = await Promise.all(
          driverData.aadhar_doc_url.map(path => getSignedDriverDocumentUrl(path))
        );
      }
      if (driverData.medical_doc_url && Array.isArray(driverData.medical_doc_url) && driverData.medical_doc_url.length > 0) {
        urls.medical_doc_url = await Promise.all(
          driverData.medical_doc_url.map(url => getSignedDriverDocumentUrl(url))
        );
      }
      if (driverData.other_documents && Array.isArray(driverData.other_documents)) {
        for (let i = 0; i < driverData.other_documents.length; i++) {
          const doc = driverData.other_documents[i];
          if (doc.file_path && typeof doc.file_path === 'string') {
            urls.other[`other_${i}`] = await getSignedDriverDocumentUrl(doc.file_path);
          } else if (Array.isArray(doc.file_path) && doc.file_path.length > 0) {
            urls.other[`other_${i}`] = await getSignedDriverDocumentUrl(doc.file_path[0]);
          }
        }
      }
      setSignedDocUrls(urls);
    } catch (error) {
      console.error('Error generating signed URLs:', error);
      toast.error('Failed to generate document access links');
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const doc = await generateDriverPDF(driver, trips, primaryVehicle);
      doc.save(`${driver.name.replace(/\s+/g, '_')}_profile.pdf`);
      toast.success('Driver profile exported successfully');
    } catch (error) {
      console.error('Error exporting driver profile:', error);
      toast.error('Failed to export driver profile');
    } finally {
      setExportLoading(false);
    }
  };

  const handleManageDocuments = () => {
    setShowDocumentManagerModal(true);
  };

  const handleDownloadDocuments = () => {
    setShowDownloadModal(true);
  };

  const handleWhatsAppShare = () => {
    setSelectedDriverForShare(driver);
    setShowShareModal(true);
  };

  const handleCreateShareableLink = async () => {
    try {
      setShareLoading(true);
      const link = await createShareableDriverLink(driver.id);
      await navigator.clipboard.writeText(link);
      toast.success('Shareable link copied to clipboard (valid for 7 days)');
    } catch (error) {
      console.error('Error creating shareable link:', error);
      toast.error('Failed to create shareable link');
    } finally {
      setShareLoading(false);
    }
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
        onClick={handleManageDocuments}
        icon={<Download className="h-4 w-4" />}
        title="Manage Documents"
      />

      <Button
        variant="outline"
        onClick={handleDownloadDocuments}
        icon={<Download className="h-4 w-4" />}
        title="Download Documents"
        className="hidden"
      />

      <WhatsAppButton
        onClick={handleWhatsAppShare}
        message={`Driver details for ${driver.name} (License: ${driver.license_number}) from Auto Vital Solution.`}
      />

      <Button
        variant="outline"
        onClick={handleCreateShareableLink}
        isLoading={shareLoading}
        icon={<Share2 className="h-4 w-4" />}
      >
        Share
      </Button>

      {showDocumentManagerModal && (
        <DriverDocumentManagerModal
          isOpen={showDocumentManagerModal}
          onClose={() => setShowDocumentManagerModal(false)}
          driver={driver}
          signedDocUrls={signedDocUrls}
        />
      )}

      {showShareModal && selectedDriverForShare && (
        <DriverWhatsAppShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          driver={selectedDriverForShare}
          signedDocUrls={signedDocUrls}
        />
      )}

      {showDownloadModal && !showDocumentManagerModal && (
        <DriverDocumentDownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          driver={driver}
          signedDocUrls={signedDocUrls}
        />
      )}
    </>
  );
};

export default DriverDocuments;
