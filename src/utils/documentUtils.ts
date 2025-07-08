import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Vehicle } from '../types';
import { getSignedDocumentUrl } from './supabaseStorage';

export const downloadVehicleDocuments = async (vehicle: Vehicle): Promise<void> => {
  try {
    const zip = new JSZip();
    const folder = zip.folder(`${vehicle.registration_number}_documents`);
    if (!folder) {
      throw new Error('Failed to create zip folder');
    }
    const downloadPromises: Promise<void>[] = [];
    const addDocumentToZip = async (filePath: string | undefined, fileName: string) => {
      if (!filePath) return;
      try {
        const signedUrl = await getSignedDocumentUrl(filePath);
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${fileName}`);
        const blob = await response.blob();
        folder.file(fileName, blob);
      } catch (error) {
        console.error(`Error downloading ${fileName}:`, error);
      }
    };
    if (vehicle.rc_document_url) {
      downloadPromises.push(addDocumentToZip(vehicle.rc_document_url, `RC_${vehicle.registration_number}.pdf`));
    }
    if (vehicle.insurance_document_url) {
      downloadPromises.push(addDocumentToZip(vehicle.insurance_document_url, `Insurance_${vehicle.registration_number}.pdf`));
    }
    if (vehicle.fitness_document_url) {
      downloadPromises.push(addDocumentToZip(vehicle.fitness_document_url, `Fitness_${vehicle.registration_number}.pdf`));
    }
    if (vehicle.permit_document_url) {
      downloadPromises.push(addDocumentToZip(vehicle.permit_document_url, `Permit_${vehicle.registration_number}.pdf`));
    }
    if (vehicle.puc_document_url) {
      downloadPromises.push(addDocumentToZip(vehicle.puc_document_url, `PUC_${vehicle.registration_number}.pdf`));
    }
    if (vehicle.other_documents && Array.isArray(vehicle.other_documents)) {
      vehicle.other_documents.forEach((doc, index) => {
        if (doc.file_path) {
          downloadPromises.push(addDocumentToZip(doc.file_path, `Other_${index + 1}_${doc.name}.pdf`));
        }
      });
    }
    await Promise.all(downloadPromises);
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${vehicle.registration_number}_documents.zip`);
  } catch (error) {
    console.error('Error creating zip file:', error);
    throw error;
  }
};
