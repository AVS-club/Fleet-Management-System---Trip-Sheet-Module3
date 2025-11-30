# Production Deployment Guide - app.autovitalsolution.com

**Date:** November 30, 2025  
**Status:** ✅ Code Fixed for Production

---

## ✅ What's Been Fixed

### Code Changes Pushed to Git:

All 3 APIs now automatically use **Edge Functions in production** instead of localhost:

1. **RC API** → `https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/fetch-rc-details`
2. **DL API** → `https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/fetch-driver-details`
3. **Challan API** → `https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/fetch-challan-info`

**Logic:**
- If on localhost → Use `http://localhost:3001`
- If on production → Use Supabase Edge Functions
- Environment variable overrides both

---

## 🚀 Deployment Steps

### Step 1: Verify Supabase Edge Functions Have HMAC

**Check these 3 Edge Functions in Supabase Dashboard:**

1. ✅ `fetch-rc-details` - **HAS HMAC** (we deployed it today)
2. ⚠️ `fetch-driver-details` - **NEED TO CHECK** (exists but might not have HMAC)
3. ✅ `fetch-challan-info` - **HAS HMAC** (we deployed it today)

**To check fetch-driver-details:**
- Go to: https://supabase.com/dashboard/project/oosrmuqfcqtojflruhww/functions/fetch-driver-details/code
- Look for HMAC signature generation code
- If it doesn't have HMAC, we need to update it

---

### Step 2: Ensure Supabase Secrets are Set

Run this to verify all secrets are set:

```bash
npx supabase secrets list
```

**Required Secrets:**
```
✅ APICLUB_URL
✅ APICLUB_KEY
✅ APICLUB_XID
✅ CHALLAN_API_URL (optional, has default)
```

If any are missing:
```bash
npx supabase secrets set APICLUB_URL="https://prod.apiclub.in/api/v1/rc_info"
npx supabase secrets set APICLUB_KEY="apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50"
npx supabase secrets set APICLUB_XID="NfyPDofqnMpA91ikUroJlA=="
npx supabase secrets set CHALLAN_API_URL="https://prod.apiclub.in/api/v1/challan_info_v2"
```

---

### Step 3: Rebuild and Deploy Production App

After the code changes are merged:

1. **Pull latest code** on your production server/build pipeline
2. **Rebuild the app** with production environment
3. **Deploy** to app.autovitalsolution.com

**If using Vercel/Netlify/similar:**
- They auto-deploy from GitHub main branch
- Should pick up changes automatically
- Wait for build to complete

---

### Step 4: Test on Production

After deployment, test each API on **app.autovitalsolution.com**:

**Test RC API:**
1. Go to Vehicles → Add New Vehicle
2. Enter: CG04NJ0307
3. Click "Fetch RC Details"
4. ✅ Should populate all 50 fields!

**Test Challan API:**
1. Go to Vehicles → Document Summary
2. Click "Check Challans" on OD15T3494
3. ✅ Should show 11 challans!

**Test DL API:**
1. Go to Drivers → Edit a Driver
2. Enter license number and DOB
3. Click "Fetch Details"
4. ⚠️ **Might not work if fetch-driver-details doesn't have HMAC**

---

## ⚠️ If DL API Doesn't Work in Production

If `fetch-driver-details` edge function doesn't have HMAC, you have 2 options:

### Option A: Update fetch-driver-details with HMAC (Recommended)

Copy the HMAC code from `fetch-rc-details` and add it to `fetch-driver-details`.

I can help with this - just let me know!

### Option B: Point to Proxy Server

Deploy the `rc-proxy-server.js` to a hosting service and set:
```env
VITE_DL_PROXY_URL=https://your-proxy-server.com/api/fetch-dl-details
```

---

## 📊 Current Status

| API | Local (Dev) | Production |
|-----|-------------|------------|
| **RC** | ✅ Proxy (3001) | ✅ Edge Function (with HMAC) |
| **DL** | ✅ Proxy (3001) | ⚠️ Edge Function (check HMAC) |
| **Challan** | ✅ Proxy (3001) | ✅ Edge Function (with HMAC) |

---

## 🔍 How to Check If DL Edge Function Has HMAC

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → fetch-driver-details → Code
3. Look for these lines:

```typescript
// Should see HMAC code like this:
const base64Payload = btoa(jsonString);
const cryptoKey = await crypto.subtle.importKey(...);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
// And headers with x-signature and x-id
```

**If you don't see this**, the edge function needs to be updated with HMAC!

---

## 🎯 Next Action

1. **Rebuild and deploy** your production app (code is ready!)
2. **Test RC and Challan** - Should work immediately!
3. **Check fetch-driver-details** - See if it has HMAC
4. **If DL doesn't work** - Let me know and I'll add HMAC to it

---

**RC and Challan should work on production after you rebuild!** 🚀

DL might need the edge function updated with HMAC - I can do that quickly if needed!

