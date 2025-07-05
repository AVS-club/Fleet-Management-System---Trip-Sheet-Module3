import React, { useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Upload, File, X, Paperclip, FileText, Image } from 'lucide-react';

interface FileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  value: File | File[] | null;
  onChange: (file: File | File[] | null) => void;
  buttonMode?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  iconOnly?: boolean;
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
  multiple = false,
  maxFiles = 5,
  iconOnly = false,
  ...props
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate previews when files change
  useEffect(() => {
    // Clear old previews
    Object.values(filePreviews).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    const newPreviews: Record<string, string> = {};
    
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((file, index) => {
          if (file.type.startsWith('image/')) {
            newPreviews[`${file.name}-${index}`] = URL.createObjectURL(file);
          }
        });
      } else if (value.type.startsWith('image/')) {
        newPreviews[value.name] = URL.createObjectURL(value);
      }
    }
    
    setFilePreviews(newPreviews);
    
    // Cleanup function to revoke object URLs
    return () => {
      Object.values(newPreviews).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [value]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      console.warn("No file dropped.");
      return;
    }

    if (multiple) {
      // Handle multiple files
      const filesArray = Array.from(files);
      
      // Filter files by accepted types
      const acceptedFiles = filterFilesByAccept(filesArray, accept);
      
      // If no accepted files, return
      if (acceptedFiles.length === 0) {
        return;
      }
      
      // Check if we're exceeding the maxFiles limit
      let newFiles: File[] = [];
      
      if (Array.isArray(value) && value.length > 0) {
        // Don't exceed the maximum number of files
        const remainingSlots = maxFiles - value.length;
        if (remainingSlots <= 0) {
          console.warn(`Maximum number of files (${maxFiles}) reached.`);
          return;
        }
        
        // Add only up to the remaining slots
        newFiles = [...value, ...acceptedFiles.slice(0, remainingSlots)];
      } else {
        // Take up to maxFiles
        newFiles = acceptedFiles.slice(0, maxFiles);
      }
      
      if (onChange) {
        onChange(newFiles);
      }
    } else {
      // Handle single file (original behavior)
      const file = files[0];
      if (!file || typeof file.name !== 'string') {
        console.warn("Invalid file dropped.");
        return;
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const acceptedTypes = accept?.split(',') || [];

      const isAccepted = acceptedTypes.length === 0 || acceptedTypes.some(type => {
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
    }
  };

  const filterFilesByAccept = (files: File[], acceptString?: string): File[] => {
    if (!acceptString || acceptString.trim() === '') return files;
    
    const acceptedTypes = acceptString.split(',').map(t => t.trim());
    
    return files.filter(file => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      
      return acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return `.${fileExtension}` === type.toLowerCase();
        } else {
          return file.type.includes(type.trim().replace('*', ''));
        }
      });
    });
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
    const files = e.target.files;
    
    if (!files || files.length === 0) return;
    
    if (multiple) {
      // Handle multiple files
      const filesArray = Array.from(files);
      
      // Filter files by accepted types
      const acceptedFiles = filterFilesByAccept(filesArray, accept);
      
      // If no accepted files, return
      if (acceptedFiles.length === 0) {
        return;
      }
      
      // Check if we're exceeding the maxFiles limit
      let newFiles: File[];
      
      if (Array.isArray(value) && value.length > 0) {
        // Don't exceed the maximum number of files
        const remainingSlots = maxFiles - value.length;
        if (remainingSlots <= 0) {
          console.warn(`Maximum number of files (${maxFiles}) reached.`);
          return;
        }
        
        // Add only up to the remaining slots
        newFiles = [...value, ...acceptedFiles.slice(0, remainingSlots)];
      } else {
        // Take up to maxFiles
        newFiles = acceptedFiles.slice(0, maxFiles);
      }
      
      if (onChange) {
        onChange(newFiles);
      }
    } else {
      // Handle single file (original behavior)
      const file = files[0] || null;
      if (onChange) {
        onChange(file);
      }
    }
    
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (indexToRemove?: number) => {
    if (multiple && Array.isArray(value) && indexToRemove !== undefined) {
      // Remove a specific file from the array
      const newFiles = value.filter((_, index) => index !== indexToRemove);
      if (onChange) {
        onChange(newFiles.length > 0 ? newFiles : null);
      }
    } else {
      // Remove the single file
      if (onChange) {
        onChange(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper to get file icon based on file type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  const renderFilesList = () => {
    if (!multiple || !Array.isArray(value) || value.length === 0) {
      return null;
    }
    
    return (
      <ul className="mt-2 space-y-2">
        {value.map((file, index) => (
          <li key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center overflow-hidden">
              {file.type.startsWith('image/') && filePreviews[`${file.name}-${index}`] ? (
                <img 
                  src={filePreviews[`${file.name}-${index}`]} 
                  alt={file.name}
                  className="h-8 w-8 object-cover rounded mr-2 flex-shrink-0"
                />
              ) : (
                getFileIcon(file)
              )}
              <div className="ml-2 overflow-hidden">
                <p className="text-sm text-gray-700 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveFile(index)}
              className="text-gray-400 hover:text-error-500 ml-2 flex-shrink-0"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    );
  };

  // Icon-only mode
  if (iconOnly) {
    return (
      <div className="inline-block">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept={accept}
          disabled={disabled}
          multiple={multiple}
          {...props}
        />
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={twMerge(
            clsx(
              "p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )
          )}
          title={label || "Upload file"}
          disabled={disabled}
        >
          {icon}
        </button>
      </div>
    );
  }

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
          multiple={multiple}
          {...props}
        />

        {buttonMode && !value ? (
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            {icon}
            <span className="ml-2">{label || "Upload File"}</span>
            {multiple && <span className="text-xs text-gray-500 ml-1">(max {maxFiles})</span>}
          </div>
        ) : buttonMode && value ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              {!Array.isArray(value) ? 
                (value.type.startsWith('image/') && filePreviews[value.name] ? (
                  <img 
                    src={filePreviews[value.name]} 
                    alt={value.name}
                    className="h-6 w-6 object-cover rounded mr-2 flex-shrink-0"
                  />
                ) : (
                  getFileIcon(value)
                ))
              : (
                <File className="h-4 w-4 text-primary-600 mr-2" />
              )}
              
              {multiple && Array.isArray(value) ? (
                <span className="text-sm text-gray-700">{value.length} file{value.length !== 1 ? 's' : ''} selected</span>
              ) : (
                <span className="text-sm text-gray-700 truncate max-w-[120px] sm:max-w-[150px]">
                  {Array.isArray(value) && value.length > 0 ? value[0].name : (value as File)?.name || 'No file'}
                </span>
              )}
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
          <div className="space-y-1 sm:space-y-2">
            {!multiple || !Array.isArray(value) ? (
              // Single file display with preview for images
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {value.type.startsWith('image/') && filePreviews[value.name] ? (
                    <img 
                      src={filePreviews[value.name]} 
                      alt={value.name}
                      className="h-12 w-12 sm:h-16 sm:w-16 object-cover rounded mr-2 sm:mr-3 flex-shrink-0"
                    />
                  ) : (
                    <div className="mr-2 sm:mr-3 flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 bg-gray-100 rounded">
                      {value.type === 'application/pdf' ? (
                        <FileText className="h-8 w-8 text-red-500" />
                      ) : (
                        <File className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700">{(value as File)?.name ?? 'No file selected'}</p>
                    <p className="text-xs text-gray-500">{formatFileSize((value as File)?.size || 0)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile()}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={disabled}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              // Multiple files display
              renderFilesList()
            )}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-4 cursor-pointer"
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            {icon}
            <p className="mt-2 text-sm text-gray-600 text-center">
              Drag and drop {multiple ? 'files' : 'a file'} here, or click to select
            </p>
            {accept && (
              <p className="mt-1 text-xs text-gray-500 text-center">
                Accepted formats: {accept}
              </p>
            )}
            {multiple && (
              <p className="mt-1 text-xs text-gray-500 text-center">
                Maximum {maxFiles} files
              </p>
            )}
          </div>
        )}
      </div>

      {multiple && Array.isArray(value) && value.length > 0 && !buttonMode && 
        <div className="mt-2">
          {renderFilesList()}
        </div>
      }

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