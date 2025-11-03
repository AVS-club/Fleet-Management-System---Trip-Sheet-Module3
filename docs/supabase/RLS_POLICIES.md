# Row Level Security (RLS) Policies Documentation

> **📌 Purpose:** Complete reference for all RLS policies in the database. RLS automatically filters data based on user permissions and organization access.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Understanding RLS](#understanding-rls)
- [Organization-Based Access](#organization-based-access)
- [Policy Patterns](#policy-patterns)
- [Table Policies](#table-policies)
  - [vehicles](#vehicles-policies)
  - [drivers](#drivers-policies)
  - [trips](#trips-policies)
  - [destinations](#destinations-policies)
  - [maintenance_tasks](#maintenance_tasks-policies)
  - [documents](#documents-policies)
  - [tags and tagging](#tags-and-tagging-policies)
  - [organizations](#organizations-policies)
- [Troubleshooting RLS Issues](#troubleshooting-rls-issues)

---

## Overview

### What is RLS?
Row Level Security (RLS) is a PostgreSQL feature that automatically filters database rows based on the current user's permissions. When RLS is enabled:
- Users can only see data they're authorized to access
- No data leaks between organizations
- Policies are enforced at the database level (not in application code)
- Supabase automatically applies policies using `auth.uid()` and JWT claims

### Benefits
- ✅ **Security:** Multi-tenant data isolation
- ✅ **Automatic:** No need to add WHERE clauses in every query
- ✅ **Centralized:** All access control in one place
- ✅ **Audit-friendly:** Policies are version-controlled

### Key Concepts
- **Policy:** A rule that determines which rows a user can access
- **Operation:** SELECT (read), INSERT (create), UPDATE (modify), DELETE (remove)
- **auth.uid():** Returns current authenticated user's UUID
- **USING clause:** Determines which existing rows can be accessed
- **WITH CHECK clause:** Determines which new/updated rows can be created

---

## Understanding RLS

### How RLS Works in This Project

```
┌─────────────┐
│   User      │
│ (Frontend)  │
└──────┬──────┘
       │ Authenticated with JWT
       │ Contains: user_id, organization_id
       ▼
┌─────────────────────┐
│  Supabase Client    │
│  (Auto adds filters)│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  PostgreSQL with RLS                │
│                                     │
│  Policy Check:                      │
│  1. Extract auth.uid() from JWT     │
│  2. Lookup user's organization_id   │
│  3. Filter rows WHERE               │
│     organization_id = user's org    │
│  4. Return only authorized rows     │
└─────────────────────────────────────┘
```

### Example: How a Query Gets Filtered

**Frontend Query:**
```typescript
const { data } = await supabase
  .from('vehicles')
  .select('*');
```

**What Actually Executes:**
```sql
SELECT * FROM vehicles
WHERE organization_id = (
  SELECT organization_id
  FROM organization_users
  WHERE user_id = auth.uid()
)
AND <other RLS policy conditions>
```

**Result:** User only sees vehicles in their organization.

---

## Organization-Based Access

### Multi-Tenant Architecture

This system uses **organization-based multi-tenancy**:
- Every user belongs to one or more organizations
- Every data record belongs to one organization
- Users can only access data in their organization(s)

### User-Organization Relationship

```
┌──────────────┐         ┌─────────────────────┐         ┌──────────────────┐
│   auth.users │◄────────│ organization_users  │────────►│  organizations   │
│              │         │                     │         │                  │
│ - id         │         │ - user_id           │         │ - id             │
│ - email      │         │ - organization_id   │         │ - name           │
│              │         │ - role              │         │                  │
└──────────────┘         └─────────────────────┘         └──────────────────┘
        │                                                          │
        │                                                          │
        └──────────────────────────────────────────────────────────┘
                                  │
                     All data tables have organization_id
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │                                                     │
   ┌────▼────┐    ┌────────┐    ┌─────────┐    ┌──────────────────┐
   │ vehicles│    │ drivers│    │  trips  │    │ maintenance_tasks│
   └─────────┘    └────────┘    └─────────┘    └──────────────────┘
```

### Helper Function: get_user_organization_id()

Most policies use this helper function:
```sql
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Policy Patterns

### Pattern 1: Simple Organization Filter
**Use Case:** Most tables (vehicles, drivers, trips)

```sql
-- SELECT policy
CREATE POLICY "Users can view their organization's records"
ON table_name FOR SELECT
USING (organization_id = get_user_organization_id());

-- INSERT policy
CREATE POLICY "Users can insert into their organization"
ON table_name FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

-- UPDATE policy
CREATE POLICY "Users can update their organization's records"
ON table_name FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- DELETE policy
CREATE POLICY "Users can delete their organization's records"
ON table_name FOR DELETE
USING (organization_id = get_user_organization_id());
```

### Pattern 2: Role-Based Access
**Use Case:** Organizations, admin functions

```sql
CREATE POLICY "Only admins can update organization"
ON organizations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = auth.uid()
    AND organization_id = organizations.id
    AND role IN ('owner', 'admin')
  )
);
```

### Pattern 3: Owner-Only Access
**Use Case:** User profiles, personal settings

```sql
CREATE POLICY "Users can only access their own profile"
ON profiles FOR ALL
USING (id = auth.uid());
```

### Pattern 4: Public Read, Restricted Write
**Use Case:** Reference data, shared resources

```sql
-- Anyone in org can read
CREATE POLICY "Users can view tags"
ON tags FOR SELECT
USING (organization_id = get_user_organization_id());

-- Only admins can create/modify
CREATE POLICY "Admins can manage tags"
ON tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

---

## Table Policies

### vehicles Policies

**Table:** `vehicles`
**RLS Enabled:** Yes

#### Policy 1: View Vehicles
```sql
CREATE POLICY "view_org_vehicles"
ON vehicles FOR SELECT
USING (organization_id = get_user_organization_id());
```
- **Operation:** SELECT
- **Effect:** Users can view all vehicles in their organization
- **When It Applies:** Every query to vehicles table

#### Policy 2: Insert Vehicles
```sql
CREATE POLICY "insert_org_vehicles"
ON vehicles FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());
```
- **Operation:** INSERT
- **Effect:** Users can only create vehicles in their organization
- **Automatic:** `organization_id` defaults to user's org

#### Policy 3: Update Vehicles
```sql
CREATE POLICY "update_org_vehicles"
ON vehicles FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());
```
- **Operation:** UPDATE
- **Effect:** Users can update vehicles in their organization
- **Prevents:** Changing organization_id to another org

#### Policy 4: Delete Vehicles
```sql
CREATE POLICY "delete_org_vehicles"
ON vehicles FOR DELETE
USING (organization_id = get_user_organization_id());
```
- **Operation:** DELETE
- **Effect:** Users can delete vehicles in their organization

**Frontend Impact:**
```typescript
// This query automatically filters by organization
const { data: vehicles } = await supabase
  .from('vehicles')
  .select('*');
// Returns only vehicles where organization_id matches user's org
```

---

### drivers Policies

**Table:** `drivers`
**RLS Enabled:** Yes

**Policies:** (Same structure as vehicles)

```sql
-- SELECT
CREATE POLICY "view_org_drivers"
ON drivers FOR SELECT
USING (organization_id = get_user_organization_id());

-- INSERT
CREATE POLICY "insert_org_drivers"
ON drivers FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

-- UPDATE
CREATE POLICY "update_org_drivers"
ON drivers FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- DELETE
CREATE POLICY "delete_org_drivers"
ON drivers FOR DELETE
USING (organization_id = get_user_organization_id());
```

---

### trips Policies

**Table:** `trips`
**RLS Enabled:** Yes

**Policies:** (Same structure as vehicles)

```sql
-- SELECT
CREATE POLICY "view_org_trips"
ON trips FOR SELECT
USING (organization_id = get_user_organization_id());

-- INSERT
CREATE POLICY "insert_org_trips"
ON trips FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

-- UPDATE
CREATE POLICY "update_org_trips"
ON trips FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

-- DELETE
CREATE POLICY "delete_org_trips"
ON trips FOR DELETE
USING (organization_id = get_user_organization_id());
```

**Special Considerations:**
- Trips reference vehicles and drivers
- Foreign key constraints ensure trips can only reference vehicles/drivers in same org
- RPC functions like `cascade_odometer_correction_atomic` respect RLS

---

### destinations Policies

**Table:** `destinations`
**RLS Enabled:** Yes

**Policies:** (Same organization-based structure)

```sql
CREATE POLICY "view_org_destinations" ON destinations FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "insert_org_destinations" ON destinations FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "update_org_destinations" ON destinations FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "delete_org_destinations" ON destinations FOR DELETE
USING (organization_id = get_user_organization_id());
```

---

### maintenance_tasks Policies

**Table:** `maintenance_tasks`
**RLS Enabled:** Yes

**Policies:** (Same organization-based structure)

```sql
CREATE POLICY "view_org_maintenance" ON maintenance_tasks FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "insert_org_maintenance" ON maintenance_tasks FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "update_org_maintenance" ON maintenance_tasks FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "delete_org_maintenance" ON maintenance_tasks FOR DELETE
USING (organization_id = get_user_organization_id());
```

**Related Tables:**
- `maintenance_service_tasks` - Same policies, inherits from parent task
- `maintenance_audit_logs` - Same policies
- `parts_replacements` - Same policies

---

### documents Policies

**Table:** `vehicle_documents`, `driver_documents`
**RLS Enabled:** Yes

**Policies:**

```sql
-- vehicle_documents
CREATE POLICY "view_org_vehicle_docs" ON vehicle_documents FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "insert_org_vehicle_docs" ON vehicle_documents FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "update_org_vehicle_docs" ON vehicle_documents FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "delete_org_vehicle_docs" ON vehicle_documents FOR DELETE
USING (organization_id = get_user_organization_id());

-- driver_documents (same structure)
CREATE POLICY "view_org_driver_docs" ON driver_documents FOR SELECT
USING (organization_id = get_user_organization_id());
-- ... (same pattern)
```

**Storage Bucket Policies:**

Supabase Storage also has RLS:
```sql
-- vehicle-documents bucket
CREATE POLICY "Users can view their org's vehicle documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-documents' AND
       auth.uid() IN (
         SELECT user_id FROM organization_users
         WHERE organization_id = (
           SELECT organization_id FROM vehicle_documents
           WHERE file_url LIKE '%' || name
         )
       ));

CREATE POLICY "Users can upload vehicle documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-documents' AND auth.uid() IS NOT NULL);
```

---

### tags and tagging Policies

**Table:** `tags`, `vehicle_tags`, `vehicle_tag_history`
**RLS Enabled:** Yes

#### tags Table

```sql
-- Everyone in org can view tags
CREATE POLICY "view_org_tags" ON tags FOR SELECT
USING (organization_id = get_user_organization_id());

-- Admins can create tags
CREATE POLICY "admin_insert_tags" ON tags FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id() AND
  EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = auth.uid()
    AND organization_id = get_user_organization_id()
    AND role IN ('owner', 'admin')
  )
);

-- Admins can update tags
CREATE POLICY "admin_update_tags" ON tags FOR UPDATE
USING (
  organization_id = get_user_organization_id() AND
  EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Admins can delete tags
CREATE POLICY "admin_delete_tags" ON tags FOR DELETE
USING (
  organization_id = get_user_organization_id() AND
  EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

#### vehicle_tags Table

```sql
-- View vehicle tags (via vehicle's organization)
CREATE POLICY "view_vehicle_tags" ON vehicle_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.id = vehicle_tags.vehicle_id
    AND vehicles.organization_id = get_user_organization_id()
  )
);

-- Insert vehicle tags
CREATE POLICY "insert_vehicle_tags" ON vehicle_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.id = vehicle_tags.vehicle_id
    AND vehicles.organization_id = get_user_organization_id()
  )
);
```

---

### organizations Policies

**Table:** `organizations`, `organization_users`
**RLS Enabled:** Yes

#### organizations Table

```sql
-- Users can view their organizations
CREATE POLICY "view_own_organizations" ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
  )
);

-- Only owners can update organization
CREATE POLICY "owner_update_org" ON organizations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = auth.uid()
    AND organization_id = organizations.id
    AND role = 'owner'
  )
);
```

#### organization_users Table

```sql
-- Users can view members of their organization
CREATE POLICY "view_org_members" ON organization_users FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
  )
);

-- Admins can add users to organization
CREATE POLICY "admin_add_users" ON organization_users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.user_id = auth.uid()
    AND ou.organization_id = organization_users.organization_id
    AND ou.role IN ('owner', 'admin')
  )
);

-- Admins can update user roles
CREATE POLICY "admin_update_roles" ON organization_users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.user_id = auth.uid()
    AND ou.organization_id = organization_users.organization_id
    AND ou.role IN ('owner', 'admin')
  )
);

-- Admins can remove users (except themselves)
CREATE POLICY "admin_remove_users" ON organization_users FOR DELETE
USING (
  user_id != auth.uid() AND
  EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.user_id = auth.uid()
    AND ou.organization_id = organization_users.organization_id
    AND ou.role IN ('owner', 'admin')
  )
);
```

---

## Troubleshooting RLS Issues

### Issue 1: "No rows returned" but data exists

**Symptom:** Query returns empty array, but you know data exists

**Causes:**
1. User not assigned to any organization
2. Data belongs to different organization
3. RLS policy too restrictive

**Solution:**
```typescript
// Check user's organization
const { data: userOrgs } = await supabase
  .from('organization_users')
  .select('organization_id')
  .eq('user_id', (await supabase.auth.getUser()).data.user.id);

console.log('User organizations:', userOrgs);

// Check if data has organization_id
const { data: allVehicles } = await supabase
  .from('vehicles')
  .select('organization_id');

console.log('Vehicle organizations:', allVehicles);
```

### Issue 2: "Permission denied for table"

**Symptom:** Error: `permission denied for table vehicles`

**Causes:**
1. RLS enabled but no policies exist
2. User not authenticated
3. Policy conditions not met

**Solution:**
```typescript
// Check authentication
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  console.error('User not authenticated');
}

// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

### Issue 3: Cannot insert/update records

**Symptom:** Insert/update fails with no error or RLS error

**Causes:**
1. `WITH CHECK` policy not satisfied
2. Trying to set `organization_id` to wrong org
3. Missing required fields

**Solution:**
```typescript
// Don't manually set organization_id - let database handle it
const { data, error } = await supabase
  .from('vehicles')
  .insert({
    registration_number: 'MH-01-AB-1234',
    make: 'Tata',
    // organization_id is set automatically via default
  });

if (error) {
  console.error('Insert error:', error.message, error.details);
}
```

### Issue 4: RLS too slow

**Symptom:** Queries taking too long

**Causes:**
1. Complex policy conditions
2. Missing indexes on `organization_id`
3. Subqueries in policies

**Solution:**
```sql
-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_vehicles_org
ON vehicles(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_user
ON organization_users(user_id);

-- Use SECURITY DEFINER functions for complex logic
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Issue 5: Testing RLS Policies

**How to test policies:**

```sql
-- Set role to authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

-- Test query
SELECT * FROM vehicles;

-- Reset
RESET ROLE;
```

**Or use Supabase dashboard:**
1. Go to Table Editor
2. Click "View policies" button
3. Test with different user IDs

---

## 🔄 Update Instructions

**When adding new tables with RLS:**

1. Enable RLS on the table:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

2. Add standard organization policies:
```sql
CREATE POLICY "view_org_table" ON table_name FOR SELECT
USING (organization_id = get_user_organization_id());
-- ... (add INSERT, UPDATE, DELETE)
```

3. Document the policies in this file under [Table Policies](#table-policies)

4. Test the policies with different user roles

**When modifying existing policies:**

1. Drop old policy:
```sql
DROP POLICY IF EXISTS "old_policy_name" ON table_name;
```

2. Create new policy:
```sql
CREATE POLICY "new_policy_name" ON table_name FOR operation
USING (conditions);
```

3. Update this documentation

---

**Last Updated:** 2025-11-02
**Documentation Version:** 1.0

---

## 🚨 Notes for AI Agents

- ✅ RLS is ALWAYS active - you cannot bypass it from frontend
- ✅ Users automatically see only their organization's data
- ✅ Never manually filter by `organization_id` in queries (redundant)
- ✅ Never try to set `organization_id` manually - use database defaults
- ✅ If query returns empty, check user's organization assignment first
- ⚠️ RLS applies to RPC functions too
- ⚠️ Service role key bypasses RLS (never use in frontend!)
- ⚠️ Always handle RLS errors gracefully in UI
