# Manual Supabase Project Blueprint Exporter
# Creates a comprehensive export using existing files and API calls

param(
    [string]$ProjectRef = "oosrmuqfcqtojflruhww",
    [string]$SupabaseUrl = "https://oosrmuqfcqtojflruhww.supabase.co",
    [string]$AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc3JtdXFmY3F0b2pmbHJ1aHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxODkyNjUsImV4cCI6MjA2Mzc2NTI2NX0.-TH-8tVoA4WOkco_I2WDQlchjZga4FvwiLZevw0jjCE"
)

# Create timestamped folder
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Root = "project-blueprint_$Stamp"

Write-Host ">> Creating project blueprint export: $Root" -ForegroundColor Green

# Create folder structure
$Folders = @(
    "01_schema", "02_types", "03_rls", "04_grants", "05_functions_rpc",
    "06_triggers_views", "07_indexes", "08_extensions", "09_publications_realtime",
    "10_edge_functions", "11_storage", "12_auth", "13_api_docs", "99_plan_notes"
)

foreach ($Folder in $Folders) {
    New-Item -ItemType Directory -Path "$Root\$Folder" -Force | Out-Null
}

########################################
# 1) Export existing migrations as schema
########################################
Write-Host ">> Exporting existing migrations as schema..."

# Combine all migration files into a single schema file
$AllMigrations = Get-ChildItem -Path "supabase\migrations" -Filter "*.sql" | Sort-Object Name
$CombinedSchema = @()

foreach ($Migration in $AllMigrations) {
    $Content = Get-Content $Migration.FullName -Raw
    $CombinedSchema += "-- Migration: $($Migration.Name)"
    $CombinedSchema += $Content
    $CombinedSchema += ""
    $CombinedSchema += "--" + "="*80
    $CombinedSchema += ""
}

$CombinedSchema | Out-File -FilePath "$Root\01_schema\combined_migrations.sql" -Encoding UTF8

# Copy individual migration files
New-Item -ItemType Directory -Path "$Root\01_schema\migrations" -Force | Out-Null
Copy-Item "supabase\migrations\*" "$Root\01_schema\migrations\" -Recurse

########################################
# 2) Export Edge Functions
########################################
Write-Host ">> Exporting Edge Functions..."

# Copy existing functions
if (Test-Path "supabase\functions") {
    Copy-Item "supabase\functions\*" "$Root\10_edge_functions\" -Recurse
    
    # Create functions list
    $Functions = Get-ChildItem -Path "supabase\functions" -Directory
    $FunctionList = @("Function Name", "Status", "Last Modified")
    foreach ($Function in $Functions) {
        $FunctionList += "$($Function.Name) | Active | $($Function.LastWriteTime)"
    }
    $FunctionList | Out-File -FilePath "$Root\10_edge_functions\functions_list.txt" -Encoding UTF8
}

########################################
# 3) Export additional SQL files
########################################
Write-Host ">> Exporting additional SQL files..."

# Copy other SQL files
$SqlFiles = @(
    "supabase\complete_database_setup.sql",
    "supabase\force_schema_reload.sql",
    "supabase\scanner_rpcs.sql",
    "supabase\test_data_integrity_fixes.sql"
)

foreach ($SqlFile in $SqlFiles) {
    if (Test-Path $SqlFile) {
        $FileName = Split-Path $SqlFile -Leaf
        Copy-Item $SqlFile "$Root\01_schema\$FileName"
    }
}

########################################
# 4) Create TypeScript types placeholder
########################################
Write-Host ">> Creating TypeScript types placeholder..."

$TypesContent = @"
// Generated TypeScript types for Supabase
// Note: This is a placeholder. Use 'supabase gen types typescript' to generate actual types

export interface Database {
  public: {
    Tables: {
      // Add your table types here
      // Example:
      // users: {
      //   Row: {
      //     id: string
      //     email: string
      //     created_at: string
      //   }
      //   Insert: {
      //     id?: string
      //     email: string
      //     created_at?: string
      //   }
      //   Update: {
      //     id?: string
      //     email?: string
      //     created_at?: string
      //   }
    }
    Views: {
      // Add your view types here
    }
    Functions: {
      // Add your function types here
    }
    Enums: {
      // Add your enum types here
    }
  }
}

// Usage example:
// import { createClient } from '@supabase/supabase-js'
// import type { Database } from './database'
// 
// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )
"@

$TypesContent | Out-File -FilePath "$Root\02_types\database.ts" -Encoding UTF8

########################################
# 5) Extract RLS policies from migrations
########################################
Write-Host ">> Extracting RLS policies..."

$RlsPolicies = @()
foreach ($Migration in $AllMigrations) {
    $Content = Get-Content $Migration.FullName -Raw
    $Policies = [regex]::Matches($Content, "(?i)(CREATE POLICY|ALTER POLICY|ENABLE ROW LEVEL SECURITY|FOR \(SELECT|INSERT|UPDATE|DELETE\)|USING \(|WITH CHECK \()")
    foreach ($Policy in $Policies) {
        $RlsPolicies += "-- From $($Migration.Name):"
        $RlsPolicies += $Policy.Value
        $RlsPolicies += ""
    }
}

if ($RlsPolicies.Count -gt 0) {
    $RlsPolicies | Out-File -FilePath "$Root\03_rls\rls_policies.md" -Encoding UTF8
} else {
    "No RLS policies found in migrations" | Out-File -FilePath "$Root\03_rls\rls_policies.md" -Encoding UTF8
}

########################################
# 6) Create project documentation
########################################
Write-Host ">> Creating project documentation..."

$ProjectInfo = @"
# AVS Fleet Management System - Supabase Project Blueprint

## Project Details
- **Project Reference**: $ProjectRef
- **Supabase URL**: $SupabaseUrl
- **Export Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Database Schema
- **Total Migrations**: $($AllMigrations.Count)
- **Edge Functions**: $((Get-ChildItem -Path "supabase\functions" -Directory -ErrorAction SilentlyContinue).Count)

## Migration Files
$($AllMigrations | ForEach-Object { "- $($_.Name)" } | Out-String)

## Edge Functions
$((Get-ChildItem -Path "supabase\functions" -Directory -ErrorAction SilentlyContinue) | ForEach-Object { "- $($_.Name)" } | Out-String)

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
1. Install Supabase CLI: `winget install Supabase.CLI` or download from GitHub
2. Run `supabase gen types typescript` to generate actual TypeScript types
3. Use `supabase db pull` to get the latest schema
4. Export additional data from Supabase Studio as needed
"@

$ProjectInfo | Out-File -FilePath "$Root\README.md" -Encoding UTF8

########################################
# 7) Create API documentation placeholder
########################################
Write-Host ">> Creating API documentation..."

$ApiDocs = @"
# API Documentation

## Base URL
$SupabaseUrl

## Authentication
All API requests require the following headers:
- `apikey: $AnonKey`
- `Authorization: Bearer $AnonKey`

## Endpoints
- `/rest/v1/` - REST API
- `/graphql/v1/` - GraphQL API
- `/storage/v1/` - Storage API
- `/auth/v1/` - Auth API

## Rate Limits
- Free tier: 500MB database, 1GB bandwidth, 2GB storage
- Pro tier: Higher limits available

## Error Codes
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
"@

$ApiDocs | Out-File -FilePath "$Root\13_api_docs\api_documentation.md" -Encoding UTF8

########################################
# 8) Create plan notes
########################################
$PlanNotes = @"
# Plan and Limits

## Current Plan
- **Type**: Free Tier (assumed)
- **Database**: 500MB
- **Bandwidth**: 1GB/month
- **Storage**: 1GB
- **Logs**: ~1 day retention

## Upgrade Considerations
- **Pro Plan**: $25/month
  - 8GB database
  - 250GB bandwidth
  - 100GB storage
  - 7 days log retention
  - Branching/Preview databases

## Usage Monitoring
- Monitor database size in Supabase Dashboard
- Check bandwidth usage monthly
- Review storage usage for file uploads

## Optimization Tips
- Use database indexes for better performance
- Implement proper RLS policies
- Use Edge Functions for serverless compute
- Optimize file storage with proper compression
"@

$PlanNotes | Out-File -FilePath "$Root\99_plan_notes\plan_notes.md" -Encoding UTF8

########################################
# 9) Create auth documentation
########################################
$AuthDocs = @"
# Authentication Documentation

## Current Setup
- Email-based authentication
- Organization-based access control
- Supabase Auth integration

## User Management
- Users are created through Supabase Auth
- Organization ownership is managed through the organizations table
- RLS policies control data access

## Login Flow
1. User enters email/username
2. System authenticates with Supabase Auth
3. Organization data is fetched based on user ID
4. User context is stored in localStorage

## Security Notes
- All sensitive operations require authentication
- RLS policies enforce data isolation
- API keys are environment-specific
- No sensitive data in client-side code
"@

$AuthDocs | Out-File -FilePath "$Root\12_auth\auth_documentation.md" -Encoding UTF8

Write-Host ">> Export completed successfully!" -ForegroundColor Green
Write-Host ">> Folder created: $Root" -ForegroundColor Yellow
Write-Host ">> Contents:" -ForegroundColor Yellow
Get-ChildItem -Path $Root -Recurse | ForEach-Object {
    $RelativePath = $_.FullName.Replace((Get-Location).Path + "\$Root\", "")
    Write-Host "   $RelativePath" -ForegroundColor Gray
}

Write-Host ""
Write-Host ">> Next Steps:" -ForegroundColor Cyan
Write-Host "1. Install Supabase CLI for full functionality" -ForegroundColor White
Write-Host "2. Run 'supabase gen types typescript' to generate actual types" -ForegroundColor White
Write-Host "3. Use 'supabase db pull' to get the latest schema" -ForegroundColor White
Write-Host "4. Share this folder with Claude/Cursor for analysis" -ForegroundColor White

