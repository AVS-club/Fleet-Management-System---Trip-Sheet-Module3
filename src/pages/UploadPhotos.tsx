import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Upload, X, CheckCircle, AlertCircle, Loader, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-toastify';

interface TaskInfo {
  id: string;
  vehicle_registration: string;
  task_type: string;
  complaint_description?: string;
  organization_id: string;
}

interface PhotoPreview {
  id: string;
  file: File;
  preview: string;
}

const UploadPhotos: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [uploaderName, setUploaderName] = useState('');

  // Fetch task information (public query, no auth needed)
  useEffect(() => {
    const fetchTaskInfo = async () => {
      if (!taskId) {
        toast.error('Invalid upload link');
        setLoading(false);
        return;
      }

      try {
        // Fetch basic task info with vehicle registration
        const { data: task, error: taskError } = await supabase
          .from('maintenance_tasks')
          .select(`
            id,
            task_type,
            complaint_description,
            organization_id,
            vehicle:vehicles!maintenance_tasks_vehicle_id_fkey(
              registration_number
            )
          `)
          .eq('id', taskId)
          .single();

        if (taskError) throw taskError;

        if (task) {
          setTaskInfo({
            id: task.id,
            vehicle_registration: task.vehicle?.registration_number || 'Unknown Vehicle',
            task_type: task.task_type || 'Maintenance',
            complaint_description: task.complaint_description,
            organization_id: task.organization_id
          });
        } else {
          toast.error('Task not found');
        }
      } catch (error) {
        console.error('Error fetching task:', error);
        toast.error('Failed to load task information');
      } finally {
        setLoading(false);
      }
    };

    fetchTaskInfo();
  }, [taskId]);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: PhotoPreview[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 10MB`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      newPhotos.push({
        id: `${Date.now()}-${i}`,
        file,
        preview
      });
    }

    setPhotos(prev => [...prev, ...newPhotos]);

    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  const uploadPhotos = async () => {
    if (!taskInfo || photos.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      // Upload each photo to storage
      for (const photo of photos) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${photo.file.name}`;
        const filePath = `maintenance-bills/${taskInfo.organization_id}/tasks/${taskId}/uploads/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('maintenance-bills')
          .upload(filePath, photo.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload ${photo.file.name}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('maintenance-bills')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // Insert records into maintenance_task_uploads table
      const uploadRecords = uploadedUrls.map(url => ({
        maintenance_task_id: taskId,
        image_url: url,
        uploaded_by: uploaderName.trim() || null
      }));

      const { error: insertError } = await supabase
        .from('maintenance_task_uploads')
        .insert(uploadRecords);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to save upload records');
      }

      // Success!
      setUploadSuccess(true);
      toast.success(`${photos.length} photo${photos.length > 1 ? 's' : ''} uploaded successfully!`);

      // Clean up preview URLs
      photos.forEach(photo => URL.revokeObjectURL(photo.preview));
      setPhotos([]);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading task information...</p>
        </div>
      </div>
    );
  }

  if (!taskInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h2>
          <p className="text-gray-600 mb-6">This upload link is invalid or the task has been deleted.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your photos have been uploaded successfully and will be reviewed by the maintenance team.
          </p>
          <button
            onClick={() => {
              setUploadSuccess(false);
              setUploaderName('');
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Upload More Photos
          </button>
        </div>
      </div>
    );
  }

  const formatTaskType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Camera className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Upload Maintenance Photos</h1>
          </div>

          {/* Task Information */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Vehicle:</span>
              <span className="font-semibold text-gray-900">{taskInfo.vehicle_registration}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Task Type:</span>
              <span className="font-semibold text-gray-900">{formatTaskType(taskInfo.task_type)}</span>
            </div>
            {taskInfo.complaint_description && (
              <div className="pt-2 border-t border-blue-200">
                <span className="text-sm text-gray-600">Issue:</span>
                <p className="text-sm text-gray-900 mt-1">{taskInfo.complaint_description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Upload Area */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Optional: Uploader Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Camera Input (Hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoCapture}
            className="hidden"
          />

          {/* Camera Button */}
          {photos.length === 0 && (
            <button
              onClick={handleCameraClick}
              className="w-full h-40 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-3"
            >
              <Camera className="h-16 w-16" />
              <span className="text-xl font-semibold">Take Photo</span>
              <span className="text-sm opacity-90">Tap to open camera</span>
            </button>
          )}

          {/* Photo Previews */}
          {photos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {photos.length} Photo{photos.length > 1 ? 's' : ''} Ready
                </h3>
                <button
                  onClick={handleCameraClick}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Add More
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.preview}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload Button */}
              <button
                onClick={uploadPhotos}
                disabled={uploading}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg font-semibold"
              >
                {uploading ? (
                  <>
                    <Loader className="h-6 w-6 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    Upload {photos.length} Photo{photos.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Instructions:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Tap "Take Photo" to open your camera</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Take clear photos of the vehicle, damage, or maintenance work</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>You can add multiple photos (up to 10MB each)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Review your photos and tap "Upload" when ready</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadPhotos;
