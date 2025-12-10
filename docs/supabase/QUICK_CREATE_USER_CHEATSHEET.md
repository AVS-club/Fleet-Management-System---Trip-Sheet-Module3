# Quick Create User & Organization - Cheat Sheet

> **📌 Purpose:** Fast reference for creating users without reading the full guide
>
> **⚠️ For detailed instructions:** See [CREATE_USER_AND_ORGANIZATION_GUIDE.md](./CREATE_USER_AND_ORGANIZATION_GUIDE.md)

---

## 🚀 Quick 3-Step Process

### Step 1: Copy This Script

```sql
-- QUICK USER CREATION SCRIPT
-- ⚠️ UPDATE THE 4 VARIABLES BELOW THEN RUN
DO $$
DECLARE
  user_email TEXT := 'user@example.com';           -- ⚠️ CHANGE
  user_password TEXT := 'StrongPass123!';          -- ⚠️ CHANGE
  user_full_name TEXT := 'John Doe';               -- ⚠️ CHANGE
  org_name TEXT := 'My Company';                   -- ⚠️ CHANGE
  
  new_user_id uuid;
  org_id uuid;
BEGIN
  -- Validation
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'User % already exists', user_email;
  END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE name = org_name) THEN
    RAISE EXCEPTION 'Organization % already exists', org_name;
  END IF;
  
  new_user_id := gen_random_uuid();
  
  -- 1. Create auth user
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, phone_change, phone_change_token, email_change_token_current,
    reauthentication_token, invited_at, confirmation_sent_at, recovery_sent_at,
    email_change_sent_at, phone_change_sent_at, reauthentication_sent_at,
    last_sign_in_at, phone, phone_confirmed_at, email_change_confirm_status, banned_until
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
    user_email, crypt(user_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', user_full_name),
    FALSE, now(), now(),
    '', '', '', '', '', '', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL
  );
  
  -- 2. Create identity
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_user_id, new_user_id::text,
    jsonb_build_object('sub', new_user_id::text, 'email', user_email),
    'email', now(), now(), now());
  
  -- 3. Create profile
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (new_user_id, user_full_name, user_email, now(), now());
  
  -- 4. Create organization
  INSERT INTO public.organizations (id, name, owner_id, created_at, updated_at)
  VALUES (gen_random_uuid(), org_name, new_user_id, now(), now())
  RETURNING id INTO org_id;
  
  -- 5. Link user to org
  INSERT INTO public.organization_users (id, organization_id, user_id, role, created_at)
  VALUES (gen_random_uuid(), org_id, new_user_id, 'owner', now());
  
  RAISE NOTICE '✅ SUCCESS!';
  RAISE NOTICE 'Email: % | Password: % | User ID: %', user_email, user_password, new_user_id;
  RAISE NOTICE 'Organization: % | Org ID: %', org_name, org_id;
END $$;
```

### Step 2: Update Variables

Change these 4 lines:
```sql
user_email TEXT := 'user@example.com';           -- Their email
user_password TEXT := 'StrongPass123!';          -- Strong password
user_full_name TEXT := 'John Doe';               -- Display name
org_name TEXT := 'My Company';                   -- Organization name
```

### Step 3: Run in Supabase SQL Editor

1. Open Supabase → **SQL Editor**
2. Paste the script
3. Click **Run**
4. Done! ✅

---

## 🧹 Quick Cleanup (If Needed)

If you need to remove a user/org:

```sql
-- QUICK CLEANUP SCRIPT
DO $$
DECLARE
  target_email TEXT := 'user@example.com';  -- ⚠️ CHANGE THIS
BEGIN
  DELETE FROM public.organization_users WHERE user_id IN (SELECT id FROM auth.users WHERE email = target_email);
  DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = target_email);
  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = target_email);
  DELETE FROM auth.users WHERE email = target_email;
  RAISE NOTICE '✅ Cleaned up user: %', target_email;
END $$;
```

---

## ✅ Quick Verification

Check if user was created:

```sql
-- Replace with your email
SELECT 
  u.id, u.email, p.full_name, 
  o.name as org_name, ou.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.organization_users ou ON ou.user_id = u.id
LEFT JOIN public.organizations o ON o.id = ou.organization_id
WHERE u.email = 'user@example.com';  -- ⚠️ CHANGE
```

---

## 📝 Real Examples

### Example 1: Rakesh Tempo Services

```sql
user_email TEXT := 'rk7182664@gmail.com';
user_password TEXT := 'trial123';
user_full_name TEXT := 'Rakesh Tempo Services';
org_name TEXT := 'Rakesh Tempo Services';
```

**Result:**
```json
{
  "user_id": "f5105165-7bd7-4cb1-8504-d40f7c821ae9",
  "email": "rk7182664@gmail.com",
  "organization_id": "77671f3d-0ae1-45c1-8c04-085d368722e6",
  "organization_name": "Rakesh Tempo Services",
  "role": "owner"
}
```

### Example 2: Demo Account

```sql
user_email TEXT := 'demo@fleetmanagement.com';
user_password TEXT := 'Demo2025!';
user_full_name TEXT := 'Demo User';
org_name TEXT := 'Demo Fleet Company';
```

---

## ⚠️ Common Errors

| Error | Fix |
|-------|-----|
| User already exists | Run cleanup script first |
| Organization already exists | Run cleanup script or use different name |
| null value in column | Check [Full Guide](./CREATE_USER_AND_ORGANIZATION_GUIDE.md) Step 0 |

---

## 🔗 Need More Help?

- **Full Guide:** [CREATE_USER_AND_ORGANIZATION_GUIDE.md](./CREATE_USER_AND_ORGANIZATION_GUIDE.md)
- **Schema Validation:** Run Step 0 in the full guide
- **Troubleshooting:** See full guide troubleshooting section
- **Production Use:** Use Supabase Auth API instead

---

**Last Updated:** December 9, 2025




