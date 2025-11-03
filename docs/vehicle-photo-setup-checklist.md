# Vehicle Photo Setup Checklist

## Pre-Implementation Checklist

- [ ] Read the [Vehicle Photo Integration Guide](./vehicle-photo-integration-guide.md)
- [ ] Backup your database before running migrations
- [ ] Ensure you have Supabase admin access

## Database Setup

- [ ] Run the migration to add `vehicle_photo_url` column:
  ```bash
  npx supabase db push
  ```
  or apply: `supabase/migrations/20251103000000_add_vehicle_photo_url.sql`

- [ ] Verify the column was added:
  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'vehicles' AND column_name = 'vehicle_photo_url';
  ```

## Supabase Storage Setup

- [ ] Go to Supabase Dashboard → Storage
- [ ] Create a new bucket named `vehicle-photos`
- [ ] Set bucket visibility to **Public** (or configure RLS)
- [ ] Set maximum file size (suggested: 10MB)
- [ ] Test bucket by uploading a sample image

### Optional: Configure RLS Policies

If you want to restrict access, add these policies to the `vehicle-photos` bucket:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos');

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated reads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'vehicle-photos');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'vehicle-photos');
```

## Code Integration

- [ ] Import `VehiclePhotoUploader` in [VehicleForm.tsx](../src/components/vehicles/VehicleForm.tsx):
  ```tsx
  import VehiclePhotoUploader from './VehiclePhotoUploader';
  ```

- [ ] Add state for photo URL:
  ```tsx
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(
    initialData?.vehicle_photo_url || null
  );
  ```

- [ ] Add the photo uploader component to your form (see guide for exact placement)

- [ ] Update form submission to include `vehicle_photo_url`

- [ ] Register the `vehicle_photo_url` field:
  ```tsx
  useEffect(() => {
    register('vehicle_photo_url');
  }, [register]);
  ```

## Testing

### Test 1: Upload New Photo
- [ ] Create a new vehicle
- [ ] Save the vehicle
- [ ] Upload a vehicle photo (PNG, JPEG, JPG, or GIF)
- [ ] Verify the photo displays correctly
- [ ] Check Supabase Storage for the file at `vehicles/{vehicle-id}/photo.{ext}`
- [ ] Check database for `vehicle_photo_url` value

### Test 2: Replace Existing Photo
- [ ] Open a vehicle with an existing photo
- [ ] Click "Replace Photo" button
- [ ] Upload a different photo
- [ ] Verify the old photo is deleted from storage
- [ ] Verify the new photo displays correctly
- [ ] Verify only one photo exists in `vehicles/{vehicle-id}/` folder

### Test 3: Delete Photo
- [ ] Open a vehicle with a photo
- [ ] Click the delete button (X)
- [ ] Confirm deletion
- [ ] Verify the photo is removed from display
- [ ] Verify the file is deleted from storage
- [ ] Verify `vehicle_photo_url` is set to NULL in database

### Test 4: File Validation
- [ ] Try uploading a PDF file → Should show error
- [ ] Try uploading a video file → Should show error
- [ ] Try uploading a file > 10MB → Should show error
- [ ] Upload a valid PNG file → Should succeed
- [ ] Upload a valid JPEG file → Should succeed
- [ ] Upload a valid GIF file → Should succeed

### Test 5: Organization Isolation
- [ ] Create two vehicles (Vehicle A and Vehicle B)
- [ ] Upload a photo to Vehicle A
- [ ] Upload a different photo to Vehicle B
- [ ] Verify photos are in separate folders:
  - `vehicles/{vehicle-a-id}/photo.jpg`
  - `vehicles/{vehicle-b-id}/photo.png`
- [ ] Verify each vehicle shows only its own photo

### Test 6: Edge Cases
- [ ] Try uploading photo for unsaved vehicle → Should be disabled
- [ ] Try uploading same photo twice → Should replace with same file
- [ ] Edit vehicle and cancel without saving → Photo should remain unchanged
- [ ] Delete vehicle → Verify photo folder still exists (optional cleanup)

## Deployment Checklist

- [ ] Run migration in production database
- [ ] Create `vehicle-photos` bucket in production Supabase
- [ ] Configure production bucket policies (if using RLS)
- [ ] Test photo upload in production
- [ ] Monitor storage usage
- [ ] Set up storage quota alerts (if needed)

## Maintenance

- [ ] Document storage cleanup procedure (if needed)
- [ ] Set up monitoring for storage bucket size
- [ ] Plan for photo backup strategy
- [ ] Consider implementing image optimization (compression)

## Optional Enhancements

- [ ] Add image cropping functionality
- [ ] Add image compression before upload
- [ ] Support multiple photos per vehicle (if needed)
- [ ] Add photo capture from camera (mobile)
- [ ] Add photo metadata (capture date, location)
- [ ] Implement lazy loading for photo galleries

## Rollback Plan

If you need to rollback the changes:

1. Remove the photo uploader component from VehicleForm
2. Run rollback migration:
   ```sql
   ALTER TABLE public.vehicles DROP COLUMN IF EXISTS vehicle_photo_url;
   ```
3. Delete the `vehicle-photos` bucket (if no longer needed)
4. Remove utility functions from `supabaseStorage.ts` (optional)

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs in Dashboard
3. Verify bucket permissions
4. Ensure vehicle ID is valid and saved
5. Check network requests in browser DevTools
6. Review the [Integration Guide](./vehicle-photo-integration-guide.md)

## Summary

✅ **Created Files:**
- `src/components/vehicles/VehiclePhotoUploader.tsx` - Photo upload component
- `src/utils/supabaseStorage.ts` - Updated with vehicle photo functions
- `src/types/vehicle.ts` - Updated with `vehicle_photo_url` field
- `supabase/migrations/20251103000000_add_vehicle_photo_url.sql` - Database migration
- `docs/vehicle-photo-integration-guide.md` - Complete integration guide
- `docs/vehicle-photo-setup-checklist.md` - This checklist

✅ **Key Features:**
- Single photo per vehicle
- Automatic replacement of old photos
- Organized folder structure (`vehicles/{vehicle-id}/`)
- File type validation (PNG, JPEG, JPG, GIF)
- Upload progress tracking
- Signed URL generation for secure access

✅ **Next Steps:**
1. Run the database migration
2. Create the Supabase storage bucket
3. Integrate VehiclePhotoUploader into VehicleForm
4. Test thoroughly using the test cases above
5. Deploy to production
