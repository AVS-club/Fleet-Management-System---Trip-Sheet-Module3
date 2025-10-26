/**
 * DocumentsSection - Vehicle document uploads
 *
 * Handles:
 * - RC document upload
 * - Insurance document upload
 * - Fitness certificate upload
 * - Tax document upload
 * - Permit document upload
 * - PUC document upload
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Vehicle } from '@/types';
import DocumentUploader from '../../shared/DocumentUploader';
import { FileText } from 'lucide-react';

interface DocumentsSectionProps {
  formMethods: UseFormReturn<Vehicle>;
  vehicleId?: string;
  disabled?: boolean;
  onDocumentStage?: (docType: string, files: File[], existingPaths: string[]) => void;
  onDocumentDelete?: (docType: string, paths: string[]) => void;
}

const DOCUMENT_TYPES = [
  { key: 'rc', label: 'RC (Registration Certificate)', required: true },
  { key: 'insurance', label: 'Insurance Documents', required: false },
  { key: 'fitness', label: 'Fitness Certificate', required: false },
  { key: 'tax', label: 'Road Tax Documents', required: false },
  { key: 'permit', label: 'Permit Documents', required: false },
  { key: 'puc', label: 'PUC (Pollution Certificate)', required: false },
] as const;

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  formMethods,
  vehicleId,
  disabled = false,
  onDocumentStage,
  onDocumentDelete,
}) => {
  const { watch, setValue } = formMethods;

  const handleDocumentChange = (docType: string, files: File[]) => {
    const fieldName = `${docType}_document_url` as keyof Vehicle;
    const existingPaths = (watch(fieldName) as string[]) || [];

    // Notify parent about staged documents
    if (onDocumentStage) {
      onDocumentStage(docType, files, existingPaths);
    }
  };

  const handleDocumentDelete = (docType: string, paths: string[]) => {
    const fieldName = `${docType}_document_url` as keyof Vehicle;
    const currentPaths = (watch(fieldName) as string[]) || [];

    // Remove deleted paths from form state
    const updatedPaths = currentPaths.filter(path => !paths.includes(path));
    setValue(fieldName, updatedPaths as any);

    // Notify parent about deletions
    if (onDocumentDelete) {
      onDocumentDelete(docType, paths);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <FileText className="h-5 w-5 mr-2" />
        Vehicle Documents
      </h3>

      <div className="space-y-4">
        {DOCUMENT_TYPES.map(({ key, label, required }) => {
          const fieldName = `${key}_document_url` as keyof Vehicle;
          const existingDocuments = (watch(fieldName) as string[]) || [];

          return (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <DocumentUploader
                label={label}
                vehicleId={vehicleId || ''}
                documentType={key}
                existingDocuments={existingDocuments}
                onUpload={(files) => handleDocumentChange(key, files)}
                onDelete={(paths) => handleDocumentDelete(key, paths)}
                required={required}
                disabled={disabled}
                multiple={true}
              />
            </div>
          );
        })}
      </div>

      <div className="text-sm text-gray-500 mt-4">
        <p>
          <strong>Tip:</strong> You can upload multiple documents for each type.
          Accepted formats: PDF, JPG, PNG (max 5MB per file)
        </p>
      </div>
    </div>
  );
};
