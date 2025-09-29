# AVS Fleet Management System - Supabase Project Blueprint

## Project Details
- **Project Reference**: oosrmuqfcqtojflruhww
- **Supabase URL**: https://oosrmuqfcqtojflruhww.supabase.co
- **Export Date**: 2025-09-28 19:05:40

## Database Schema
- **Total Migrations**: 37
- **Edge Functions**: 2

## Migration Files
- 20250117000000_fix_total_fuel_cost_column.sql
- 20250120000000_create_maintenance_service_tasks.sql
- 20250120000001_create_reminder_tracking.sql
- 20250120000002_create_alert_thresholds.sql
- 20250120000003_enhanced_downtime_schema.sql
- 20250120000004_document_summary_materialized_view.sql
- 20250703171029_square_fountain.sql
- 20250703172751_black_dune.sql
- 20250704175336_shy_oasis.sql
- 20250705114320_bronze_moon.sql
- 20250705114645_small_field.sql
- 20250723230402_lingering_summit.sql
- 20250724120000_drop_profiles_role.sql
- 20250818113704_weathered_limit.sql
- 20250819063327_super_cherry.sql
- 20250819100603_spring_snowflake.sql
- 20250819173507_turquoise_rain.sql
- 20250819173512_black_spark.sql
- 20250819173522_dark_lab.sql
- 20250819173529_damp_voice.sql
- 20250821115311_raspy_fountain.sql
- 20250821125004_cold_shape.sql
- 20250829070316_maroon_shadow.sql
- 20250911070000_add_refuelings_column.sql
- 20250912161700_add_correction_cascade.sql
- 20250912162000_add_odometer_continuity_check.sql
- 20250912163000_add_concurrent_trip_prevention.sql
- 20250912164100_add_fuel_efficiency_baselines.sql
- 20250912165000_add_mileage_chain_integrity.sql
- 20250912166000_add_value_range_validation.sql
- 20250912180000_add_odometer_continuity_check.sql
- 20250912182000_add_mileage_chain_integrity.sql
- 20250912183000_add_value_range_validation.sql
- 20250918103736_delicate_silence.sql
- 20250919152512_square_ocean.sql
- 20250919152514_humble_limit.sql
- 20250921174910_silent_coral.sql


## Edge Functions
- fetch-challan-info
- fetch-rc-details


## Key Features
- Fleet Management System
- Trip Sheet Module
- Vehicle Tracking
- Driver Management
- Maintenance Tracking
- Document Processing
- Real-time Analytics

## Authentication
- Email-based login system
- Organization-based access control
- Supabase Auth integration

## Next Steps
1. Install Supabase CLI: winget install Supabase.CLI or download from GitHub
2. Run supabase gen types typescript to generate actual TypeScript types
3. Use supabase db pull to get the latest schema
4. Export additional data from Supabase Studio as needed
