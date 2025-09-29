#!/usr/bin/env bash
# AVS Supabase "Project Blueprint" Exporter — one-shot script for Cursor terminal
# Creates a timestamped folder with schema, RLS, grants, triggers, functions, Edge Functions, storage manifests, etc.

set -euo pipefail

########################################
# === EDIT THESE 3 VALUES ===
PROJECT_REF="oosrmuqfcqtojflruhww"     # Your actual project reference
SCHEMAS="public,auth,storage,graphql_public"  # include what you actually use
OPENAPI_SUPABASE_URL="https://oosrmuqfcqtojflruhww.supabase.co"              # Your Supabase URL
OPENAPI_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vc3JtdXFmY3F0b2pmbHJ1aHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxODkyNjUsImV4cCI6MjA2Mzc2NTI2NX0.-TH-8tVoA4WOkco_I2WDQlchjZga4FvwiLZevw0jjCE"                  # Your anon key
########################################

# tool checks
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1. Install it and re-run."; exit 1; }; }
need supabase
need jq
if command -v psql >/dev/null 2>&1; then HAS_PSQL=1; else HAS_PSQL=0; fi
if command -v curl >/dev/null 2>&1; then HAS_CURL=1; else HAS_CURL=0; fi

STAMP=$(date +%Y%m%d_%H%M%S)
ROOT="project-blueprint_${STAMP}"

echo ">> Logging into Supabase (browser may open)..."
supabase login || true

echo ">> Linking project $PROJECT_REF ..."
supabase link --project-ref "$PROJECT_REF"

echo ">> Creating folders..."
mkdir -p "$ROOT"/{01_schema,02_types,03_rls,04_grants,05_functions_rpc,06_triggers_views,07_indexes,08_extensions,09_publications_realtime,10_edge_functions,11_storage,12_auth,13_api_docs,99_plan_notes}

########################################
# 1) Full schema (incl. RLS) + TS types
########################################
echo ">> Pulling remote DB schema for: $SCHEMAS"
supabase db pull --linked -s "$SCHEMAS"
SCHEMA_FILE=$(ls -t supabase/migrations/*_remote_schema.sql | head -n1)
cp "$SCHEMA_FILE" "$ROOT/01_schema/remote_schema.sql"

echo ">> Generating TypeScript types..."
supabase gen types typescript --linked -s "$SCHEMAS" > "$ROOT/02_types/database.ts"

echo ">> Extracting RLS policy lines..."
grep -E 'CREATE POLICY|ALTER POLICY|ENABLE ROW LEVEL SECURITY|FOR (SELECT|INSERT|UPDATE|DELETE)|USING \(|WITH CHECK \(' "$ROOT/01_schema/remote_schema.sql" \
  > "$ROOT/03_rls/rls_index.md" || true

########################################
# 2) Connect psql via CLI's cached creds
########################################
# Ask CLI to cache remote creds locally (silent if already cached)
supabase db remote commit >/dev/null 2>&1 || true
DBCONF=".supabase/config"
DBURL=""
if [ -f "$DBCONF" ]; then DBURL=$(jq -r '.db_url // empty' "$DBCONF"); fi

if [ -n "$DBURL" ] && [ $HAS_PSQL -eq 1 ]; then
  echo ">> psql available — exporting deep metadata from catalogs..."

  # 2a) Roles and schema/table grants
  psql "$DBURL" -Atc "select rolname,rolsuper,rolcreatedb,rolcreaterole,rolinherit,rolreplication,rolbypassrls from pg_roles order by rolname;" \
    > "$ROOT/04_grants/roles.tsv"
  psql "$DBURL" -F $'\t' -Atc "
    select table_schema,table_name,grantee,privilege_type,is_grantable
    from information_schema.role_table_grants
    order by table_schema,table_name,grantee,privilege_type;
  " > "$ROOT/04_grants/table_grants.tsv"
  psql "$DBURL" -F $'\t' -Atc "
    select routine_schema,routine_name,grantee,privilege_type,is_grantable
    from information_schema.role_routine_grants
    order by routine_schema,routine_name,grantee,privilege_type;
  " > "$ROOT/04_grants/routine_grants.tsv"
  psql "$DBURL" -F $'\t' -Atc "
    select schema_name, privilege_type, grantee
    from information_schema.schema_privileges
    order by schema_name, privilege_type, grantee;
  " > "$ROOT/04_grants/schema_grants.tsv"

  # 2b) RPC / functions (source), SECDEF flags
  psql "$DBURL" -F $'\t' -Atc "
    select n.nspname as schema,
           p.proname as function,
           pg_get_functiondef(p.oid) as definition,
           p.prosecdef as security_definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in (select unnest(string_to_array('$SCHEMAS',',')))
    order by n.nspname, p.proname;
  " > "$ROOT/05_functions_rpc/functions_with_source.tsv"

  # 2c) Triggers + trigger definitions
  psql "$DBURL" -F $'\t' -Atc "
    select n.nspname as schema, c.relname as table, t.tgname as trigger,
           pg_get_triggerdef(t.oid, true) as trigger_def
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname in (select unnest(string_to_array('$SCHEMAS',',')))
    order by n.nspname, c.relname, t.tgname;
  " > "$ROOT/06_triggers_views/triggers.tsv"

  # 2d) Views + definitions
  psql "$DBURL" -F $'\t' -Atc "
    select table_schema, table_name, pg_get_viewdef(quote_ident(table_schema)||'.'||quote_ident(table_name), true)
    from information_schema.views
    where table_schema in (select unnest(string_to_array('$SCHEMAS',',')))
    order by table_schema, table_name;
  " > "$ROOT/06_triggers_views/views.tsv"

  # 2e) Indexes
  psql "$DBURL" -F $'\t' -Atc "
    select schemaname, tablename, indexname, indexdef
    from pg_indexes
    where schemaname in (select unnest(string_to_array('$SCHEMAS',',')))
    order by schemaname, tablename, indexname;
  " > "$ROOT/07_indexes/indexes.tsv"

  # 2f) Extensions installed
  psql "$DBURL" -F $'\t' -Atc "
    select e.extname as extension, e.extversion as version, n.nspname as schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    order by e.extname;
  " > "$ROOT/08_extensions/extensions.tsv"

  # 2g) Publications (Realtime uses supabase_realtime publication)
  psql "$DBURL" -F $'\t' -Atc "
    select p.pubname, p.puballtables, p.pubinsert, p.pubupdate, p.pubdelete, p.pubtruncate,
           string_agg(quote_ident(n.nspname)||'.'||quote_ident(c.relname), ', ' order by n.nspname, c.relname) as tables
    from pg_publication p
    left join pg_publication_rel pr on pr.prpubid = p.oid
    left join pg_class c on c.oid = pr.prrelid
    left join pg_namespace n on n.oid = c.relnamespace
    group by p.pubname, p.puballtables, p.pubinsert, p.pubupdate, p.pubdelete, p.pubtruncate
    order by p.pubname;
  " > "$ROOT/09_publications_realtime/publications.tsv"

  # 2h) pg_cron jobs (if extension installed)
  psql "$DBURL" -F $'\t' -Atc "
    select jobid, schedule, command, nodename, nodeport, active
    from cron.job
    order by jobid;
  " > "$ROOT/09_publications_realtime/pg_cron_jobs.tsv" 2>/dev/null || echo "pg_cron not installed or no jobs." > "$ROOT/09_publications_realtime/pg_cron_jobs.txt"

  # 2i) RLS policies from pg_catalog (CSV)
  psql "$DBURL" -F ',' -Atc "
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname in (select unnest(string_to_array('$SCHEMAS',',')))
    order by schemaname, tablename, policyname;
  " > "$ROOT/03_rls/pg_policies.csv"
else
  echo "!! Skipping deep catalog exports (psql not available OR db_url not found). You still have remote_schema.sql."
fi

########################################
# 3) Edge Functions + Secrets
########################################
echo ">> Listing Edge Functions..."
supabase functions list --project-ref "$PROJECT_REF" > "$ROOT/10_edge_functions/functions_list.txt" || true

echo ">> Downloading Edge Function sources (if any)..."
awk 'NR>1{print $1}' "$ROOT/10_edge_functions/functions_list.txt" 2>/dev/null | while read -r fn; do
  [ -z "${fn:-}" ] && continue
  mkdir -p "$ROOT/10_edge_functions/$fn"
  supabase functions download "$fn" --project-ref "$PROJECT_REF" --dir "$ROOT/10_edge_functions/$fn" || true
done

echo ">> Exporting function secrets (redact before sharing!)"
supabase secrets list --project-ref "$PROJECT_REF" > "$ROOT/10_edge_functions/_secrets.txt" || true

########################################
# 4) Storage manifest (buckets + sample objects)
########################################
if [ -n "$DBURL" ] && [ $HAS_PSQL -eq 1 ]; then
  echo ">> Storage buckets CSV..."
  psql "$DBURL" -F ',' -Atc "
    select id,name,public,file_size_limit,allowed_mime_types,owner,created_at
    from storage.buckets
    order by name;
  " > "$ROOT/11_storage/buckets.csv"

  echo ">> Storage objects sample CSV (first 1000)..."
  psql "$DBURL" -F ',' -Atc "
    select bucket_id,name,owner,created_at,last_accessed_at,metadata
    from storage.objects
    order by bucket_id,name
    limit 1000;
  " > "$ROOT/11_storage/objects_sample.csv"
else
  echo "psql not available; add bucket/object exports manually from Studio." > "$ROOT/11_storage/README.txt"
fi

########################################
# 5) Auth users/identities (non-sensitive exports)
########################################
echo ">> Auth export notes..."
cat > "$ROOT/12_auth/README.md" <<'MD'
- Export **Users CSV** from Studio → Auth → Users (includes id, email, created_at, factors).
- The list of **enabled OAuth providers** is not exposed via SQL; add it manually below.
MD

# identities sample (no secrets)
if [ -n "$DBURL" ] && [ $HAS_PSQL -eq 1 ]; then
  psql "$DBURL" -F ',' -Atc "
    select user_id, provider, last_sign_in_at
    from auth.identities
    order by last_sign_in_at desc nulls last
    limit 1000;
  " > "$ROOT/12_auth/identities_sample.csv" || true
fi
echo "- Providers enabled: (Google? GitHub? Apple?)" > "$ROOT/12_auth/providers.md"

########################################
# 6) Optional OpenAPI export (REST)
########################################
if [ -n "$OPENAPI_SUPABASE_URL" ] && [ -n "$OPENAPI_ANON_KEY" ] && [ $HAS_CURL -eq 1 ]; then
  echo ">> Fetching OpenAPI (REST) spec..."
  curl -sS "${OPENAPI_SUPABASE_URL%/}/rest/v1/" \
    -H "apikey: $OPENAPI_ANON_KEY" \
    -H "Authorization: Bearer $OPENAPI_ANON_KEY" \
    -H "Accept: application/openapi+json" \
    > "$ROOT/13_api_docs/openapi.json" || echo "OpenAPI fetch failed." > "$ROOT/13_api_docs/OPENAPI_NOTE.txt"
else
  echo "Set OPENAPI_SUPABASE_URL and OPENAPI_ANON_KEY to auto-fetch OpenAPI. Skipping." > "$ROOT/13_api_docs/README.txt"
fi

########################################
# 7) Plan/limits notes (Free vs Pro)
########################################
cat > "$ROOT/99_plan_notes/limits.md" <<'MD'
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
MD

echo ">> DONE. Folder created: $ROOT"
echo "   Share this folder with Claude/Cursor. Redact 10_edge_functions/_secrets.txt before sharing."
