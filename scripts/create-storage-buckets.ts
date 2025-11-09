/**
 * Script to create Supabase storage buckets for maintenance files
 *
 * Run this script once to set up the required storage buckets with proper configuration.
 *
 * Usage:
 *   npx tsx scripts/create-storage-buckets.ts
 *
 * Or add to package.json scripts:
 *   "setup:storage": "tsx scripts/create-storage-buckets.ts"
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Storage buckets configuration
 */
const BUCKETS = [
  {
    id: 'maintenance-bills',
    name: 'Maintenance Bills',
    public: false,
    fileSizeLimit: null, // No limit
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  {
    id: 'battery-warranties',
    name: 'Battery Warranties',
    public: false,
    fileSizeLimit: null,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  {
    id: 'tyre-warranties',
    name: 'Tyre Warranties',
    public: false,
    fileSizeLimit: null,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  {
    id: 'part-warranties',
    name: 'Part Warranties',
    public: false,
    fileSizeLimit: null,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
];

/**
 * Create a storage bucket if it doesn't exist
 */
async function createBucket(bucketConfig: typeof BUCKETS[0]) {
  console.log(`\n📦 Creating bucket: ${bucketConfig.id}...`);

  // Check if bucket already exists
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error(`❌ Error listing buckets:`, listError);
    return false;
  }

  const bucketExists = existingBuckets?.some(b => b.id === bucketConfig.id);

  if (bucketExists) {
    console.log(`✅ Bucket "${bucketConfig.id}" already exists, skipping...`);
    return true;
  }

  // Create the bucket
  const { data, error } = await supabase.storage.createBucket(bucketConfig.id, {
    public: bucketConfig.public,
    fileSizeLimit: bucketConfig.fileSizeLimit,
    allowedMimeTypes: bucketConfig.allowedMimeTypes,
  });

  if (error) {
    console.error(`❌ Error creating bucket "${bucketConfig.id}":`, error);
    return false;
  }

  console.log(`✅ Successfully created bucket: ${bucketConfig.id}`);
  return true;
}

/**
 * Main setup function
 */
async function setupStorageBuckets() {
  console.log('🚀 Starting Supabase Storage Bucket Setup...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`📝 Creating ${BUCKETS.length} buckets...`);

  let successCount = 0;
  let failCount = 0;

  for (const bucket of BUCKETS) {
    const success = await createBucket(bucket);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully created/verified: ${successCount} buckets`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} buckets`);
  }
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n⚠️  Some buckets failed to create. Check the errors above.');
    process.exit(1);
  }

  console.log('\n✨ All storage buckets are ready!');
  console.log('\n📋 Next steps:');
  console.log('1. Run the migration: npx supabase migration up');
  console.log('2. Verify RLS policies in Supabase Dashboard > Storage');
  console.log('3. Test file uploads from the maintenance module\n');
}

// Run the setup
setupStorageBuckets().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
