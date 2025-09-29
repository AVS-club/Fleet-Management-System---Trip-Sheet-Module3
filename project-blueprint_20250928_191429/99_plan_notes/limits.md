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
- Provider toggles (document manually from Studio â†’ Authentication â†’ Providers).
