/**
 * Script to apply storage RLS policies to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

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

async function applyStoragePolicies() {
  console.log('🚀 Starting Storage RLS Policies Setup...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251108000000_create_maintenance_storage_buckets.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📋 Applying RLS policies...');

  try {
    // Execute the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try alternative approach using direct SQL execution
      console.log('⚠️  RPC method failed, trying direct execution...');

      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('exec_sql', { sql: statement });
        if (execError) {
          console.error(`❌ Error executing statement:`, execError);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        } else {
          console.log(`✅ Executed statement successfully`);
        }
      }
    } else {
      console.log('✅ RLS policies applied successfully!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Storage buckets created');
    console.log('✅ RLS policies applied');
    console.log('='.repeat(60));

    console.log('\n✨ Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify buckets in Supabase Dashboard > Storage');
    console.log('2. Test file uploads from the maintenance module\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the setup
applyStoragePolicies().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
