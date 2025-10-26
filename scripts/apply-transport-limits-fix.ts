/**
 * Script to apply the transport business limits fix migration
 * This removes the 2000km distance limit and 30km/L mileage limit
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');

    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '20251023000000_remove_transport_business_limits.sql'
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration to remove transport business limits...');
    console.log('   - Removing 2000 km distance limit');
    console.log('   - Removing 30 km/L mileage limit');
    console.log('   - Increasing trip duration to 168 hours (1 week)');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If RPC doesn't exist, try direct execution
      console.log('⚠️  RPC method not available, trying direct execution...');

      // For direct execution, we need to use the REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (!response.ok) {
        throw new Error(`Failed to execute migration: ${response.statusText}`);
      }

      console.log('✅ Migration applied successfully!');
    } else {
      console.log('✅ Migration applied successfully!');
    }

    console.log('\n📝 Changes applied:');
    console.log('   ✓ Removed 2000 km maximum distance validation');
    console.log('   ✓ Removed 30 km/L maximum mileage validation');
    console.log('   ✓ Increased distance warning to 5000 km');
    console.log('   ✓ Increased mileage warning to 100 km/L');
    console.log('   ✓ Increased trip duration limit to 168 hours');

    console.log('\n🎉 You can now save trips with:');
    console.log('   - Any distance (your 2615 km trip will work)');
    console.log('   - High mileage vehicles (two-wheelers, etc.)');
    console.log('   - Long-haul trips up to 1 week');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n📋 Manual Application Instructions:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Open SQL Editor');
    console.log('   3. Copy the contents of:');
    console.log('      supabase/migrations/20251023000000_remove_transport_business_limits.sql');
    console.log('   4. Paste and run in SQL Editor');
    process.exit(1);
  }
}

applyMigration();
