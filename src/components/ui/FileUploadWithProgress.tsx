import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { Upload, X, CheckCircle, AlertCircle, FileText, Image } from 'lucide-react';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FileUploadWithProgress');

interface FileUploadState {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'idle' | 'compressing' | 'uploading' | 'success' | 'error';
  error?: string;
  file: File;
}

interface FileUploadWithProgressProps {
  id: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  onFilesChange: (files: File[]) => void;
  maxSize?: number; // in bytes
  compress?: boolean;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
  existingFiles?: string[]; // URLs of existing files to display
  onRemoveExisting?: (url: string) => void; // Callback when existing file is removed
}

// Image compression utility
const compressImage = (file: File, onProgress?: (progress: number) => void): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      
      img.onload = () => {
        onProgress?.(30);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Calculate dimensions
        let width = img.width;
        let height = img.height;
        const maxWidth = 1920;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        onProgress?.(60);
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        onProgress?.(90);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            onProgress?.(100);
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

const FileUploadWithProgress: React.FC<FileUploadWithProgressProps> = ({
  id,
  label,
  accept = "*/*",
  multiple = false,
  onFilesChange,
  maxSize = 5 * 1024 * 1024, // 5MB default
  compress = false,
  helperText,
  error,
  disabled = false,
  className,
  variant = 'default',
  existingFiles = [],
  onRemoveExisting
}) => {
  const [uploadStates, setUploadStates] = useState<FileUploadState[]>([]);
  const [existingFilesList, setExistingFilesList] = useState<string[]>(existingFiles);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Initialize upload states
    const initialStates: FileUploadState[] = selectedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'idle',
      file
    }));
    
    setUploadStates(initialStates);

    // Process files
    const processedFiles: File[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      try {
        // Update to compressing state if needed
        if (compress && file.type.startsWith('image/')) {
          setUploadStates(prev => prev.map((state, idx) => 
            idx === i ? { ...state, status: 'compressing', progress: 10 } : state
          ));
          
          // Compress image
          const compressed = await compressImage(file, (progress) => {
            setUploadStates(prev => prev.map((state, idx) => 
              idx === i ? { ...state, progress: 10 + (progress * 0.4) } : state
            ));
          });
          
          processedFiles.push(compressed);
          
          // Mark as ready
          setUploadStates(prev => prev.map((state, idx) => 
            idx === i ? { ...state, status: 'success', progress: 100, file: compressed } : state
          ));
        } else {
          // Validate size
          if (file.size > maxSize) {
            throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
          }
          
          processedFiles.push(file);
          
          // Mark as success
          setUploadStates(prev => prev.map((state, idx) => 
            idx === i ? { ...state, status: 'success', progress: 100 } : state
          ));
        }
      } catch (error) {
        logger.error(`Error processing file ${file.name}:`, error);
        setUploadStates(prev => prev.map((state, idx) => 
          idx === i ? { 
            ...state, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } : state
        ));
      }
    }

    onFilesChange(processedFiles);
  }, [compress, maxSize, onFilesChange]);

  const removeFile = useCallback((index: number) => {
    const newStates = uploadStates.filter((_, i) => i !== index);
    setUploadStates(newStates);
    const newFiles = newStates.map(state => state.file);
    onFilesChange(newFiles);
  }, [uploadStates, onFilesChange]);

  const removeExistingFile = useCallback((url: string) => {
    const newExisting = existingFilesList.filter(fileUrl => fileUrl !== url);
    setExistingFilesList(newExisting);
    if (onRemoveExisting) {
      onRemoveExisting(url);
    }
  }, [existingFilesList, onRemoveExisting]);

  // Update existing files list when prop changes, filtering out invalid values
  useEffect(() => {
    const validFiles = existingFiles.filter(url => url && typeof url === 'string' && url.trim() !== '');
    setExistingFilesList(validFiles);
  }, [existingFiles]);

  const openFileDialog = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FileUploadState['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'compressing':
      case 'uploading':
        return (
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <Upload className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: FileUploadState['status']) => {
    switch (status) {
      case 'compressing':
        return 'Compressing...';
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Ready';
      case 'error':
        return 'Error';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className={cn('file-upload-container', className)}>
      <label htmlFor={id} className="file-upload-label">
        {label}
      </label>
      
      <div className="file-input-wrapper">
        <input
          ref={inputRef}
          type="file"
          id={id}
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="file-input"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={openFileDialog}
          disabled={disabled}
          className="file-input-button"
        >
          <Upload className="h-4 w-4" />
          Choose {multiple ? 'Files' : 'File'}
        </button>
      </div>

      {helperText && (
        <p className="file-helper-text">{helperText}</p>
      )}

      {error && (
        <p className="file-error-text">{error}</p>
      )}

      {/* Existing Files Preview */}
      {existingFilesList.length > 0 && (
        <div className="files-list existing-files">
          <p className="text-sm font-medium text-gray-700 mb-2">Existing Files:</p>
          {existingFilesList.filter(url => url && typeof url === 'string').map((url, index) => {
            const fileName = url.split('/').pop() || 'Unknown file';
            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

            return (
              <div key={`existing-${index}`} className="file-item status-success">
                <div className="file-info">
                  {isImage ? (
                    <div className="file-icon">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={fileName}
                          className="h-16 w-16 object-cover rounded border border-gray-200"
                        />
                      </a>
                    </div>
                  ) : (
                    <div className="file-icon">
                      <FileText className="h-4 w-4" />
                    </div>
                  )}

                  <div className="file-details">
                    <div className="file-name">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {fileName}
                      </a>
                    </div>
                    <div className="file-meta">
                      <span className="file-status success">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Saved
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remove/Replace Button */}
                <button
                  type="button"
                  onClick={() => removeExistingFile(url)}
                  className="file-remove-btn"
                  title="Remove this file (you can upload a replacement)"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Files List with Progress */}
      {uploadStates.length > 0 && (
        <div className="files-list">
          {uploadStates.map((state, index) => (
            <div key={state.id} className={cn('file-item', `status-${state.status}`)}>
              <div className="file-info">
                <div className="file-icon">
                  {getFileIcon(state.file)}
                </div>
                
                <div className="file-details">
                  <div className="file-name">{state.name}</div>
                  <div className="file-meta">
                    <span className="file-size">{formatFileSize(state.size)}</span>
                    <span className={cn('file-status', state.status)}>
                      {getStatusIcon(state.status)}
                      {getStatusText(state.status)}
                    </span>
                    {state.error && (
                      <span className="file-error">{state.error}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {(state.status === 'compressing' || state.status === 'uploading') && (
                <div className="file-progress">
                  <div 
                    className="file-progress-bar" 
                    style={{ width: `${state.progress}%` }}
                  />
                  <span className="file-progress-text">{state.progress}%</span>
                </div>
              )}

              {/* Success Indicator */}
              {state.status === 'success' && (
                <div className="file-progress complete">
                  <div className="file-progress-bar" style={{ width: '100%' }} />
                  <span className="file-progress-text">✓ Complete</span>
                </div>
              )}

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="file-remove-btn"
                title="Remove file"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadWithProgress;
