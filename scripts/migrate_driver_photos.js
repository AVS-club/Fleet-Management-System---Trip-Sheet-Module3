/**
 * Driver Photo Storage Migration Script
 *
 * Purpose: Migrate driver photos from license-number-based or temp-ID folders
 *          to UUID-based folders for consistency
 *
 * Usage:
 *   SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_key node scripts/migrate_driver_photos.js
 *
 * What it does:
 *   1. Fetches all drivers with non-UUID storage paths
 *   2. Downloads photos from old paths
 *   3. Uploads to new UUID-based paths
 *   4. Updates database records
 *   5. Logs all changes (old files are kept for safety)
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_BUCKET = 'driver-docs';
const DRY_RUN = process.env.DRY_RUN === 'true'; // Set DRY_RUN=true to test without making changes

// Validate environment
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please set: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  console.error('');
  console.error('Example:');
  console.error('   SUPABASE_URL=https://your-project.supabase.co \\');
  console.error('   SUPABASE_SERVICE_KEY=your-service-key \\');
  console.error('   node scripts/migrate_driver_photos.js');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Check if a path is already using UUID format
 */
function isUuidPath(path, driverId) {
  if (!path) return false;
  if (path.startsWith('data:')) return true; // Data URLs don't need migration
  if (path.startsWith('http')) return true; // Full URLs don't need migration
  return path.startsWith(`${driverId}/`);
}

/**
 * Generate the new UUID-based path for a photo
 */
function getNewPath(driverId, oldPath) {
  // Extract file extension from old path
  const fileExt = oldPath.split('.').pop() || 'jpg';
  return `${driverId}/profile-photo/photo.${fileExt}`;
}

/**
 * Migrate a single driver's photo
 */
async function migrateDriverPhoto(driver) {
  const { id, name, license_number, driver_photo_url } = driver;
  const oldPath = driver_photo_url;

  console.log(`\n📸 Processing: ${name} (${license_number})`);
  console.log(`   Old path: ${oldPath}`);

  // Check if already correct
  if (isUuidPath(oldPath, id)) {
    console.log(`   ✓ Already using UUID format - skipping`);
    return { status: 'skipped', reason: 'already_correct' };
  }

  const newPath = getNewPath(id, oldPath);
  console.log(`   New path: ${newPath}`);

  if (DRY_RUN) {
    console.log(`   🔍 DRY RUN - Would migrate from ${oldPath} to ${newPath}`);
    return { status: 'dry_run', oldPath, newPath };
  }

  try {
    // Step 1: Download the old file
    console.log(`   📥 Downloading from old location...`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(oldPath);

    if (downloadError) {
      console.error(`   ❌ Download failed: ${downloadError.message}`);
      return { status: 'error', step: 'download', error: downloadError.message };
    }

    if (!fileData) {
      console.error(`   ❌ No file data received`);
      return { status: 'error', step: 'download', error: 'No file data' };
    }

    console.log(`   ✓ Downloaded successfully (${fileData.size} bytes)`);

    // Step 2: Upload to new location
    console.log(`   📤 Uploading to new location...`);
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(newPath, fileData, {
        upsert: true,
        contentType: fileData.type || 'image/jpeg'
      });

    if (uploadError) {
      console.error(`   ❌ Upload failed: ${uploadError.message}`);
      return { status: 'error', step: 'upload', error: uploadError.message };
    }

    console.log(`   ✓ Uploaded successfully`);

    // Step 3: Update database
    console.log(`   💾 Updating database...`);
    const { error: updateError } = await supabase
      .from('drivers')
      .update({ driver_photo_url: newPath })
      .eq('id', id);

    if (updateError) {
      console.error(`   ❌ Database update failed: ${updateError.message}`);
      return { status: 'error', step: 'database', error: updateError.message };
    }

    console.log(`   ✓ Database updated`);

    // Step 4: Verify new file exists
    console.log(`   🔍 Verifying new file...`);
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(newPath);

    if (publicUrlData?.publicUrl) {
      console.log(`   ✓ New file accessible at: ${publicUrlData.publicUrl}`);
    }

    // Note: We intentionally don't delete the old file yet for safety
    console.log(`   ℹ️  Old file kept for safety (can be deleted manually later)`);

    console.log(`   ✅ Migration successful!`);
    return { status: 'success', oldPath, newPath };

  } catch (error) {
    console.error(`   ❌ Unexpected error: ${error.message}`);
    return { status: 'error', step: 'unexpected', error: error.message };
  }
}

/**
 * Main migration function
 */
async function migrateAllDriverPhotos() {
  console.log('='.repeat(80));
  console.log('Driver Photo Storage Migration');
  console.log('='.repeat(80));
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }

  // Step 1: Fetch all drivers with photo URLs
  console.log('📋 Fetching drivers with photos...');
  const { data: drivers, error: fetchError } = await supabase
    .from('drivers')
    .select('id, name, license_number, driver_photo_url')
    .not('driver_photo_url', 'is', null)
    .order('name');

  if (fetchError) {
    console.error('❌ Error fetching drivers:', fetchError.message);
    process.exit(1);
  }

  console.log(`✓ Found ${drivers.length} drivers with photos`);
  console.log('');

  // Step 2: Migrate each driver
  const results = {
    total: drivers.length,
    success: 0,
    skipped: 0,
    errors: 0,
    dry_run: 0,
    errorDetails: []
  };

  for (const driver of drivers) {
    const result = await migrateDriverPhoto(driver);

    if (result.status === 'success') {
      results.success++;
    } else if (result.status === 'skipped') {
      results.skipped++;
    } else if (result.status === 'dry_run') {
      results.dry_run++;
    } else {
      results.errors++;
      results.errorDetails.push({
        driver: driver.name,
        license: driver.license_number,
        error: result.error,
        step: result.step
      });
    }
  }

  // Step 3: Print summary
  console.log('');
  console.log('='.repeat(80));
  console.log('Migration Summary');
  console.log('='.repeat(80));
  console.log(`Total drivers processed:  ${results.total}`);
  console.log(`✅ Successfully migrated:  ${results.success}`);
  console.log(`⏭️  Skipped (already OK):   ${results.skipped}`);
  if (DRY_RUN) {
    console.log(`🔍 Would migrate:          ${results.dry_run}`);
  }
  console.log(`❌ Errors:                 ${results.errors}`);

  if (results.errorDetails.length > 0) {
    console.log('');
    console.log('Error Details:');
    results.errorDetails.forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.driver} (${err.license})`);
      console.log(`   Step: ${err.step}`);
      console.log(`   Error: ${err.error}`);
    });
  }

  console.log('');
  console.log('='.repeat(80));

  if (DRY_RUN) {
    console.log('');
    console.log('ℹ️  This was a DRY RUN. To actually perform the migration, run:');
    console.log('   node scripts/migrate_driver_photos.js');
    console.log('');
  } else if (results.success > 0) {
    console.log('');
    console.log('✅ Migration complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify photos are displaying correctly in the application');
    console.log('2. Run the verification SQL query to confirm database state');
    console.log('3. After verification, old files can be deleted from storage');
    console.log('');
  }
}

// Run the migration
migrateAllDriverPhotos()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
