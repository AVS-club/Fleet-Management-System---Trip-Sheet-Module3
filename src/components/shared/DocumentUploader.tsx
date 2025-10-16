import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, RefreshCw, Eye, Download, Trash2, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';
import { uploadVehicleDocument, uploadDriverDocument, getSignedDocumentUrl, getSignedDriverDocumentUrl } from '../../utils/supabaseStorage';
import { supabase } from '../../utils/supabaseClient';
import config from '../../utils/env';
import { toast } from 'react-toastify';

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
  onFileDelete?: (filePath: string) => void;
  disabled?: boolean;
  className?: string;
  initialFilePaths?: string[];
  required?: boolean;
  helperText?: string;
  uploadMode?: 'immediate' | 'staged';
  onStagedFiles?: (files: File[]) => void;
}

interface UploadState {
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  uploadedPaths: string[];
  viewingDocument?: string;
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
  onFileDelete,
  disabled = false,
  className,
  initialFilePaths = [],
  required = false,
  helperText,
  uploadMode = 'immediate',
  onStagedFiles
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
    uploadedPaths: initialFilePaths
  });
  
  // Staged files state for staged upload mode
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // Duplicate prevention state
  const [isUploading, setIsUploading] = useState(false);
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUploadTimeRef = useRef<number>(0);
  const uploadedFileHashesRef = useRef<Set<string>>(new Set());

  // Helper function for file hashing to detect duplicates
  const generateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    console.log('📤 File selected, starting upload:', fileArray.length, 'files');
    
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

        console.log(`📤 Uploading file ${index + 1}/${fileArray.length}:`, file.name);
        
        let uploadedPath;
        if (bucketType === 'vehicle') {
          uploadedPath = await uploadVehicleDocument(file, entityId, docType, onProgress);
        } else {
          uploadedPath = await uploadDriverDocument(file, entityId, docType, onProgress);
        }
        
        console.log(`✅ File uploaded successfully:`, uploadedPath);
        return uploadedPath;
      });

      const uploadedPaths = await Promise.all(uploadPromises);
      
      console.log('✅ All uploads complete! Paths:', uploadedPaths);
      
      setUploadState(prev => ({
        ...prev,
        status: 'success',
        progress: 100,
        uploadedPaths: [...prev.uploadedPaths, ...uploadedPaths]
      }));

      // Notify parent component
      if (onUploadComplete) {
        console.log('📢 Calling onUploadComplete with paths:', uploadedPaths);
        onUploadComplete(uploadedPaths);
      }

      toast.success(`${fileArray.length} file(s) uploaded successfully`);

    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Upload failed'
      }));
      toast.error('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [bucketType, entityId, docType, multiple, onUploadComplete]);

  const handleRetry = () => {
    setUploadState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      errorMessage: undefined
    }));
  };

  const handleFileDelete = async (filePath: string, index: number) => {
    if (!window.confirm('Remove this document? It will be deleted when you click "Update Vehicle".')) {
      return;
    }

    try {
      console.log('🗑️ Marking for deletion:', filePath);
      
      // Remove from local state (updates UI immediately)
      setUploadState(prev => ({
        ...prev,
        uploadedPaths: prev.uploadedPaths.filter((_, i) => i !== index)
      }));

      // Notify parent component
      if (onFileDelete) {
        onFileDelete(filePath);
      }

      toast.success('Document will be deleted when you click "Update Vehicle"');
      
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Failed to remove document');
    }
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      console.log('Viewing document:', filePath);
      
      // Clean the path and handle spaces
      const cleanedPath = filePath
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//, '')
        .replace(/^vehicle-docs\//, '')
        .replace(/^driver-docs\//, '')
        .trim();
      
      // For public URLs, encode the path properly to handle spaces
      const encodedPath = cleanedPath.split('/').map(segment => 
        encodeURIComponent(segment.replace(/%20/g, ' '))
      ).join('/');
      
      // Get the base URL without encoding
      const bucketName = bucketType === 'vehicle' ? 'vehicle-docs' : 'driver-docs';
      const baseUrl = `${supabase.storageUrl}/object/public/${bucketName}/`;
      
      // Construct the final URL
      const publicUrl = `${baseUrl}${encodedPath}`;
      
      window.open(publicUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to view document');
    }
  };

  // Method to upload staged files (called by parent on form submit)
  const uploadStagedFiles = useCallback(async (): Promise<string[]> => {
    if (stagedFiles.length === 0) return [];
    
    const uploadedPaths: string[] = [];
    
    try {
      setUploadState(prev => ({ ...prev, status: 'uploading', progress: 0 }));
      
      for (let i = 0; i < stagedFiles.length; i++) {
        const file = stagedFiles[i];
        
        const uploadFunction = bucketType === 'vehicle' 
          ? uploadVehicleDocument 
          : uploadDriverDocument;
        
        const path = await uploadFunction(file, entityId, docType, (progress) => {
          const totalProgress = ((i + progress / 100) / stagedFiles.length) * 100;
          setUploadState(prev => ({ ...prev, progress: totalProgress }));
        });
        
        uploadedPaths.push(path);
      }
      
      setUploadState(prev => ({ 
        ...prev, 
        status: 'success', 
        progress: 100,
        uploadedPaths: [...prev.uploadedPaths, ...uploadedPaths]
      }));
      
      // Clear staged files after successful upload
      setStagedFiles([]);
      setPreviewUrls([]);
      
      return uploadedPaths;
    } catch (error) {
      console.error('Error uploading staged files:', error);
      setUploadState(prev => ({ 
        ...prev, 
        status: 'error', 
        errorMessage: 'Failed to upload files'
      }));
      throw error;
    }
  }, [stagedFiles, bucketType, entityId, docType]);

  // Method to clear staged files (called by parent on cancel)
  const clearStagedFiles = useCallback(() => {
    // Clean up preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    setStagedFiles([]);
    setPreviewUrls([]);
  }, [previewUrls]);

  // Clean up preview URLs on unmount
  React.useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

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

  // Expose methods to parent component
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    uploadStagedFiles,
    clearStagedFiles,
    hasStagedFiles: stagedFiles.length > 0
  })  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('form-group', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-error-500 dark:text-error-400 ml-1">*</span>}
        </label>
      )}

      {/* Staged Files Preview */}
      {uploadMode === 'staged' && stagedFiles.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <Upload className="h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-sm font-medium text-yellow-800">
              {stagedFiles.length} file(s) staged for upload
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {stagedFiles.map((file, index) => (
              <div key={index} className="text-xs text-yellow-700 flex items-center">
                <span className="truncate">{file.name}</span>
                <span className="ml-2 text-yellow-600">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            ))}
          </div>
        </div>
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
            {uploadState.uploadedPaths.map((path, index) => {
              // Extract clean filename
              const getFileName = (filePath: string) => {
                const segments = filePath.split('/');
                const fileName = segments[segments.length - 1];
                
                // Check for format: docType_timestamp_originalName.ext
                const newFormatMatch = fileName.match(/^(\w+)_\d+_(.+)$/);
                if (newFormatMatch) {
                  return newFormatMatch[2]; // Return original name
                }
                
                return fileName;
              };

              const fileName = getFileName(path);
              const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
              const totalFiles = uploadState.uploadedPaths.length;

              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {fileName}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                        {fileExtension}
                      </span>
                    </div>
                    {totalFiles > 1 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {index + 1} of {totalFiles} files
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
                      title="View document"
                      disabled={uploadState.viewingDocument === path}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDocument(path);
                      }}
                    >
                      {uploadState.viewingDocument === path ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-700"
                      title="Delete document"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileDelete(path, index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <CheckCircle className="h-4 w-4 text-success-500" />
                  </div>
                </div>
              );
            })}
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