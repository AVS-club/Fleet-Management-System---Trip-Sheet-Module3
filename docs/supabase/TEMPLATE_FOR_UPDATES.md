# Template for Updating Supabase Documentation

> **📌 Purpose:** This file provides templates and instructions for updating the Supabase documentation when backend changes occur.

---

## 📚 Table of Contents

- [When to Update](#when-to-update)
- [How to Get Information from Supabase](#how-to-get-information-from-supabase)
- [Update Templates](#update-templates)
  - [Adding a New Table](#adding-a-new-table)
  - [Adding New Columns to Existing Table](#adding-new-columns-to-existing-table)
  - [Adding New RPC Function](#adding-new-rpc-function)
  - [Adding New RLS Policy](#adding-new-rls-policy)
  - [Adding New ENUM Type](#adding-new-enum-type)
  - [Adding New Materialized View](#adding-new-materialized-view)
  - [Adding New Trigger](#adding-new-trigger)
- [Format Specifications](#format-specifications)
- [Step-by-Step Guide](#step-by-step-guide)

---

## When to Update

### ✅ You MUST update documentation when:

1. **Database Schema Changes:**
   - Adding/removing tables
   - Adding/removing columns
   - Changing column types or constraints
   - Adding/removing indexes
   - Changing foreign keys

2. **Function Changes:**
   - Creating new RPC functions
   - Modifying RPC function signatures
   - Changing RPC return types

3. **Security Changes:**
   - Adding/modifying RLS policies
   - Changing access permissions
   - Adding new roles

4. **Automation Changes:**
   - Adding new triggers
   - Modifying trigger behavior
   - Adding new materialized views
   - Creating new ENUM types

5. **Edge Function Changes:**
   - Adding new edge functions
   - Changing edge function endpoints
   - Modifying request/response formats

---

## How to Get Information from Supabase

### Using Supabase AI Assistant

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project: `oosrmuqfcqtojflruhww`

2. **Use SQL Editor with AI:**
   - Click on "SQL Editor" in sidebar
   - Click "AI Assistant" button
   - Ask questions like:

**Example Questions to Ask Supabase AI:**

```
Get complete schema for table "vehicles" including all columns, types, constraints, and indexes
```

```
List all RPC functions in the database with their parameters and return types
```

```
Show all RLS policies for table "trips"
```

```
List all triggers on table "maintenance_tasks"
```

```
Show definition of materialized view "trip_pnl_report_view"
```

```
List all ENUM types and their values
```

```
Show all foreign key relationships for table "drivers"
```

3. **Copy the Results:**
   - Supabase AI will return SQL definitions or structured information
   - Copy the complete output
   - Paste into a text file for reference

### Using SQL Queries

You can also query the PostgreSQL information schema directly:

#### Get Table Schema:
```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;
```

#### Get Foreign Keys:
```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'vehicles';
```

#### Get RPC Functions:
```sql
SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

#### Get RLS Policies:
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vehicles';
```

---

## Update Templates

### Adding a New Table

**File to Update:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

**Information Needed from Supabase AI:**
```
Get complete schema for table "new_table_name" including:
- All columns with types, constraints, and defaults
- Primary key
- Foreign keys and their relationships
- Indexes
- Related tables
```

**Template:**

```markdown
### new_table_name

**Purpose:** [Brief description of what this table stores]

**Migration:** [migration_file_name.sql]

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `name` | text | NOT NULL | - | [Column description] |
| `status` | text | - | 'active' | [Column description] |
| `organization_id` | uuid | FK → organizations | - | Organization owning this record |
| `added_by` | uuid | FK → auth.users | `auth.uid()` | User who added record |
| `created_at` | timestamptz | NOT NULL | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `[other indexed columns]`

**Foreign Keys:**
- `organization_id` → `organizations(id)` ON DELETE CASCADE
- `added_by` → `auth.users(id)` ON DELETE SET NULL

**Related Tables:**
- `[related_table_1]` - [relationship description]
- `[related_table_2]` - [relationship description]

**RLS Policies:**
- Users can only see records in their organization
- Standard organization-based access control

**Frontend Usage Example:**
\`\`\`typescript
// Fetch records
const { data, error } = await supabase
  .from('new_table_name')
  .select('*')
  .order('created_at', { ascending: false });

// Insert new record
const { data, error } = await supabase
  .from('new_table_name')
  .insert({
    name: 'Example Name',
    status: 'active'
  });
\`\`\`
```

**Where to Add:**
1. Add to appropriate section in DATABASE_SCHEMA.md
2. Update Table of Contents
3. Update Overview statistics (total tables count)
4. Add update note at bottom:
   ```
   **Update History:**
   - YYYY-MM-DD: Added new_table_name table
   ```

---

### Adding New Columns to Existing Table

**File to Update:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

**Information Needed:**
```
Show columns added to table "table_name" after [date], including types, constraints, and defaults
```

**Steps:**
1. Find the table section in DATABASE_SCHEMA.md
2. Add new rows to the Columns table:

```markdown
| `new_column` | text | NOT NULL | - | [Column description] |
| `another_column` | numeric | - | 0 | [Column description] |
```

3. Add update note:
```markdown
---
**Update History:**
- YYYY-MM-DD: Added columns: `new_column`, `another_column`
```

---

### Adding New RPC Function

**File to Update:** [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)

**Information Needed from Supabase AI:**
```
Show definition of function "function_name" including:
- Parameters with types
- Return type
- Function body/logic
```

**Template:**

```markdown
### function_name

**Purpose:** [Brief description of what this function does]

**Migration:** [migration_file_name.sql]

**Parameters:**
\`\`\`typescript
{
  param1: type;              // Required/Optional: description
  param2?: type;             // Required/Optional: description
}
\`\`\`

**Returns:**
\`\`\`typescript
{
  field1: type;
  field2: type;
  // ... other fields
}
\`\`\`
// OR
\`\`\`typescript
Array<{
  field1: type;
  field2: type;
}>
\`\`\`

**Description:**
[Detailed explanation of what the function does, how it works, and any important notes]

**Frontend Usage:**
\`\`\`typescript
// Example usage
const { data, error } = await supabase
  .rpc('function_name', {
    param1: value1,
    param2: value2
  });

if (error) {
  console.error('Error:', error.message);
} else {
  console.log('Result:', data);
}
\`\`\`

**Use Cases:**
- Use case 1
- Use case 2
- Use case 3
```

**Where to Add:**
1. Add under appropriate category in RPC_FUNCTIONS.md
2. Update Table of Contents
3. Update total functions count at bottom

---

### Adding New RLS Policy

**File to Update:** [RLS_POLICIES.md](./RLS_POLICIES.md)

**Information Needed from Supabase AI:**
```
Show all RLS policies for table "table_name"
```

**Template:**

```markdown
### table_name Policies

**Table:** `table_name`
**RLS Enabled:** Yes

#### Policy Name: policy_name

\`\`\`sql
CREATE POLICY "policy_name"
ON table_name FOR [SELECT/INSERT/UPDATE/DELETE]
USING ([condition for existing rows])
WITH CHECK ([condition for new rows]);
\`\`\`

- **Operation:** SELECT/INSERT/UPDATE/DELETE
- **Effect:** [What this policy allows/prevents]
- **When It Applies:** [When this policy is checked]

**Frontend Impact:**
\`\`\`typescript
// Example showing how this policy affects queries
const { data } = await supabase
  .from('table_name')
  .select('*');
// Returns only rows that match policy condition
\`\`\`
```

---

### Adding New ENUM Type

**File to Update:** [TRIGGERS_AND_VIEWS.md](./TRIGGERS_AND_VIEWS.md)

**Information Needed from Supabase AI:**
```
Show ENUM type "enum_name" definition and all possible values
```

**Template:**

```markdown
### enum_name

**Purpose:** [Brief description of what this ENUM represents]

**Definition:**
\`\`\`sql
CREATE TYPE enum_name AS ENUM (
  'value1',      -- Description
  'value2',      -- Description
  'value3'       -- Description
);
\`\`\`

**Used In:**
- `table_name.column_name`

**Values:**

| Value | Description | When Used |
|-------|-------------|-----------|
| `value1` | [Description] | [Usage context] |
| `value2` | [Description] | [Usage context] |
| `value3` | [Description] | [Usage context] |

**Frontend Usage:**
\`\`\`typescript
// TypeScript type definition
type EnumName = 'value1' | 'value2' | 'value3';

// Usage in query
const { data, error } = await supabase
  .from('table_name')
  .insert({
    column_name: 'value1'  // ENUM value
  });
\`\`\`

**Migration:** [migration_file_name.sql]
```

---

### Adding New Materialized View

**File to Update:** [TRIGGERS_AND_VIEWS.md](./TRIGGERS_AND_VIEWS.md)

**Information Needed from Supabase AI:**
```
Show complete definition of materialized view "view_name" including:
- SELECT query
- Columns and types
- Indexes
```

**Template:**

```markdown
### view_name

**Purpose:** [Brief description of what this view aggregates/computes]

**Migration:** [migration_file_name.sql]

**Definition:**
\`\`\`sql
CREATE MATERIALIZED VIEW view_name AS
SELECT
  [columns],
  [aggregations],
  [calculations]
FROM [tables]
WHERE [conditions]
GROUP BY [grouping];
\`\`\`

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `column1` | type | [Description] |
| `column2` | type | [Description] |

**Indexes:**
\`\`\`sql
CREATE INDEX idx_view_name_col1 ON view_name(column1);
CREATE INDEX idx_view_name_col2 ON view_name(column2);
\`\`\`

**Refresh Strategy:**
\`\`\`sql
-- Manual refresh
REFRESH MATERIALIZED VIEW view_name;

-- Concurrent refresh (non-blocking)
REFRESH MATERIALIZED VIEW CONCURRENTLY view_name;
\`\`\`

**Frontend Usage:**
\`\`\`typescript
// Query materialized view (fast!)
const { data, error } = await supabase
  .from('view_name')
  .select('*')
  .order('column1');
\`\`\`

**When to Refresh:**
- [Trigger condition 1]
- [Trigger condition 2]
- [Scheduled time]

**Use Cases:**
- [Use case 1]
- [Use case 2]
```

---

### Adding New Trigger

**File to Update:** [TRIGGERS_AND_VIEWS.md](./TRIGGERS_AND_VIEWS.md)

**Information Needed from Supabase AI:**
```
Show trigger "trigger_name" definition including the function it executes
```

**Template:**

```markdown
### trigger_name

**Purpose:** [Brief description of what this trigger does]

**Function Definition:**
\`\`\`sql
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic here
  [trigger logic]
  RETURN NEW; -- or OLD for DELETE
END;
$$ LANGUAGE plpgsql;
\`\`\`

**Trigger Definition:**
\`\`\`sql
CREATE TRIGGER trigger_name
  BEFORE/AFTER INSERT/UPDATE/DELETE ON table_name
  FOR EACH ROW
  [WHEN (condition)]
  EXECUTE FUNCTION function_name();
\`\`\`

**Behavior:**
- Fires **BEFORE/AFTER** [operation]
- [What it does]
- [When it fires]

**Example:**
\`\`\`typescript
// Example showing trigger in action
await supabase
  .from('table_name')
  .insert({ /* data */ });
// Trigger automatically [does something]
\`\`\`

**Migration:** [migration_file_name.sql]
```

---

## Format Specifications

### General Formatting Rules

1. **File Format:** Always use Markdown (.md)
2. **Headings:** Use `#`, `##`, `###` for hierarchy
3. **Code Blocks:** Use triple backticks with language:
   - SQL: \`\`\`sql
   - TypeScript: \`\`\`typescript
   - Bash: \`\`\`bash

4. **Tables:** Use markdown tables:
   ```markdown
   | Column | Type | Description |
   |--------|------|-------------|
   | data   | text | Example     |
   ```

5. **Inline Code:** Use backticks for `table_names`, `column_names`, `function_names`

6. **Lists:** Use `-` for unordered, numbers for ordered

7. **Emphasis:**
   - **Bold** for important: `**text**`
   - *Italic* for emphasis: `*text*`
   - ⚠️ Warning emoji for critical notes

### Date Format
Always use: `YYYY-MM-DD` (e.g., 2025-11-02)

### Version Notes
Add at bottom of each updated file:
```markdown
---
**Update History:**
- 2025-11-02: Initial documentation created
- 2025-11-15: Added new table xyz
```

---

## Step-by-Step Guide

### Complete Workflow for Adding a New Table

**Step 1: Get Information from Supabase**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Ask Supabase AI:
   ```
   Get complete schema for table "new_table_name" including all columns, types, constraints, indexes, foreign keys, and related tables
   ```
4. Copy the output to a text file

**Step 2: Prepare Documentation**

1. Open [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
2. Find the appropriate section (or create new section)
3. Copy the template from above
4. Fill in all fields:
   - Purpose
   - Migration file name
   - All columns with types and constraints
   - Indexes
   - Foreign keys
   - Related tables
   - Frontend usage example

**Step 3: Update Related Documentation**

If the table has special features:
- **RLS Policies** → Update [RLS_POLICIES.md](./RLS_POLICIES.md)
- **Has Triggers** → Update [TRIGGERS_AND_VIEWS.md](./TRIGGERS_AND_VIEWS.md)
- **Has Related RPC** → Update [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)

**Step 4: Update Indexes**

1. Update Table of Contents in each modified file
2. Update Overview statistics (total counts)
3. Add update history note at bottom

**Step 5: Inform AI Agent**

Tell your AI agent:
```
I've updated the Supabase documentation with the new table "new_table_name".
The documentation is in docs/supabase/DATABASE_SCHEMA.md.
Please review and use this information when implementing features related to this table.
```

---

## Quick Reference Commands

### Commands to Give Your AI Agent

#### When You've Updated Schema:
```
I've added schema information to docs/supabase/DATABASE_SCHEMA.md for table "table_name".
Please read the documentation and use it for any queries involving this table.
```

#### When You've Added RPC:
```
I've documented a new RPC function "function_name" in docs/supabase/RPC_FUNCTIONS.md.
Please use this function instead of writing complex queries.
```

#### When Backend Changes:
```
The backend has changed. I've updated docs/supabase/ with the latest schema from Supabase.
Please refresh your understanding by reading the updated documentation files.
```

#### When SQL Errors Occur:
```
There's a SQL error. Please check docs/supabase/DATABASE_SCHEMA.md to verify:
1. Table name spelling
2. Column names and types
3. Required constraints
4. Foreign key relationships
Then fix the query accordingly.
```

---

## Checklist for Updates

### ✅ Before Updating Documentation:

- [ ] Have complete schema information from Supabase AI
- [ ] Know which migration file created the change
- [ ] Understand the purpose of the change
- [ ] Have example frontend usage ready

### ✅ While Updating:

- [ ] Use correct file (DATABASE_SCHEMA, RPC_FUNCTIONS, RLS_POLICIES, etc.)
- [ ] Follow template format exactly
- [ ] Fill in all required fields
- [ ] Add frontend usage examples
- [ ] Use proper markdown formatting

### ✅ After Updating:

- [ ] Update Table of Contents
- [ ] Update statistics (total counts)
- [ ] Add update history note
- [ ] Verify all links work
- [ ] Inform AI agent of changes

---

## Common Mistakes to Avoid

❌ **Don't:**
- Leave placeholder text like `[Description]` without filling in
- Forget to update Table of Contents
- Use inconsistent formatting
- Skip frontend usage examples
- Forget to add update history

✅ **Do:**
- Be thorough and complete
- Use consistent naming conventions
- Provide clear descriptions
- Include practical examples
- Keep documentation up-to-date

---

## Need Help?

If you're unsure about something:

1. **Check existing documentation** - Find similar examples in current docs
2. **Ask Supabase AI** - Get exact schema definitions
3. **Reference templates** - Use templates in this file
4. **Ask your AI agent** - Describe what you need help with

---

**Last Updated:** 2025-11-02
**Documentation Version:** 1.0

---

## 🚨 Important Reminders

- 📝 Always update documentation IMMEDIATELY after backend changes
- 🔄 Keep documentation in sync with database schema
- 📋 Use templates for consistency
- ✅ Verify all information before saving
- 🤖 Inform AI agents when documentation is updated
- ⚠️ Never guess schema information - always verify with Supabase
