import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://oosrmuqfcqtojflruhww.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc3JtdXFmY3F0b2pmbHJ1aHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxODkyNjUsImV4cCI6MjA2Mzc2NTI2NX0.-TH-8tVoA4WOkco_I2WDQlchjZga4FvwiLZevw0jjCE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDriverPhotos() {
  console.log('🔍 Checking driver photos in storage...\n');

  try {
    // List all files in the driver-photos bucket (root level)
    const { data: files, error } = await supabase.storage
      .from('driver-photos')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    console.log('   Checking root level...');

    // Also check the 'drivers' subfolder
    const { data: driversFiles, error: driversError } = await supabase.storage
      .from('driver-photos')
      .list('drivers', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (driversFiles && driversFiles.length > 0) {
      console.log(`   Found ${driversFiles.length} files in drivers/ subfolder`);
      files?.push(...driversFiles);
    }

    if (error) {
      console.error('❌ Error listing files:', error);
      return;
    }

    if (!files || files.length === 0) {
      console.log('⚠️  No photos found in storage');
      return;
    }

    console.log(`✅ Found ${files.length} photos in storage:\n`);

    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${(file.metadata.size / 1024).toFixed(2)} KB)`);
    });

    console.log('\n📊 Summary:');
    console.log(`   Total photos: ${files.length}`);
    console.log(`   Total size: ${(files.reduce((sum, f) => sum + (f.metadata.size || 0), 0) / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDriverPhotos();
