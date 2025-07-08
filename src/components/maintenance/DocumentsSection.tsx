import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { MaintenanceTask } from '../../types';
import FileUpload from '../ui/FileUpload';
import { FileText } from 'lucide-react';

const DocumentsSection: React.FC = () => {
  const { control } = useFormContext<Partial<MaintenanceTask>>();

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Documents</h3>
      <Controller
        control={control}
        name="attachments"
        render={({ field: { value, onChange } }) => (
          <FileUpload
            label="Upload Documents"
            value={value as File | null}
            onChange={onChange}
            accept=".jpg,.jpeg,.png,.pdf"
            helperText="Upload warranty card, or other relevant documents"
            icon={<FileText className="h-4 w-4" />}
          />
        )}
      />
    </div>
  );
};

export default DocumentsSection;
