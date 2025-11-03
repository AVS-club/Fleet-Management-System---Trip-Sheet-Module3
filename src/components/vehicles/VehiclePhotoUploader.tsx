import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader, Image as ImageIcon } from 'lucide-react';
import { uploadVehiclePhoto, getSignedVehiclePhotoUrl, deleteVehiclePhoto, validateVehiclePhotoType } from '@/utils/supabaseStorage';
import { toast } from 'react-toastify';
import { createLogger } from '@/utils/logger';

const logger = createLogger('VehiclePhotoUploader');

interface VehiclePhotoUploaderProps {
  vehicleId: string;
  initialPhotoUrl?: string | null;
  onPhotoChange?: (photoUrl: string | null) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

const VehiclePhotoUploader: React.FC<VehiclePhotoUploaderProps> = ({
  vehicleId,
  initialPhotoUrl,
  onPhotoChange,
  disabled = false,
  label = 'Vehicle Photo',
  helperText = 'Upload a photo of the vehicle (PNG, JPEG, JPG, or GIF). Previous photo will be replaced.',
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial photo URL
  useEffect(() => {
    const loadInitialPhoto = async () => {
      if (initialPhotoUrl) {
        setIsLoadingPreview(true);
        try {
          const signedUrl = await getSignedVehiclePhotoUrl(initialPhotoUrl);
          setPhotoUrl(signedUrl);
        } catch (error) {
          logger.error('Failed to load initial photo:', error);
          setPhotoUrl(null);
        } finally {
          setIsLoadingPreview(false);
        }
      }
    };

    loadInitialPhoto();
  }, [initialPhotoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!validateVehiclePhotoType(file)) {
      toast.error('Invalid file type. Only PNG, JPEG, JPG, and GIF files are allowed.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB. Please choose a smaller file.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      logger.debug('Uploading vehicle photo:', { vehicleId, fileName: file.name });

      // Upload the photo
      const filePath = await uploadVehiclePhoto(
        file,
        vehicleId,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      logger.debug('Photo uploaded successfully:', filePath);

      // Generate signed URL for preview
      const signedUrl = await getSignedVehiclePhotoUrl(filePath);
      setPhotoUrl(signedUrl);

      // Notify parent component
      if (onPhotoChange) {
        onPhotoChange(filePath);
      }

      toast.success('Vehicle photo uploaded successfully!');
    } catch (error) {
      logger.error('Failed to upload vehicle photo:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to upload vehicle photo. Please try again.'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!vehicleId) {
      toast.error('Cannot delete photo: Vehicle ID is missing');
      return;
    }

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this vehicle photo?'
    );

    if (!confirmDelete) return;

    setIsUploading(true);

    try {
      const success = await deleteVehiclePhoto(vehicleId);

      if (success) {
        setPhotoUrl(null);
        if (onPhotoChange) {
          onPhotoChange(null);
        }
        toast.success('Vehicle photo deleted successfully');
      } else {
        throw new Error('Failed to delete photo');
      }
    } catch (error) {
      logger.error('Failed to delete vehicle photo:', error);
      toast.error('Failed to delete vehicle photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* Upload Area */}
      <div className="relative">
        {/* Photo Preview */}
        {photoUrl && !isLoadingPreview ? (
          <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
            <img
              src={photoUrl}
              alt="Vehicle"
              className="w-full h-full object-cover"
            />

            {/* Delete Button */}
            {!disabled && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isUploading}
                className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete photo"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Upload Progress Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center">
                  <Loader className="h-8 w-8 text-white animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">{uploadProgress}%</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Upload Placeholder */
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={disabled || isUploading || isLoadingPreview}
            className="w-full aspect-video bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
          >
            {isLoadingPreview ? (
              <>
                <Loader className="h-12 w-12 text-gray-400 animate-spin mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading photo...</p>
              </>
            ) : isUploading ? (
              <>
                <Loader className="h-12 w-12 text-blue-500 animate-spin mb-2" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Uploading... {uploadProgress}%
                </p>
              </>
            ) : (
              <>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-3">
                  <ImageIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Click to upload vehicle photo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPEG, JPG, or GIF (max 10MB)
                </p>
              </>
            )}
          </button>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.gif,image/png,image/jpeg,image/jpg,image/gif"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
      </div>

      {/* Helper Text */}
      {helperText && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}

      {/* Replace Button (when photo exists) */}
      {photoUrl && !isUploading && !disabled && (
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={disabled || isUploading}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          Replace Photo
        </button>
      )}
    </div>
  );
};

export default VehiclePhotoUploader;
