import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-toastify';

interface VehiclePhotoUploadProps {
  vehicleId: string;
  currentPhotoUrl?: string;
  onPhotoUpdate: (url: string) => void;
}

const VehiclePhotoUpload: React.FC<VehiclePhotoUploadProps> = ({
  vehicleId,
  currentPhotoUrl,
  onPhotoUpdate
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentPhotoUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Please upload PNG, JPEG, or GIF files only' 
      };
    }

    // Check file size (2MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: 'File size must be less than 2MB' 
      };
    }

    return { valid: true };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicleId}_${Date.now()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(filePath);

      // Update vehicle record
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ photo_url: publicUrl })
        .eq('id', vehicleId);

      if (updateError) throw updateError;

      onPhotoUpdate(publicUrl);
      toast.success('Vehicle photo updated successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      setPreview(currentPhotoUrl || '');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Vehicle Photo
      </label>
      
      <div className="relative">
        {/* Photo Display/Upload Area */}
        <div 
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="relative w-full aspect-[4/3] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors cursor-pointer overflow-hidden group"
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Vehicle"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm">Change Photo</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Camera className="h-12 w-12 mb-2" />
              <span className="text-sm font-medium">Add Vehicle Photo</span>
              <span className="text-xs mt-1">PNG, JPEG, GIF (Max 2MB)</span>
            </div>
          )}

          {/* Upload Progress Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          )}
        </div>

        {/* Remove Photo Button */}
        {preview && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreview('');
              // Clear from database
              supabase
                .from('vehicles')
                .update({ photo_url: null })
                .eq('id', vehicleId)
                .then(() => {
                  onPhotoUpdate('');
                  toast.success('Photo removed');
                });
            }}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-2">
        Upload a clear photo of your vehicle. Animated GIFs are supported for dynamic displays.
      </p>
    </div>
  );
};

export default VehiclePhotoUpload;
