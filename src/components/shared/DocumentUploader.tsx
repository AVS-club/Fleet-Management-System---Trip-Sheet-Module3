import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, XCircle, RefreshCw, Eye, Download } from 'lucide-react';
import { cn } from '../../utils/cn';
import { uploadVehicleDocument, uploadDriverDocument } from '../../utils/supabaseStorage';
import config from '../../utils/config';

interface DocumentUploaderProps {
  label: string;
  bucketType: 'vehicle' | 'driver';
  entityId: string;
  docType: string;
  accept?: string;
  multiple?: boolean;
  value?: File[];
  onChange?: (files: File[]) => void;
  onUploadComplete?: (filePaths: string[]) => void;
  disabled?: boolean;
  className?: string;
  initialFilePaths?: string[];
  required?: boolean;
  helperText?: string;
}

interface UploadState {
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  uploadedPaths: string[];
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  label,
  bucketType,
  entityId,
  docType,
  accept = '.jpg,.jpeg,.png,.pdf',
  multiple = false,
  value = [],
  onChange,
  onUploadComplete,
  disabled = false,
  className,
  initialFilePaths = [],
  required = false,
  helperText
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
    uploadedPaths: initialFilePaths
  });

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    // Update form state immediately
    if (onChange) {
      onChange(multiple ? [...value, ...fileArray] : fileArray.slice(0, 1));
    }

    // Start upload process
    setUploadState(prev => ({
      ...prev,
      status: 'uploading',
      progress: 0,
      errorMessage: undefined
    }));

    try {
      const uploadPromises = fileArray.map(async (file, index) => {
        const onProgress = (progress: number) => {
          setUploadState(prev => ({
            ...prev,
            progress: multiple ? 
              Math.round(((index + progress / 100) / fileArray.length) * 100) :
              progress
          }));
        };

        if (bucketType === 'vehicle') {
          return await uploadVehicleDocument(file, entityId, docType, onProgress);
        } else {
          return await uploadDriverDocument(file, entityId, docType, onProgress);
        }
      });

      const uploadedPaths = await Promise.all(uploadPromises);
      
      setUploadState(prev => ({
        ...prev,
        status: 'success',
        progress: 100,
        uploadedPaths: [...prev.uploadedPaths, ...uploadedPaths]
      }));

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(uploadedPaths);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Upload failed'
      }));
    }
  }, [bucketType, entityId, docType, multiple, value, onChange, onUploadComplete]);

  const handleRetry = () => {
    setUploadState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      errorMessage: undefined
    }));
  };

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'uploading':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-error-500" />;
      default:
        return <Upload className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (uploadState.status) {
      case 'uploading':
        return `Uploading... ${uploadState.progress}%`;
      case 'success':
        return 'Uploaded';
      case 'error':
        return uploadState.errorMessage || 'Upload failed';
      default:
        return 'Click to upload';
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || uploadState.status === 'uploading') return;
    
    handleFileSelect(e.dataTransfer.files);
  }, [disabled, uploadState.status, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const hasExistingFiles = uploadState.uploadedPaths.length > 0;

  return (
    <div className={cn('form-group', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-error-500 dark:text-error-400 ml-1">*</span>}
        </label>
      )}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 p-4",
          uploadState.status === 'error'
            ? "border-error-500 dark:border-error-500 bg-error-50"
            : uploadState.status === 'success'
            ? "border-success-500 dark:border-success-500 bg-success-50"
            : "border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500",
          disabled && "opacity-50 cursor-not-allowed",
          uploadState.status === 'uploading' && "pointer-events-none"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => {
          if (!disabled && uploadState.status !== 'uploading') {
            document.getElementById(`file-input-${docType}`)?.click();
          }
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getStatusText()}
            </p>
            
            {uploadState.status === 'uploading' && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {uploadState.status === 'error' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry();
                }}
                className="mt-2 text-xs text-primary-600 hover:text-primary-700 underline"
              >
                Retry Upload
              </button>
            )}
            
            {helperText && uploadState.status === 'idle' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {helperText}
              </p>
            )}
          </div>
        </div>

        {/* Display uploaded files */}
        {hasExistingFiles && (
          <div className="mt-3 space-y-2">
            {uploadState.uploadedPaths.map((path, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  Document {index + 1}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="text-primary-600 hover:text-primary-700"
                    title="View document"
                    onClick={(e) => {
                      e.stopPropagation();
                      // In a real implementation, you'd generate a signed URL and open it
                      if (config.isDev) console.log('View document:', path);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <CheckCircle className="h-4 w-4 text-success-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        id={`file-input-${docType}`}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled || uploadState.status === 'uploading'}
      />
    </div>
  );
};

export default DocumentUploader;