import React, { useRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Upload, File, X, Paperclip } from 'lucide-react';

export interface FileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  value: File | null;
  onChange: (file: File | null) => void;
  buttonMode?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  helperText,
  error,
  icon = <Upload className="h-4 w-4" />,
  value,
  onChange,
  accept,
  disabled,
  required,
  className,
  buttonMode = false,
  ...props
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      console.warn("No file dropped.");
      return;
    }

    const file = files[0];
    if (!file || typeof file.name !== 'string') {
      console.warn("Invalid file dropped.");
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const acceptedTypes = accept?.split(',') || [];

    const isAccepted = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return `.${fileExtension}` === type.toLowerCase();
      } else {
        return file.type.includes(type.trim().replace('*', ''));
      }
    });

    if (!isAccepted) {
      console.warn("File type not accepted.");
      return;
    }

    if (onChange) {
      try {
        onChange(file);
      } catch (err) {
        console.error("onChange failed", err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (onChange) {
      onChange(file);
    }
  };

  const handleRemoveFile = () => {
    if (onChange) {
      onChange(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={twMerge(
          clsx(
            buttonMode 
              ? "inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" 
              : "relative border-2 border-dashed rounded-lg p-4 transition-colors",
            !buttonMode && isDragging ? 'border-primary-500 bg-primary-50' : !buttonMode && 'border-gray-300',
            disabled && 'opacity-50 cursor-not-allowed', 
            !buttonMode && error && 'border-error-500',
            className
          )
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className={buttonMode ? "hidden" : "hidden"}
          onChange={handleFileSelect}
          accept={accept}
          disabled={disabled}
          {...props}
        />

        {buttonMode && !value ? (
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 mr-2" />
            <span>{label || "Upload File"}</span>
          </div>
        ) : buttonMode && value ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <File className="h-4 w-4 text-primary-600 mr-2" />
              <span className="text-sm text-gray-700 truncate max-w-[150px]">{value.name}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="text-gray-400 hover:text-gray-600 ml-2"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : value ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <File className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-700">{value?.name ?? 'No file selected'}</span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-gray-400 hover:text-gray-600"
              disabled={disabled}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-4 cursor-pointer"
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            {icon}
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop a file here, or click to select
            </p>
            {accept && (
              <p className="mt-1 text-xs text-gray-500">
                Accepted formats: {accept}
              </p>
            )}
          </div>
        )}
      </div>

      {(helperText || error) && (
        <p className={clsx(
          'mt-1 text-sm',
          error ? 'text-error-500' : 'text-gray-500'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default FileUpload;