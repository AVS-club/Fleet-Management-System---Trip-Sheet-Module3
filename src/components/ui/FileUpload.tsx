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
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'p-4 text-sm',
    md: 'p-6',
    lg: 'p-8 text-lg',
  };

  const variantClasses = {
    default: 'min-h-[180px] p-5',
    compact: 'min-h-[100px] p-3'
  };

  const iconSizeClasses = {
    default: 'h-8 w-8',
    compact: 'h-5 w-5'
  };

  const textSizeClasses = {
    default: 'text-sm',
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
    if (disabled) return;
    
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
    if (!disabled) {
      inputRef.current?.click();
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
            : "border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500",
          disabled && "opacity-50 cursor-not-allowed",
          variant === 'compact' ? variantClasses.compact : sizeClasses[size],
          className
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={openFileDialog}
      >
        <div className={cn(
          "flex flex-col items-center justify-center space-y-2 text-gray-500 dark:text-gray-400",
          textSizeClasses[variant]
        )}>
          <Upload className={iconSizeClasses[variant]} />
          <div className="text-center">
            <p className="font-medium">
              {variant === 'compact' ? 'Upload' : (multiple ? 'Drop files here or click to browse' : 'Drop file here or click to browse')}
            </p>
            {accept && (
              <p className={cn("mt-1", variant === 'compact' ? 'text-xs opacity-70' : 'text-sm')}>
                {variant === 'compact' ? '(.jpg, .png, .pdf)' : `Accepted formats: ${accept}`}
              </p>
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
        disabled={disabled}
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
                disabled={disabled}
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