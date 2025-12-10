# AI Assistant Protocol: User & Organization Creation

> **📌 Purpose:** Standard operating procedure for AI assistants when asked to create Supabase users
>
> **Target Audience:** AI assistants (Claude, GPT, etc.) working with this codebase
>
> **Last Updated:** December 9, 2025

---

## 🎯 When User Asks to Create a User

Follow this exact protocol to **get it right the first time**:

---

## ✅ STEP 1: Gather Required Information

Before doing anything, ask for or confirm these 4 values:

1. **Email address** (e.g., `user@example.com`)
2. **Password** (suggest strong password if not provided)
3. **Full name / Display name** (e.g., `John Doe`)
4. **Organization name** (e.g., `Acme Transport`)

**Example prompt:**
> "I'll create a user and organization. Please confirm:
> - Email: [value]
> - Password: [value]
> - Full name: [value]
> - Organization: [value]"

---

## ✅ STEP 2: Provide the Bulletproof Script

**ALWAYS use the script from:** `docs/supabase/QUICK_CREATE_USER_CHEATSHEET.md`

**DO NOT:**
- ❌ Write a custom script from scratch
- ❌ Use simplified INSERT statements without all fields
- ❌ Guess at table constraints
- ❌ Skip validation checks

**DO:**
- ✅ Copy the exact script from the cheat sheet
- ✅ Update only the 4 variables
- ✅ Include all required fields (instance_id, aud, role, etc.)
- ✅ Include provider_id in auth.identities
- ✅ Include owner_id in organizations
- ✅ Create records in correct order: user → identity → profile → org → link

---

## ✅ STEP 3: Handle Errors Correctly

### If User Reports "null value in column X" Error:

**STOP! This means the schema has constraints we don't know about.**

1. **DO NOT** guess at fixes
2. **DO NOT** suggest multiple trial-and-error attempts
3. **DO** run Step 0 (Schema Validation) from the full guide first
4. **DO** check what columns are actually required
5. **THEN** update the script based on actual schema

**Example response:**
> "The error shows your database has additional required fields. Let me check your schema first to get it right:
> 
> [Provide Step 0 Schema Validation query]
> 
> Please run this and share the output so I can create a script that works on the first try."

---

## ✅ STEP 4: Verify Success

After user runs the script, ask them to run the verification query:

```sql
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  p.full_name,
  o.name as organization_name,
  ou.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.organization_users ou ON ou.user_id = u.id
LEFT JOIN public.organizations o ON o.id = ou.organization_id
WHERE u.email = 'EMAIL_HERE';  -- Replace with actual email
```

Expected output should show:
- ✅ user_id (UUID)
- ✅ email_confirmed_at (timestamp, not NULL)
- ✅ organization_name
- ✅ role = 'owner'

---

## 🚨 Common Pitfalls to Avoid

### ❌ WRONG: Writing a "Simple" Script

```sql
-- ❌ DON'T DO THIS - Will fail!
INSERT INTO auth.users (email, password) 
VALUES ('user@example.com', 'password123');
```

**Why it fails:**
- Missing required fields (aud, role, instance_id)
- Wrong password field (should be encrypted_password with bcrypt)
- No identity record created
- No provider_id

### ❌ WRONG: Trial and Error Approach

User: "I want to create a user"

AI: "Here's a script [gives basic script]"

User: "Error: null value in column owner_id"

AI: "Oops, try this [updated script]"

User: "Error: null value in column provider_id"

AI: "Sorry, try this [another updated script]"

**This is frustrating for the user!**

### ✅ RIGHT: Schema-First Approach

User: "I want to create a user"

AI: "I'll provide a bulletproof script that checks your schema first to ensure it works on the first try. Please provide:
1. Email
2. Password
3. Full name
4. Organization name

Then run this schema validation query first: [Step 0 query]

Once validation passes, use this creation script: [Full bulletproof script from cheat sheet]"

---

## 📚 Reference Documents (In Order of Importance)

| Priority | Document | Use Case |
|----------|----------|----------|
| 🥇 **#1** | `QUICK_CREATE_USER_CHEATSHEET.md` | **Always start here** - Copy the exact script |
| 🥈 **#2** | `CREATE_USER_AND_ORGANIZATION_GUIDE.md` | Full guide with Step 0 validation and troubleshooting |
| 🥉 **#3** | `DATABASE_SCHEMA.md` | If you need to understand table structure |

---

## 🎓 Learning from Past Mistakes

### What Went Wrong (December 9, 2025 Incident)

**Issue:** User wanted to create user for "Rakesh Tempo Services"

**What happened:**
1. ❌ First script failed: Missing `owner_id` in organizations table
2. ❌ Second script failed: Missing `provider_id` in auth.identities table
3. ✅ Third script succeeded (after learning schema constraints)

**Why it happened:**
- Didn't check schema first
- Used simplified script without all required fields
- Made assumptions about table structure

**Lesson learned:**
> **Always use the bulletproof script with ALL fields, not a simplified version**

### The Fix

Created two new documents:
1. **Full guide** with Step 0 schema validation
2. **Cheat sheet** with complete working script

Both include:
- ✅ All required fields for auth.users
- ✅ provider_id for auth.identities
- ✅ owner_id for organizations
- ✅ Correct order of operations
- ✅ Pre-validation checks
- ✅ Clear error messages

---

## 📋 Quick Decision Tree

```
User asks to create user
         |
         v
Do I have: email, password, name, org?
         |
    +---------+
    |         |
   NO        YES
    |         |
    v         v
  Ask for   Use cheat sheet script
  details   Update 4 variables
            Provide to user
                 |
                 v
            Did it work?
                 |
            +---------+
            |         |
           YES       NO
            |         |
            v         v
         Done!    Run Step 0 validation
                  Check actual schema
                  Update script based on findings
```

---

## 🔐 Security Reminders

- ⚠️ These scripts require **service_role** privileges
- ⚠️ Never expose service_role key in client code
- ⚠️ Suggest strong passwords (min 8 chars, mixed case, numbers, symbols)
- ⚠️ For production, recommend Supabase Auth API instead
- ⚠️ These scripts skip email verification (intended for demos/testing)

---

## ✅ Success Criteria

You've done it right if:

1. ✅ User only has to run **ONE** creation script (not multiple failed attempts)
2. ✅ Script includes validation to catch errors before making changes
3. ✅ Script works on first try OR provides clear validation errors
4. ✅ User can see their new user in Supabase Authentication dashboard
5. ✅ User can sign in with provided credentials

---

## 🤝 Summary

**Golden Rule:** 
> Use the bulletproof script from QUICK_CREATE_USER_CHEATSHEET.md — don't reinvent the wheel!

**If in doubt:**
> Run Step 0 validation first, THEN create the script

**Never:**
> Give multiple scripts hoping one will work (trial and error approach)

---

**Remember:** This protocol exists because we learned the hard way. Follow it to save everyone time and frustration! 🎯




