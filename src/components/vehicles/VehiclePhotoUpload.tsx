import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader, Truck } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-toastify';
import { Vehicle } from '../../types';

interface VehiclePhotoUploadProps {
  vehicleId: string;
  vehicle?: Vehicle | null;
  currentPhotoUrl?: string;
  onPhotoUpdate: (url: string) => void;
}

const VehiclePhotoUpload: React.FC<VehiclePhotoUploadProps> = ({
  vehicleId,
  vehicle,
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
    <div className="flex items-center gap-6">
      {/* Profile-style photo - smaller, rounded */}
      <div className="relative">
        <div 
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-primary-400 transition-all cursor-pointer group"
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Vehicle"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Truck className="h-8 w-8 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Add Photo</span>
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
            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="h-3 w-3" />
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

      {/* Vehicle basic info next to photo */}
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-gray-900">
          {vehicle?.registration_number || 'Vehicle'}
        </h2>
        <p className="text-sm text-gray-600">
          {vehicle?.make} {vehicle?.model} • {vehicle?.year}
        </p>
        <div className="flex gap-2 mt-2">
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
            {vehicle?.status === 'active' ? 'Active' : vehicle?.status || 'Unknown'}
          </span>
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
            {vehicle?.fuel_type?.toUpperCase() || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VehiclePhotoUpload;
