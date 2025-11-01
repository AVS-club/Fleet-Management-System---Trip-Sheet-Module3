// Quick script to check KPI data in Supabase
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Need: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKPIs() {
  console.log('🔍 Checking KPI Cards in database...\n');

  try {
    // Check if kpi_cards table exists and has data
    const { data: kpiCards, error, count } = await supabase
      .from('kpi_cards')
      .select('*', { count: 'exact' })
      .order('computed_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching KPI cards:', error.message);
      if (error.message.includes('does not exist')) {
        console.error('\n⚠️  The kpi_cards table does not exist!');
        console.error('Please run the SQL migration first.');
      }
      return;
    }

    if (!kpiCards || kpiCards.length === 0) {
      console.log('⚠️  No KPI cards found in database');
      console.log('\nPlease run the kpi_generation_fixed.sql script in Supabase SQL Editor');
      return;
    }

    console.log(`✅ Found ${count} KPI cards in database\n`);
    console.log('📊 Recent KPI Cards:');
    console.log('=' .repeat(80));

    kpiCards.forEach((kpi, index) => {
      console.log(`\n${index + 1}. ${kpi.kpi_title}`);
      console.log(`   Key: ${kpi.kpi_key}`);
      console.log(`   Value: ${kpi.kpi_value_human}`);
      console.log(`   Theme: ${kpi.theme}`);
      console.log(`   Org ID: ${kpi.organization_id || 'NULL'}`);
      console.log(`   Computed: ${new Date(kpi.computed_at).toLocaleString()}`);

      if (kpi.kpi_payload) {
        const payload = kpi.kpi_payload;
        if (payload.trend) console.log(`   Trend: ${payload.trend} (${payload.change || 'N/A'})`);
        if (payload.period) console.log(`   Period: ${payload.period}`);
      }
    });

    console.log('\n' + '='.repeat(80));

    // Check organization_id distribution
    const { data: orgStats } = await supabase
      .from('kpi_cards')
      .select('organization_id')
      .not('organization_id', 'is', null);

    if (orgStats) {
      const uniqueOrgs = new Set(orgStats.map(k => k.organization_id));
      console.log(`\n✅ KPIs belong to ${uniqueOrgs.size} organization(s)`);
      uniqueOrgs.forEach(orgId => {
        const orgCount = orgStats.filter(k => k.organization_id === orgId).length;
        console.log(`   - ${orgId}: ${orgCount} KPIs`);
      });
    }

    // Check for NULL organization_id
    const { count: nullOrgCount } = await supabase
      .from('kpi_cards')
      .select('*', { count: 'exact', head: true })
      .is('organization_id', null);

    if (nullOrgCount > 0) {
      console.log(`\n⚠️  Warning: ${nullOrgCount} KPIs have NULL organization_id`);
      console.log('   These will not appear in the feed due to RLS policies');
    }

    // Check events_feed for KPI events
    const { data: kpiEvents, count: eventCount } = await supabase
      .from('events_feed')
      .select('*', { count: 'exact' })
      .eq('kind', 'kpi')
      .limit(5);

    console.log(`\n📰 KPI Events in feed: ${eventCount || 0}`);
    if (kpiEvents && kpiEvents.length > 0) {
      console.log('   Sample events:');
      kpiEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.title} (${new Date(event.event_time).toLocaleString()})`);
      });
    }

    console.log('\n✅ KPI check complete!\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkKPIs();
