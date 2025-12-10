# Quick Reference: Create User & Organization

> **⚡ BULLETPROOF one-page reference for creating Supabase users**

---

## 📋 Checklist

Before you start, have these ready:
- [ ] User email address
- [ ] Password (min 6 characters)
- [ ] User's full name
- [ ] Organization name
- [ ] Access to Supabase SQL Editor

---

## 🚀 Quick Start (3 Steps)

### Step 1: Cleanup (if needed)

Run this if recreating an existing user/org:

```sql
DO $$
DECLARE
  target_email TEXT := 'user@example.com';  -- ⚠️ CHANGE THIS
  target_org_name TEXT := 'My Organization';  -- ⚠️ CHANGE THIS
BEGIN
  DELETE FROM public.organization_users 
  WHERE user_id IN (SELECT id FROM auth.users WHERE email = target_email);
  
  DELETE FROM public.profiles 
  WHERE id IN (SELECT id FROM auth.users WHERE email = target_email);
  
  DELETE FROM auth.identities
  WHERE user_id IN (SELECT id FROM auth.users WHERE email = target_email);
  
  DELETE FROM auth.users WHERE email = target_email;
  
  RAISE NOTICE 'Cleanup complete for: %', target_email;
END $$;
```

---

### Step 2: Create User & Organization

**Copy this entire script, change the 4 variables at the top, then run:**

```sql
DO $$
DECLARE
  -- ⚠️ CHANGE THESE 4 VALUES ⚠️
  user_email TEXT := 'user@example.com';
  user_password TEXT := 'ChangeMe123!';
  user_full_name TEXT := 'John Doe';
  org_name TEXT := 'My Organization';
  
  -- Internal variables
  new_user_id uuid; org_id uuid;
  validation_passed BOOLEAN := TRUE;
BEGIN
  -- Validate
  IF user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  IF LENGTH(user_password) < 6 THEN
    RAISE EXCEPTION 'Password too short (min 6 chars)';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE name = org_name) THEN
    RAISE EXCEPTION 'Organization already exists';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'User already exists';
  END IF;
  
  new_user_id := gen_random_uuid();
  
  -- Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at, last_sign_in_at,
    phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
    email_change_token_current, email_change_confirm_status, banned_until,
    reauthentication_token, reauthentication_sent_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
    user_email, crypt(user_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', user_full_name), FALSE, now(), now(),
    NULL, '', NULL, '', NULL, '', '', NULL, NULL,
    NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL
  );
  
  -- Create identity
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_user_id, new_user_id::text,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email, 'email_verified', true),
    'email', now(), now(), now());
  
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (new_user_id, user_full_name, user_email, now(), now());
  
  -- Create organization
  INSERT INTO public.organizations (id, name, owner_id, created_at, updated_at)
  VALUES (gen_random_uuid(), org_name, new_user_id, now(), now())
  RETURNING id INTO org_id;
  
  -- Link user to organization
  INSERT INTO public.organization_users (id, organization_id, user_id, role, created_at)
  VALUES (gen_random_uuid(), org_id, new_user_id, 'owner', now());
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUCCESS!';
  RAISE NOTICE '📧 Email: %', user_email;
  RAISE NOTICE '🔑 Password: %', user_password;
  RAISE NOTICE '👤 User ID: %', new_user_id;
  RAISE NOTICE '🏛️  Org ID: %', org_id;
  RAISE NOTICE '========================================';
END $$;
```

---

### Step 3: Verify

```sql
-- ⚠️ Change the email below
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  p.full_name,
  o.id as organization_id,
  o.name as organization_name,
  ou.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.organization_users ou ON ou.user_id = u.id
LEFT JOIN public.organizations o ON o.id = ou.organization_id
WHERE u.email = 'user@example.com';
```

**Expected:** One row with all fields filled (not NULL), role = 'owner'

---

## ❌ Common Errors

| Error | Fix |
|-------|-----|
| `duplicate key value` | Email/org already exists - run cleanup first |
| `null value in column "owner_id"` | Use the script exactly as shown (creates user first) |
| `null value in column "provider_id"` | Use the script exactly as shown (includes provider_id) |
| `Invalid email format` | Use a valid email like `user@domain.com` |
| `password too short` | Use 6+ characters |

---

## 💡 Quick Tips

1. ✅ **Always validate first** - The script checks everything before creating
2. ✅ **Use strong passwords** - Even for demo accounts
3. ✅ **Email is pre-confirmed** - Users can sign in immediately
4. ✅ **Role is 'owner'** - User has full org access
5. ✅ **Safe to retry** - Script validates before making changes

---

## 📚 Full Documentation

For complete guide with troubleshooting, rollback, and advanced features:
→ See [CREATE_USER_AND_ORGANIZATION_GUIDE.md](./CREATE_USER_AND_ORGANIZATION_GUIDE.md)

---

**Last Updated:** December 9, 2025

