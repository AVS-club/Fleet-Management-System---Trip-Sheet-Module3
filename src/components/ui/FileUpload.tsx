import React, { useCallback } from 'react';
import { cn } from '../../utils/cn';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  accept?: string;
  multiple?: boolean;
  value?: File[];
  onChange?: (files: File[]) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'compact';
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  helperText,
  error,
  fullWidth = true,
  accept,
  multiple = false,
  value = [],
  onChange,
  disabled = false,
  size = 'md',
  className,
  variant = 'default',
  uploadProgress = 0,
  uploadStatus = 'idle',
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'p-4 text-sm',
    md: 'p-6',
    lg: 'p-8 text-lg',
  };

  const variantClasses = {
    default: 'min-h-[120px] p-4',
    compact: 'min-h-[80px] p-3'
  };

  const iconSizeClasses = {
    default: 'h-6 w-6',
    compact: 'h-4 w-4'
  };

  const textSizeClasses = {
    default: 'text-xs',
    compact: 'text-xs'
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    if (multiple) {
      onChange?.([...value, ...fileArray]);
    } else {
      onChange?.(fileArray.slice(0, 1));
    }
  }, [multiple, value, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || uploadStatus === 'uploading') return;
    
    handleFileSelect(e.dataTransfer.files);
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    onChange?.(newFiles);
  };

  const openFileDialog = () => {
    if (!disabled && uploadStatus !== 'uploading') {
      inputRef.current?.click();
    }
  };

  // Get upload status icon
  const getUploadIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <div className="animate-spin rounded-full border-2 border-t-transparent border-primary-600">
            <Upload className={`${iconSizeClasses[variant]} opacity-0`} />
          </div>
        );
      case 'success':
        return (
          <div className="text-success-600">
            <svg className={iconSizeClasses[variant]} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="text-error-600">
            <svg className={iconSizeClasses[variant]} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return <Upload className={iconSizeClasses[variant]} />;
    }
  };

  // Get upload status text
  const getUploadText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return `Uploading... ${uploadProgress}%`;
      case 'success':
        return 'Upload successful!';
      case 'error':
        return 'Upload failed';
      default:
        return variant === 'compact' ? 'Upload' : (multiple ? 'Drop files here or click to browse' : 'Drop file here or click to browse');
    }
  };

  return (
    <div className={cn("form-group", fullWidth && "w-full")}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200",
          error
            ? "border-error-500 dark:border-error-500"
            : uploadStatus === 'success'
            ? "border-success-500 dark:border-success-500"
            : "border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500",
          (disabled || uploadStatus === 'uploading') && "opacity-50 cursor-not-allowed",
          variant === 'compact' ? variantClasses.compact : sizeClasses[size],
          className
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={openFileDialog}
      >
        <div className={cn(
          "flex flex-col items-center justify-center space-y-1 text-gray-500 dark:text-gray-400",
          textSizeClasses[variant]
        )}>
          {getUploadIcon()}
          <div className="text-center">
            <p className="font-medium">
              {getUploadText()}
            </p>
            {accept && uploadStatus === 'idle' && (
              <p className={cn("mt-1", variant === 'compact' ? 'text-xs opacity-70' : 'text-sm')}>
                {variant === 'compact' ? '(.jpg, .png, .pdf)' : `Accepted formats: ${accept}`}
              </p>
            )}
            {uploadStatus === 'uploading' && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploadStatus === 'uploading'}
      />

      {/* File list */}
      {value.length > 0 && (
        <div className="mt-3 space-y-2">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {file.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="ml-2 p-1 text-gray-500 hover:text-error-500 transition-colors"
                disabled={disabled || uploadStatus === 'uploading'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(helperText || error) && (
        <p className={cn(
          "mt-1 text-sm",
          error
            ? "text-error-500 dark:text-error-400"
            : "text-gray-500 dark:text-gray-400"
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default FileUpload;