# Supabase Backend Documentation

> **📌 Purpose:** This documentation serves as the **single source of truth** for all Supabase backend structure. It's designed to help AI agents understand the complete backend architecture and prevent SQL failures due to missing information.

---

## 📚 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Documentation Files](#documentation-files)
3. [Connection Information](#connection-information)
4. [When to Update This Documentation](#when-to-update-this-documentation)
5. [How to Use This Documentation](#how-to-use-this-documentation)

---

## 🚀 Quick Reference

### Project Overview
- **Project Name:** Fleet Management System - Trip Sheet Module
- **Supabase Project ID:** `oosrmuqfcqtojflruhww`
- **Supabase URL:** `https://oosrmuqfcqtojflruhww.supabase.co`
- **Total Database Tables:** 40+ (verified from actual schema)
- **Total RPC Functions:** 15+ (requires verification)
- **Total Edge Functions:** 3
- **Total Migrations:** 46+

### Quick Stats
- **Core Tables:** vehicles, drivers, trips, destinations, warehouses, fuel_stations, material_types
- **Maintenance System:** maintenance_tasks, maintenance_entries, wear_parts, maintenance_vendors, maintenance_schedules, vehicle_configurations
- **Extended Features:** KPI tracking, AI alerts, reminders, P&L tracking, activity logging, performance analytics, audit trails
- **Authentication:** Enabled with RLS (Row Level Security)
- **Multi-tenancy:** Organization-based access control

---

## 📖 Documentation Files

### Core Schema & Structure

| File | Purpose | When to Reference |
|------|---------|-------------------|
| **[ACTUAL_TABLES_QUICK_REFERENCE.md](./ACTUAL_TABLES_QUICK_REFERENCE.md)** | ⭐ **Complete list of all 40+ tables** with key columns | **START HERE** - Quick lookup of table names and columns |
| **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** | Detailed table schemas with all columns, constraints, relationships | When creating queries, adding features, or troubleshooting SQL errors |
| **[RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md)** | All database functions (RPCs) with parameters and usage | When calling backend functions from frontend |
| **[RLS_POLICIES.md](./RLS_POLICIES.md)** | Row Level Security policies | When debugging access issues or adding new tables |
| **[EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md)** | Edge functions reference | When using API endpoints (⚠️ DO NOT MODIFY) |
| **[TRIGGERS_AND_VIEWS.md](./TRIGGERS_AND_VIEWS.md)** | Database triggers, materialized views, ENUMs | When understanding automated behaviors or using views |

### User Management & Auth

| File | Purpose | When to Reference |
|------|---------|-------------------|
| **[CREATE_USER_AND_ORGANIZATION_GUIDE.md](./CREATE_USER_AND_ORGANIZATION_GUIDE.md)** | 🎯 **BULLETPROOF guide** for creating users + organizations via SQL | **When creating demo users, test accounts, or initial org owners** - Works on first try! |
| **[QUICK_CREATE_USER_CHEATSHEET.md](./QUICK_CREATE_USER_CHEATSHEET.md)** | ⚡ **One-page cheat sheet** with copy-paste scripts | **When you need it fast** - Minimal explanation, just change 4 variables and run |

### Testing & Maintenance

| File | Purpose | When to Reference |
|------|---------|-------------------|
| **[QUICK_TEST_GUIDE.md](./QUICK_TEST_GUIDE.md)** | ⭐ **Quick data isolation testing** with your actual org UUIDs | **Before production** - Verify no data leakage (15 min test) |
| **[TEMPLATE_FOR_UPDATES.md](./TEMPLATE_FOR_UPDATES.md)** | Instructions for updating this documentation | When adding/removing tables or making backend changes |

---

## 🔌 Connection Information

### Supabase Client Configuration
Located in: [src/utils/supabaseClient.ts](../../src/utils/supabaseClient.ts)

```typescript
const supabaseUrl = 'https://oosrmuqfcqtojflruhww.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
```

### Storage Configuration
Located in: [src/utils/supabaseStorage.ts](../../src/utils/supabaseStorage.ts)

**Storage Buckets:**
- `vehicle-documents`
- `driver-documents`

---

## 🔄 When to Update This Documentation

### ⚠️ MUST UPDATE when:
1. ✅ **Adding a new table** → Update `DATABASE_SCHEMA.md`
2. ✅ **Removing a table** → Update `DATABASE_SCHEMA.md`
3. ✅ **Adding/modifying columns** → Update `DATABASE_SCHEMA.md`
4. ✅ **Creating new RPC functions** → Update `RPC_FUNCTIONS.md`
5. ✅ **Adding RLS policies** → Update `RLS_POLICIES.md`
6. ✅ **Creating new triggers/views** → Update `TRIGGERS_AND_VIEWS.md`
7. ✅ **Adding new ENUMs** → Update `TRIGGERS_AND_VIEWS.md`
8. ✅ **Running new migrations** → Update relevant documentation

### ℹ️ How to Update:
1. Query **Supabase AI agent** for latest schema information
2. Follow instructions in **[TEMPLATE_FOR_UPDATES.md](./TEMPLATE_FOR_UPDATES.md)**
3. Paste the updated information into the appropriate file
4. Tell your AI agent: *"Update the Supabase documentation with this new information"*

---

## 📖 How to Use This Documentation

### For AI Agents:
When implementing features or fixing bugs:
1. **Always read** `DATABASE_SCHEMA.md` first to understand table structure
2. **Check** `RPC_FUNCTIONS.md` for available backend functions
3. **Verify** column names, types, and constraints before writing SQL
4. **Use** the frontend usage examples as reference
5. **Never modify** edge functions without explicit permission

### For Troubleshooting SQL Errors:
1. Check table name spelling in `DATABASE_SCHEMA.md`
2. Verify column names and types
3. Check for required constraints (NOT NULL, UNIQUE, etc.)
4. Verify foreign key relationships
5. Check RLS policies in `RLS_POLICIES.md`

### Common Issues Prevented:
- ❌ Incorrect table names
- ❌ Wrong column names or types
- ❌ Missing required fields
- ❌ Foreign key constraint violations
- ❌ RLS policy access denials
- ❌ Using wrong RPC function signatures

---

## 🛡️ Important Notes

### Edge Functions (⚠️ Protected)
The following edge functions are **pre-configured and wired with APIs**. Do NOT modify unless explicitly requested:
- `fetch-rc-details`
- `fetch-challan-info`
- `refresh-kpis`

See [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) for reference only.

### TypeScript Type Definitions
Frontend type definitions are located in:
- [src/types/](../../src/types/)

These should match the database schema documented here.

---

## 📝 Migration Files
All migration files are located in: [supabase/migrations/](../../supabase/migrations/)

Migration files are referenced throughout this documentation to show which file created each table or feature.

---

## 🆘 Need Help?

1. **For schema questions:** Check `DATABASE_SCHEMA.md`
2. **For function usage:** Check `RPC_FUNCTIONS.md`
3. **For access issues:** Check `RLS_POLICIES.md`
4. **To update documentation:** Check `TEMPLATE_FOR_UPDATES.md`

---

**Last Updated:** 2025-12-09
**Documentation Version:** 2.0
**Total Documentation Files:** 10 (added user creation guides)
