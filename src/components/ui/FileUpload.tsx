import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  uploadProgress,
  uploadStatus,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalStatus, setInternalStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [internalProgress, setInternalProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStatusControlled = uploadStatus !== undefined;
  const isProgressControlled = uploadProgress !== undefined;

  const status = isStatusControlled ? uploadStatus! : internalStatus;
  const progress = isProgressControlled ? uploadProgress! : internalProgress;
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  const clearTimers = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const triggerProgress = useCallback(
    (selectedCount: number) => {
      if (isStatusControlled || isProgressControlled || selectedCount === 0) {
        return;
      }

      clearTimers();
      setInternalStatus('uploading');
      setInternalProgress(0);

      const duration = Math.min(2200 + selectedCount * 350, 4500);
      const startedAt = performance.now();

      const step = (now: number) => {
        const elapsed = now - startedAt;
        const percentage = Math.min(100, Math.round((elapsed / duration) * 100));
        setInternalProgress(percentage);

        if (percentage < 100) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          setInternalStatus('success');
          resetTimerRef.current = setTimeout(() => {
            setInternalStatus('idle');
            setInternalProgress(0);
          }, 2200);
        }
      };

      animationFrameRef.current = requestAnimationFrame(step);
    },
    [clearTimers, isProgressControlled, isStatusControlled]
  );

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const sizeClasses = {
    sm: 'p-4 text-sm',
    md: 'p-6',
    lg: 'p-8 text-lg',
  };

  const variantClasses = {
    default: 'min-h-[120px] p-4',
    compact: 'min-h-[80px] p-3',
  };

  const iconSizeClasses = {
    default: 'h-6 w-6',
    compact: 'h-4 w-4',
  };

  const textSizeClasses = {
    default: 'text-xs',
    compact: 'text-xs',
  };

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      if (multiple) {
        onChange?.([...value, ...fileArray]);
      } else {
        onChange?.(fileArray.slice(0, 1));
      }

      triggerProgress(fileArray.length);
    },
    [multiple, onChange, triggerProgress, value]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || status === 'uploading') return;

      handleFileSelect(e.dataTransfer.files);
    },
    [disabled, handleFileSelect, status]
  );

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
    if (!disabled && status !== 'uploading') {
      inputRef.current?.click();
    }
  };

  const getUploadIcon = () => {
    const displayProgress = status === 'uploading' ? Math.max(Math.round(normalizedProgress), 1) : Math.round(normalizedProgress);

    switch (status) {
      case 'uploading':
        return (
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-primary-200" />
            <div className="absolute inset-0 rounded-full border-2 border-t-transparent border-primary-600 animate-spin" />
            <span className="text-xs font-semibold text-primary-600">{displayProgress}%</span>
          </div>
        );
      case 'success':
        return (
          <div className="text-success-600">
            <svg className={iconSizeClasses[variant]} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="text-error-600">
            <svg className={iconSizeClasses[variant]} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      default:
        return <Upload className={iconSizeClasses[variant]} />;
    }
  };

  const getUploadText = () => {
    switch (status) {
      case 'uploading':
        return `Uploading... ${Math.round(normalizedProgress)}%`;
      case 'success':
        return 'Upload successful!';
      case 'error':
        return 'Upload failed';
      default:
        return variant === 'compact'
          ? 'Upload'
          : multiple
          ? 'Drop files here or click to browse'
          : 'Drop file here or click to browse';
    }
  };

  return (
    <div className={cn('form-group', fullWidth && 'w-full')}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div
        className={cn(
          'border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200',
          error
            ? 'border-error-500 dark:border-error-500'
            : status === 'success'
            ? 'border-success-500 dark:border-success-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500',
          (disabled || status === 'uploading') && 'opacity-60 cursor-wait',
          variant === 'compact' ? variantClasses.compact : sizeClasses[size],
          className
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={openFileDialog}
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center space-y-2 text-gray-500 dark:text-gray-400',
            textSizeClasses[variant]
          )}
        >
          {getUploadIcon()}
          <div className="text-center">
            <p className="font-medium">{getUploadText()}</p>
            {accept && status === 'idle' && (
              <p className={cn('mt-1', variant === 'compact' ? 'text-xs opacity-70' : 'text-sm')}>
                {variant === 'compact' ? '(.jpg, .png, .pdf)' : `Accepted formats: ${accept}`}
              </p>
            )}
            {status === 'uploading' && (
              <div className="mt-3 w-full max-w-[240px]">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 transition-all duration-200"
                    style={{ width: `${Math.max(normalizedProgress, 8)}%` }}
                  />
                </div>
              </div>
            )}
            {status === 'success' && (
              <p className="mt-2 text-xs font-medium text-success-600">Saved to task draft</p>
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
        disabled={disabled || status === 'uploading'}
      />

      {value && value.length > 0 && (
        <div className="mt-3 space-y-2">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-700"
            >
              <span className="truncate text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="ml-2 rounded-full p-1 text-gray-500 transition-colors hover:text-error-500"
                disabled={disabled || status === 'uploading'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(helperText || error) && (
        <p
          className={cn(
            'mt-1 text-sm',
            error ? 'text-error-500 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default FileUpload;

