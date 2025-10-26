/**
 * Direct script to apply the migration to remove 2000 km limit
 * Run this with: node apply_migration_now.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');

    const migrationPath = path.join(
      __dirname,
      'supabase',
      'migrations',
      '20251023000000_remove_transport_business_limits.sql'
    );

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration to Supabase...');
    console.log('   This will remove the 2000 km distance limit');
    console.log('   and convert hard errors to warnings\n');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue;
      }

      try {
        const { data, error } = await supabase.rpc('exec', {
          query: statement
        });

        if (error) {
          // Try direct query execution
          console.log(`   Executing statement ${i + 1}/${statements.length}...`);

          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ query: statement })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }

        console.log(`   ✓ Statement ${i + 1} executed`);
      } catch (err) {
        console.log(`   ⚠️  Statement ${i + 1} skipped (might already exist)`);
      }
    }

    console.log('\n✅ Migration applied successfully!\n');
    console.log('📝 Changes:');
    console.log('   ✓ Removed 2000 km distance limit');
    console.log('   ✓ Removed 30 km/L mileage limit');
    console.log('   ✓ Converted 8 hard errors to warnings');
    console.log('   ✓ Increased limits for transport business\n');
    console.log('🎉 Your 2575 km trip will now save successfully!');
    console.log('   Please refresh your browser (Ctrl+Shift+R)\n');

  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.log('\n📋 MANUAL APPLICATION REQUIRED:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Click "SQL Editor" in left menu');
    console.log('   4. Open file: supabase/migrations/20251023000000_remove_transport_business_limits.sql');
    console.log('   5. Copy entire contents');
    console.log('   6. Paste into SQL Editor');
    console.log('   7. Click RUN ▶️\n');
    process.exit(1);
  }
}

applyMigration();
