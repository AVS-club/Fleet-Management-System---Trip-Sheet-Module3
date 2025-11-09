# Supabase Storage Buckets Setup Guide

This document explains how to set up the required Supabase storage buckets for the Fleet Management System's maintenance module.

## Required Buckets

The application requires **4 storage buckets** for maintenance-related files:

1. **`maintenance-bills`** - For maintenance invoices and bills
2. **`battery-warranties`** - For battery warranty documents
3. **`tyre-warranties`** - For tyre warranty documents
4. **`part-warranties`** - For all other parts warranty documents

## Organization-Based Path Structure

All files are stored with organization-level isolation to ensure data privacy:

```
{organization-id}/tasks/{task-id}/{type-folder}/{filename}
```

### Examples:

- **Bill**: `a1b2c3d4.../tasks/task-123/group0/bills/invoice.pdf`
- **Battery warranty**: `a1b2c3d4.../tasks/task-123/group0/batteries/warranty.pdf`
- **Tyre warranty**: `a1b2c3d4.../tasks/task-123/group0/tyres/warranty.pdf`
- **Part warranty**: `a1b2c3d4.../tasks/task-123/group0/parts/part0/warranty.pdf`

---

## Setup Instructions

### Option 1: Automated Setup (Recommended)

1. **Set environment variables** (if not already set):
   ```bash
   export VITE_SUPABASE_URL=https://your-project.supabase.co
   export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Run the setup script**:
   ```bash
   npx ts-node scripts/create-storage-buckets.ts
   ```

   This will:
   - Create all 4 buckets if they don't exist
   - Configure them as private (authenticated access only)
   - Set allowed MIME types (images and PDFs)

3. **Run the migration** to add RLS policies:
   ```bash
   npx supabase db push
   ```
   or
   ```bash
   npx supabase migration up
   ```

### Option 2: Manual Setup via Supabase Dashboard

1. **Go to** [Supabase Dashboard](https://app.supabase.com) → Your Project → Storage

2. **Create each bucket** with these settings:
   - Click "New bucket"
   - **Bucket name**: `maintenance-bills`
   - **Public bucket**: ❌ OFF (private)
   - **File size limit**: No limit
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, application/pdf`
   - Click "Create bucket"

3. **Repeat** for the other 3 buckets:
   - `battery-warranties`
   - `tyre-warranties`
   - `part-warranties`

4. **Run the migration** to add RLS policies:
   ```bash
   npx supabase migration up
   ```

---

## Row Level Security (RLS) Policies

The migration `20251108000000_create_maintenance_storage_buckets.sql` automatically creates RLS policies for each bucket:

### Policy Summary:

| Operation | Who Can Access | Condition |
|-----------|---------------|-----------|
| **SELECT** | All org users | Can view files from their organization |
| **INSERT** | All org users | Can upload to their org's folder |
| **UPDATE** | All org users | Can update files in their org's folder |
| **DELETE** | Admins & Owners only | Can delete files from their org's folder |

### How it Works:

The RLS policies extract the organization ID from the file path and verify:
1. The user is authenticated
2. The user belongs to that organization (via `organization_users` table)
3. For DELETE: The user has `admin` or `owner` role

---

## Verification

After setup, verify the buckets are working:

1. **Check bucket existence**:
   - Go to Supabase Dashboard → Storage
   - Confirm all 4 buckets exist

2. **Test file upload**:
   - Create a new maintenance task
   - Upload a warranty document
   - Check the browser console for errors

3. **Verify organization isolation**:
   - Create a test user in a different organization
   - Try to access files from the first organization
   - Should fail (403 Forbidden)

---

## Troubleshooting

### Error: "Bucket not found"

**Problem**: The buckets don't exist yet.

**Solution**: Run the setup script or create them manually.

### Error: "new row violates row-level security policy"

**Problem**: User doesn't have permission to upload/access files.

**Solution**:
1. Check user is authenticated
2. Verify user has an active organization
3. Ensure RLS policies are applied (run migration)

### Error: "User not authenticated" or "No active organization found"

**Problem**: User session or organization context is missing.

**Solution**:
1. Ensure user is logged in
2. Check `organization_users` table has entry for this user
3. Verify the user has selected an organization

---

## File Path Examples

### When uploading files, the code automatically generates paths:

```typescript
// Bills
uploadMaintenanceBills(files, taskId, groupIndex)
// → {org-id}/tasks/{task-id}/group{N}/bills/{filename}

// Battery warranty
uploadWarrantyDocuments(files, taskId, groupIndex, 'battery')
// → {org-id}/tasks/{task-id}/group{N}/batteries/battery/{filename}

// Tyre warranty
uploadWarrantyDocuments(files, taskId, groupIndex, 'tyre')
// → {org-id}/tasks/{task-id}/group{N}/tyres/tyre/{filename}

// Part warranty
uploadWarrantyDocuments(files, taskId, groupIndex, 'part', partIndex)
// → {org-id}/tasks/{task-id}/group{N}/parts/part{M}/{filename}
```

---

## Migration File

Location: `supabase/migrations/20251108000000_create_maintenance_storage_buckets.sql`

This migration creates 16 RLS policies (4 per bucket for SELECT, INSERT, UPDATE, DELETE operations).

---

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security in Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
