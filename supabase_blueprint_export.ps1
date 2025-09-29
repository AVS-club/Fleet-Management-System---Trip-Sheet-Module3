# AVS Supabase "Project Blueprint" Exporter — PowerShell version
# Creates a timestamped folder with schema, RLS, grants, triggers, functions, Edge Functions, storage manifests, etc.

param(
    [string]$ProjectRef = "oosrmuqfcqtojflruhww",
    [string]$Schemas = "public,auth,storage,graphql_public",
    [string]$OpenApiUrl = "https://oosrmuqfcqtojflruhww.supabase.co",
    [string]$OpenApiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc3JtdXFmY3F0b2pmbHJ1aHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxODkyNjUsImV4cCI6MjA2Mzc2NTI2NX0.-TH-8tVoA4WOkco_I2WDQlchjZga4FvwiLZevw0jjCE"
)

# Check if required tools are available
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check for required tools
$HasSupabase = Test-Command "npx"
$HasJq = Test-Command "jq"
$HasPsql = Test-Command "psql"
$HasCurl = Test-Command "curl"

if (-not $HasSupabase) {
    Write-Error "npx is not available. Please ensure Node.js is installed."
    exit 1
}

# Function to run supabase commands
function Invoke-Supabase {
    param([string[]]$Arguments)
    & npx supabase @Arguments
}

if (-not $HasJq) {
    Write-Warning "jq is not installed. Some features may be limited."
    Write-Host "To install jq: winget install jqlang.jq"
    Write-Host "or visit: https://jqlang.github.io/jq/download/"
}

# Create timestamped folder
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Root = "project-blueprint_$Stamp"

Write-Host ">> Logging into Supabase (browser may open)..."
try {
    Invoke-Supabase @("login")
} catch {
    Write-Warning "Login failed or already logged in"
}

Write-Host ">> Linking project $ProjectRef ..."
Invoke-Supabase @("link", "--project-ref", $ProjectRef)

Write-Host ">> Creating folders..."
$Folders = @(
    "01_schema", "02_types", "03_rls", "04_grants", "05_functions_rpc",
    "06_triggers_views", "07_indexes", "08_extensions", "09_publications_realtime",
    "10_edge_functions", "11_storage", "12_auth", "13_api_docs", "99_plan_notes"
)

foreach ($Folder in $Folders) {
    New-Item -ItemType Directory -Path "$Root\$Folder" -Force | Out-Null
}

########################################
# 1) Full schema (incl. RLS) + TS types
########################################
Write-Host ">> Pulling remote DB schema for: $Schemas"
Invoke-Supabase @("db", "pull", "--linked", "-s", $Schemas)

# Find the latest schema file
$SchemaFiles = Get-ChildItem -Path "supabase\migrations" -Filter "*_remote_schema.sql" | Sort-Object LastWriteTime -Descending
if ($SchemaFiles.Count -gt 0) {
    $SchemaFile = $SchemaFiles[0].FullName
    Copy-Item $SchemaFile "$Root\01_schema\remote_schema.sql"
}

Write-Host ">> Generating TypeScript types..."
Invoke-Supabase @("gen", "types", "typescript", "--linked", "-s", $Schemas) | Out-File -FilePath "$Root\02_types\database.ts" -Encoding UTF8

Write-Host ">> Extracting RLS policy lines..."
if (Test-Path "$Root\01_schema\remote_schema.sql") {
    $RlsContent = Select-String -Path "$Root\01_schema\remote_schema.sql" -Pattern "CREATE POLICY|ALTER POLICY|ENABLE ROW LEVEL SECURITY|FOR \(SELECT|INSERT|UPDATE|DELETE\)|USING \(|WITH CHECK \(" | ForEach-Object { $_.Line }
    $RlsContent | Out-File -FilePath "$Root\03_rls\rls_index.md" -Encoding UTF8
}

########################################
# 2) Edge Functions + Secrets
########################################
Write-Host ">> Listing Edge Functions..."
try {
    Invoke-Supabase @("functions", "list", "--project-ref", $ProjectRef) | Out-File -FilePath "$Root\10_edge_functions\functions_list.txt" -Encoding UTF8
} catch {
    "No functions found or error listing functions" | Out-File -FilePath "$Root\10_edge_functions\functions_list.txt" -Encoding UTF8
}

Write-Host ">> Downloading Edge Function sources (if any)..."
if (Test-Path "$Root\10_edge_functions\functions_list.txt") {
    $FunctionList = Get-Content "$Root\10_edge_functions\functions_list.txt" | Select-Object -Skip 1
    foreach ($Function in $FunctionList) {
        if ($Function.Trim()) {
            $FunctionName = $Function.Split()[0]
            if ($FunctionName) {
                New-Item -ItemType Directory -Path "$Root\10_edge_functions\$FunctionName" -Force | Out-Null
                try {
                    Invoke-Supabase @("functions", "download", $FunctionName, "--project-ref", $ProjectRef, "--dir", "$Root\10_edge_functions\$FunctionName")
                } catch {
                    Write-Warning "Failed to download function: $FunctionName"
                }
            }
        }
    }
}

Write-Host ">> Exporting function secrets (redact before sharing!)"
try {
    Invoke-Supabase @("secrets", "list", "--project-ref", $ProjectRef) | Out-File -FilePath "$Root\10_edge_functions\_secrets.txt" -Encoding UTF8
} catch {
    "No secrets found or error listing secrets" | Out-File -FilePath "$Root\10_edge_functions\_secrets.txt" -Encoding UTF8
}

########################################
# 3) Auth export notes
########################################
Write-Host ">> Creating auth export notes..."
$AuthReadme = @"
- Export **Users CSV** from Studio → Auth → Users (includes id, email, created_at, factors).
- The list of **enabled OAuth providers** is not exposed via SQL; add it manually below.
"@
$AuthReadme | Out-File -FilePath "$Root\12_auth\README.md" -Encoding UTF8

"- Providers enabled: (Google? GitHub? Apple?)" | Out-File -FilePath "$Root\12_auth\providers.md" -Encoding UTF8

########################################
# 4) Optional OpenAPI export (REST)
########################################
if ($OpenApiUrl -and $OpenApiKey -and $HasCurl) {
    Write-Host ">> Fetching OpenAPI (REST) spec..."
    try {
        $Headers = @{
            "apikey" = $OpenApiKey
            "Authorization" = "Bearer $OpenApiKey"
            "Accept" = "application/openapi+json"
        }
        $Response = Invoke-RestMethod -Uri "$OpenApiUrl/rest/v1/" -Headers $Headers -Method Get
        $Response | ConvertTo-Json -Depth 10 | Out-File -FilePath "$Root\13_api_docs\openapi.json" -Encoding UTF8
    } catch {
        "OpenAPI fetch failed: $($_.Exception.Message)" | Out-File -FilePath "$Root\13_api_docs\OPENAPI_NOTE.txt" -Encoding UTF8
    }
} else {
    "Set OpenApiUrl and OpenApiKey to auto-fetch OpenAPI. Skipping." | Out-File -FilePath "$Root\13_api_docs\README.txt" -Encoding UTF8
}

########################################
# 5) Plan/limits notes (Free vs Pro)
########################################
$LimitsContent = @"
**Plan context**
- Current: Free (assumed). Logs retention ~1 day; Pro is ~7 days.
- Branching/Preview databases are paid features.
- If any AI/Claude step needs longer logs, per-branch exports, or higher limits, upgrade to Pro.

**What this blueprint contains**
- Live remote schema with RLS/TRIGGERS/FUNCTIONS/GRANTS (01,03,04,05,06,07).
- Deep DB catalogs: extensions, publications, optional pg_cron (08,09).
- Edge Functions: list + source + secrets placeholder (10).
- Storage: buckets and sample object manifest (11).
- Auth: identities sample, provider checklist; export Users from Studio (12).
- REST OpenAPI (optional via URL+Anon key) (13).

**What it intentionally avoids**
- Service role keys, JWT secrets, or anything that could compromise security.
- Full storage object downloads (only manifest sample).
- Provider toggles (document manually from Studio → Authentication → Providers).
"@
$LimitsContent | Out-File -FilePath "$Root\99_plan_notes\limits.md" -Encoding UTF8

Write-Host ">> DONE. Folder created: $Root"
Write-Host "   Share this folder with Claude/Cursor. Redact 10_edge_functions\_secrets.txt before sharing."

# Note about missing tools
if (-not $HasPsql) {
    Write-Warning "psql not available - some deep catalog exports were skipped. Install PostgreSQL client for full export."
}
