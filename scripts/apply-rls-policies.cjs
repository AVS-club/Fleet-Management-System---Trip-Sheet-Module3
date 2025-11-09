/**
 * Script to apply storage RLS policies directly to Supabase
 *
 * This script reads the migration SQL and applies it using Supabase's REST API
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSPolicies() {
  console.log('🚀 Applying Storage RLS Policies...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

  // Read the migration SQL
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251108000000_create_maintenance_storage_buckets.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual CREATE POLICY statements
  const policyStatements = sql
    .split('CREATE POLICY')
    .slice(1) // Remove first empty element
    .map(s => 'CREATE POLICY' + s.trim())
    .filter(s => s.length > 0);

  console.log(`📋 Found ${policyStatements.length} RLS policies to apply\n`);

  let successCount = 0;
  let errorCount = 0;

  // Apply each policy using the Supabase client
  for (let i = 0; i < policyStatements.length; i++) {
    const statement = policyStatements[i];

    // Extract policy name for logging
    const nameMatch = statement.match(/"([^"]+)"/);
    const policyName = nameMatch ? nameMatch[1] : `Policy ${i + 1}`;

    console.log(`  [${i + 1}/${policyStatements.length}] Applying: ${policyName}`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      });

      if (error) {
        // If error is "already exists", that's okay
        if (error.message && error.message.includes('already exists')) {
          console.log(`    ⚠️  Policy already exists, skipping...`);
          successCount++;
        } else {
          console.error(`    ❌ Error:`, error.message || error);
          errorCount++;
        }
      } else {
        console.log(`    ✅ Applied successfully`);
        successCount++;
      }
    } catch (err) {
      console.error(`    ❌ Exception:`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully applied: ${successCount} policies`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} policies`);
  }
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n⚠️  Some policies failed to apply.');
    console.log('You can manually apply them via Supabase Dashboard > SQL Editor');
    process.exit(1);
  }

  console.log('\n✨ All RLS policies applied successfully!');
  console.log('\n📋 Setup Complete:');
  console.log('  ✅ Storage buckets created');
  console.log('  ✅ RLS policies applied');
  console.log('\n🧪 Next step: Test file uploads in the maintenance module\n');
}

applyRLSPolicies().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
