import React, { useState, useCallback } from 'react';
import { Upload, X, MapPin, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../utils/supabaseClient';

interface GPSScreenshot {
  id?: string;
  image_url: string;
  caption?: string;
  file?: File;
}

interface GPSScreenshotUploadProps {
  tripId?: string;
  screenshots: GPSScreenshot[];
  onChange: (screenshots: GPSScreenshot[]) => void;
  disabled?: boolean;
}

const GPSScreenshotUpload: React.FC<GPSScreenshotUploadProps> = ({
  tripId,
  screenshots,
  onChange,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newScreenshots: GPSScreenshot[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 5MB)`);
        continue;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${i}`;
      
      setPreviewUrls(prev => ({
        ...prev,
        [tempId]: previewUrl
      }));

      newScreenshots.push({
        image_url: previewUrl,
        file: file,
        caption: `GPS Location ${screenshots.length + i + 1}`
      });
    }

    if (newScreenshots.length > 0) {
      onChange([...screenshots, ...newScreenshots]);
      toast.success(`Added ${newScreenshots.length} GPS screenshot(s)`);
    }

    // Reset input
    event.target.value = '';
  }, [screenshots, onChange]);

  const handleRemove = useCallback((index: number) => {
    const screenshot = screenshots[index];
    
    // Clean up preview URL if it exists
    if (screenshot.image_url.startsWith('blob:')) {
      URL.revokeObjectURL(screenshot.image_url);
    }

    const newScreenshots = screenshots.filter((_, i) => i !== index);
    onChange(newScreenshots);
    toast.info('GPS screenshot removed');
  }, [screenshots, onChange]);

  const handleCaptionChange = useCallback((index: number, caption: string) => {
    const newScreenshots = [...screenshots];
    newScreenshots[index] = {
      ...newScreenshots[index],
      caption
    };
    onChange(newScreenshots);
  }, [screenshots, onChange]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    event.preventDefault();
    
    const items = event.clipboardData?.items;
    if (!items) return;

    const newScreenshots: GPSScreenshot[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Image is too large (max 5MB)`);
          continue;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        const tempId = `temp-${Date.now()}-${i}`;
        
        setPreviewUrls(prev => ({
          ...prev,
          [tempId]: previewUrl
        }));

        newScreenshots.push({
          image_url: previewUrl,
          file: file,
          caption: `GPS Location ${screenshots.length + newScreenshots.length + 1}`
        });
      }
    }

    if (newScreenshots.length > 0) {
      onChange([...screenshots, ...newScreenshots]);
      toast.success(`Pasted ${newScreenshots.length} GPS screenshot(s)`);
    } else {
      toast.info('No image found in clipboard');
    }
  }, [screenshots, onChange]);

  const uploadToSupabase = async (file: File, tripId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${tripId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `gps-screenshots/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('trip-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('trip-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Upload all screenshots when trip is saved
  const uploadScreenshots = async (tripId: string): Promise<GPSScreenshot[]> => {
    if (!tripId) return screenshots;

    setUploading(true);
    const uploadedScreenshots: GPSScreenshot[] = [];

    try {
      for (const screenshot of screenshots) {
        // Skip if already uploaded (has a proper URL)
        if (!screenshot.file) {
          uploadedScreenshots.push(screenshot);
          continue;
        }

        // Upload to Supabase storage
        const imageUrl = await uploadToSupabase(screenshot.file, tripId);

        // Save to database
        const { data, error } = await supabase
          .from('trip_gps_screenshots')
          .insert({
            trip_id: tripId,
            image_url: imageUrl,
            caption: screenshot.caption
          })
          .select()
          .single();

        if (error) {
          console.error('Error saving GPS screenshot to database:', error);
          toast.error('Failed to save GPS screenshot');
          continue;
        }

        uploadedScreenshots.push({
          id: data.id,
          image_url: data.image_url,
          caption: data.caption
        });
      }

      return uploadedScreenshots;
    } catch (error) {
      console.error('Error uploading GPS screenshots:', error);
      toast.error('Failed to upload GPS screenshots');
      return screenshots;
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          GPS Location Screenshots
        </label>
        <span className="text-xs text-gray-500">
          {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Upload Area */}
      <div 
        className="relative"
        onPaste={handlePaste}
        tabIndex={0}
      >
        <input
          type="file"
          id="gps-screenshot-upload"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />
        <label
          htmlFor="gps-screenshot-upload"
          className={`
            flex flex-col items-center justify-center w-full h-24
            border-2 border-dashed rounded-lg cursor-pointer
            transition-colors duration-200
            ${disabled || uploading 
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50/10'
            }
          `}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Click to upload GPS screenshots
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                JPG, PNG, WEBP (max 5MB) • or paste (Ctrl+V)
              </span>
            </>
          )}
        </label>
      </div>

      {/* Screenshot Preview Grid */}
      {screenshots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {screenshots.map((screenshot, index) => (
            <div
              key={screenshot.id || `preview-${index}`}
              className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              {/* Image Preview */}
              <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
                <img
                  src={screenshot.image_url}
                  alt={screenshot.caption || `GPS Screenshot ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />
                
                {/* Overlay with GPS icon */}
                <div className="absolute top-2 left-2 p-1.5 bg-black/50 rounded-full">
                  <MapPin className="h-3 w-3 text-white" />
                </div>

                {/* Remove button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200
                             hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Caption Input */}
              <div className="p-2 bg-white dark:bg-gray-800">
                <input
                  type="text"
                  value={screenshot.caption || ''}
                  onChange={(e) => handleCaptionChange(index, e.target.value)}
                  placeholder="Add caption..."
                  disabled={disabled}
                  className="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 
                           rounded bg-white dark:bg-gray-900 
                           focus:outline-none focus:ring-1 focus:ring-primary-500
                           disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Helper Text */}
      {screenshots.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Upload GPS screenshots to document trip locations</span>
        </div>
      )}
    </div>
  );
};

export default GPSScreenshotUpload;
export type { GPSScreenshot };
