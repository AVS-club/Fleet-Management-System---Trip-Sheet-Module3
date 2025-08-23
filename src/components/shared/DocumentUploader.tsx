import React, { useState, useCallback } from 'react';
import FileUpload from '../ui/FileUpload';
import { uploadVehicleDocument, uploadDriverDocument, UploadProgressCallback } from '../../utils/supabaseStorage';
import { toast } from 'react-toastify';

interface DocumentUploaderProps {
  label: string;
  accept?: string;
  bucketType: 'vehicle' | 'driver';
  entityId: string; // Vehicle ID or Driver ID
  docType: string; // Document type (rc, insurance, license, etc.)
  onUploadComplete?: (filePaths: string[]) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  label,
  accept = '.jpg,.jpeg,.png,.pdf',
  bucketType,
  entityId,
  docType,
  onUploadComplete,
  onUploadError,
  multiple = false,
  helperText,
  required = false,
  disabled = false,
  variant = 'default'
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string>('');

  const handleFileChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setUploadStatus('idle');
    setUploadError('');
    
    if (newFiles.length > 0) {
      // Auto-start upload
      handleUpload(newFiles);
    }
  }, []);

  const handleUpload = useCallback(async (filesToUpload: File[] = files) => {
    if (filesToUpload.length === 0) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError('');

    try {
      const uploadPromises = filesToUpload.map(async (file, index) => {
        const onProgress: UploadProgressCallback = (progress) => {
          // For multiple files, calculate average progress
          const avgProgress = ((index * 100) + progress) / filesToUpload.length;
          setUploadProgress(Math.round(avgProgress));
        };

        if (bucketType === 'vehicle') {
          return await uploadVehicleDocument(file, entityId, docType, onProgress);
        } else {
          return await uploadDriverDocument(file, entityId, docType, onProgress);
        }
      });

      const filePaths = await Promise.all(uploadPromises);
      
      setUploadStatus('success');
      setUploadProgress(100);
      
      // Call completion callback with the uploaded file paths
      onUploadComplete?.(filePaths);
      
      toast.success(`${label} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      setUploadStatus('error');
      onUploadError?.(errorMessage);
      toast.error(`Failed to upload ${label}: ${errorMessage}`);
    }
  }, [files, bucketType, entityId, docType, label, onUploadComplete, onUploadError]);

  const handleRetry = useCallback(() => {
    if (files.length > 0) {
      handleUpload();
    }
  }, [handleUpload, files]);

  return (
    <FileUpload
      label={label}
      helperText={helperText}
      error={uploadStatus === 'error' ? uploadError : undefined}
      accept={accept}
      multiple={multiple}
      value={files}
      onChange={handleFileChange}
      disabled={disabled || uploadStatus === 'uploading'}
      variant={variant}
      progress={uploadProgress}
      uploadStatus={uploadStatus}
      onRetry={handleRetry}
    />
  );
};

export default DocumentUploader;