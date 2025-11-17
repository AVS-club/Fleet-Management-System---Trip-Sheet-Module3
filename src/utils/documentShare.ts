import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('documentShare');

export const shareDocument = async (
  documentData: any,
  vehicleNumber: string,
  documentType: string,
  orgName: string = 'AVS Logistics'
) => {
  try {
    // Check if it's an image or PDF
    const isImage = documentData.url?.match(/\.(jpg|jpeg|png|gif)$/i);
    const isPDF = documentData.url?.match(/\.pdf$/i);
    
    if (navigator.share && (isImage || isPDF)) {
      // Fetch the actual file
      const response = await fetch(documentData.url);
      const blob = await response.blob();
      
      // Create a File object with proper name
      const fileName = `${vehicleNumber}_${documentType}.${isImage ? 'jpg' : 'pdf'}`;
      const file = new File([blob], fileName, { 
        type: isImage ? 'image/jpeg' : 'application/pdf' 
      });
      
      // Create message with branding
      const message = `${documentType} Document for ${vehicleNumber}\n\nPowered by AVS for ${orgName}`;
      
      // Share via Web Share API
      await navigator.share({
        files: [file],
        title: `${vehicleNumber} - ${documentType}`,
        text: message
      });
    } else {
      // Fallback for WhatsApp Web or desktop
      const whatsappUrl = createWhatsAppShareUrl(documentData, vehicleNumber, documentType, orgName);
      window.open(whatsappUrl, '_blank');
    }
  } catch (error) {
    logger.error('Share failed:', error);
    // Fallback to download
    downloadDocument(documentData.url, `${vehicleNumber}_${documentType}`);
  }
};

const createWhatsAppShareUrl = (
  documentData: any,
  vehicleNumber: string,
  documentType: string,
  orgName: string
) => {
  const message = encodeURIComponent(
    `📄 *${documentType} Document*\n` +
    `🚛 Vehicle: ${vehicleNumber}\n` +
    `📅 Expiry: ${documentData.expiryDate}\n\n` +
    `View Document: ${documentData.url}\n\n` +
    `_Powered by AVS for ${orgName}_`
  );
  
  return `https://wa.me/?text=${message}`;
};

const downloadDocument = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
