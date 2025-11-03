# Vehicle Photo Upload Integration Guide

## Overview

This guide explains how the vehicle photo storage system works and how to integrate it into your application.

## Features

✅ **Single Photo Per Vehicle**: Only one photo is allowed per vehicle. Uploading a new photo automatically replaces the old one.

✅ **Organized Storage**: Photos are stored in a folder structure: `vehicle-photos/vehicles/{vehicle-id}/photo.{ext}`

✅ **File Type Validation**: Only PNG, JPEG, JPG, and GIF files are accepted.

✅ **Automatic Cleanup**: Old photos are automatically deleted when a new one is uploaded.

✅ **Organization Isolation**: Each vehicle has its own folder, preventing photo mixing between vehicles.

## Architecture

### 1. Storage Structure

```
vehicle-photos/                          (Supabase Storage Bucket)
└── vehicles/
    ├── {vehicle-id-1}/
    │   └── photo.jpg                   (Single photo per vehicle)
    ├── {vehicle-id-2}/
    │   └── photo.png
    └── {vehicle-id-3}/
        └── photo.gif
```

### 2. Database Schema

The `vehicles` table has been extended with a new column:

```sql
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;
```

This column stores the file path (e.g., `vehicles/{vehicle-id}/photo.jpg`), not the full URL.

### 3. Key Functions

All functions are available in `src/utils/supabaseStorage.ts`:

#### `uploadVehiclePhoto(file, vehicleId, onProgress?)`
- Validates file type (PNG, JPEG, JPG, GIF only)
- Deletes any existing photos for the vehicle
- Uploads the new photo to `vehicles/{vehicleId}/photo.{ext}`
- Returns the file path

#### `getSignedVehiclePhotoUrl(filePath, expiresIn?)`
- Generates a signed URL for displaying the photo
- Default expiration: 7 days
- Returns `null` if photo not found

#### `deleteVehiclePhoto(vehicleId)`
- Deletes all photos for a specific vehicle
- Returns `true` if successful

#### `validateVehiclePhotoType(file)`
- Validates file type before upload
- Returns `true` if valid, `false` otherwise

## Integration Steps

### Step 1: Run the Migration

Apply the database migration to add the `vehicle_photo_url` column:

```bash
npx supabase db push
```

Or run the migration file directly:
```sql
-- File: supabase/migrations/20251103000000_add_vehicle_photo_url.sql
```

### Step 2: Create the Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `vehicle-photos`
3. Set it as **Public** (or configure RLS policies as needed)
4. Enable file upload

### Step 3: Add VehiclePhotoUploader to VehicleForm

Import the component in [VehicleForm.tsx](../src/components/vehicles/VehicleForm.tsx):

```tsx
import VehiclePhotoUploader from './VehiclePhotoUploader';
```

Add state for tracking photo URL:

```tsx
const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(
  initialData?.vehicle_photo_url || null
);
```

Add the component to your form (suggested location: after Basic Information section):

```tsx
{/* Vehicle Photo Section */}
<CollapsibleSection
  title="Vehicle Photo"
  icon={<Camera className="h-5 w-5" />}
  iconColor="text-blue-600"
  defaultExpanded={true}
>
  <VehiclePhotoUploader
    vehicleId={initialData?.id || 'temp'}
    initialPhotoUrl={vehiclePhotoUrl}
    onPhotoChange={(url) => {
      setVehiclePhotoUrl(url);
      setValue('vehicle_photo_url', url || undefined);
    }}
    disabled={isSubmitting || !initialData?.id}
    helperText={
      !initialData?.id
        ? 'Save the vehicle first before uploading a photo'
        : 'Upload a photo of the vehicle (PNG, JPEG, JPG, or GIF). Previous photo will be replaced.'
    }
  />
</CollapsibleSection>
```

### Step 4: Update Form Submission

Ensure the `vehicle_photo_url` is included in the form data:

```tsx
const onFormSubmit = async (data: Vehicle) => {
  // Include the photo URL in the submission
  const finalData = {
    ...data,
    vehicle_photo_url: vehiclePhotoUrl,
  };

  await onSubmit(finalData);
};
```

### Step 5: Display Photo in Vehicle List/Details

To display the photo in vehicle lists or detail pages:

```tsx
import { getSignedVehiclePhotoUrl } from '@/utils/supabaseStorage';

// In your component
const [photoUrl, setPhotoUrl] = useState<string | null>(null);

useEffect(() => {
  if (vehicle.vehicle_photo_url) {
    getSignedVehiclePhotoUrl(vehicle.vehicle_photo_url).then(setPhotoUrl);
  }
}, [vehicle.vehicle_photo_url]);

// In your JSX
{photoUrl ? (
  <img src={photoUrl} alt={vehicle.registration_number} className="w-full h-48 object-cover" />
) : (
  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
    <ImageIcon className="h-12 w-12 text-gray-400" />
  </div>
)}
```

## API Reference

### Upload Vehicle Photo

```typescript
uploadVehiclePhoto(
  file: File,
  vehicleId: string,
  onProgress?: (progress: number) => void
): Promise<string>
```

**Parameters:**
- `file`: The image file to upload
- `vehicleId`: The ID of the vehicle
- `onProgress`: Optional callback for upload progress (0-100)

**Returns:** The file path in storage

**Throws:**
- Error if no file provided
- Error if vehicle ID is missing
- Error if file type is invalid
- Error if upload fails

### Get Signed Photo URL

```typescript
getSignedVehiclePhotoUrl(
  filePath: string,
  expiresIn?: number
): Promise<string | null>
```

**Parameters:**
- `filePath`: The path returned from `uploadVehiclePhoto`
- `expiresIn`: Optional expiration time in seconds (default: 604800 = 7 days)

**Returns:** Signed URL or `null` if not found

### Delete Vehicle Photo

```typescript
deleteVehiclePhoto(vehicleId: string): Promise<boolean>
```

**Parameters:**
- `vehicleId`: The ID of the vehicle

**Returns:** `true` if successful, `false` otherwise

### Validate File Type

```typescript
validateVehiclePhotoType(file: File): boolean
```

**Parameters:**
- `file`: The file to validate

**Returns:** `true` if valid (PNG, JPEG, JPG, or GIF), `false` otherwise

## Best Practices

1. **Always validate file type** before upload using `validateVehiclePhotoType()`
2. **Limit file size** to prevent storage issues (suggested: 10MB max)
3. **Show upload progress** for better UX using the `onProgress` callback
4. **Handle errors gracefully** with user-friendly error messages
5. **Cache signed URLs** to reduce API calls (URLs are valid for 7 days by default)
6. **Disable upload** for new vehicles until they're saved (vehicle ID required)

## Troubleshooting

### Issue: "Vehicle ID is required" error
**Solution:** Ensure the vehicle is saved before allowing photo upload. The component should be disabled for new vehicles.

### Issue: Photos are mixed between vehicles
**Solution:** This shouldn't happen with the new folder structure. Each vehicle has its own folder (`vehicles/{vehicle-id}/`).

### Issue: Old photos not being deleted
**Solution:** The `uploadVehiclePhoto` function automatically deletes old photos. Check the browser console for errors.

### Issue: "Invalid file type" error
**Solution:** Ensure the file is PNG, JPEG, JPG, or GIF. The validation checks both MIME type and file extension.

### Issue: Photo not displaying
**Solution:**
1. Check if `vehicle_photo_url` is saved in the database
2. Verify the bucket `vehicle-photos` exists and is accessible
3. Check browser console for signed URL errors

## Security Considerations

1. **File Type Validation**: Only image files are accepted
2. **File Size Limits**: Implement size limits to prevent abuse
3. **Access Control**: Configure RLS policies on the `vehicle-photos` bucket
4. **Signed URLs**: Photos are accessed via time-limited signed URLs
5. **Organization Isolation**: Each vehicle has its own folder

## Example Implementation

See the complete example in:
- Component: [src/components/vehicles/VehiclePhotoUploader.tsx](../src/components/vehicles/VehiclePhotoUploader.tsx)
- Utilities: [src/utils/supabaseStorage.ts](../src/utils/supabaseStorage.ts)
- Migration: [supabase/migrations/20251103000000_add_vehicle_photo_url.sql](../supabase/migrations/20251103000000_add_vehicle_photo_url.sql)
