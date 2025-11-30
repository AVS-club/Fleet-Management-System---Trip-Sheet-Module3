# Next Steps: Implement HMAC for Driver License & Challan APIs

## ✅ RC API - DONE!

The RC Details API is now fully working with HMAC authentication!  
**Test result:** Successfully fetched real vehicle data for CG04NJ0307.

---

## 📋 TODO: Apply HMAC to Remaining APIs

### 1. Driver License API (GetDriverLicenseDetails)

**Files to Update:**
- ✅ `dl-proxy-server.js` - Already has the import for crypto
- ⏳ `supabase/functions/fetch-driver-license/index.ts` - Need to check if exists or use Edge Function

**What to do:**
1. Apply the same HMAC pattern we used for RC
2. Use the same credentials:
   - `APICLUB_XID=NfyPDofqnMpA91ikUroJlA==`
   - `DL_API_KEY=apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50`
3. Update the headers to use `x-signature` and `x-id`

**Code pattern to replicate:**
```javascript
// 1. Base64 encode the JSON
const base64Payload = Buffer.from(JSON.stringify(requestBody)).toString('base64');

// 2. Generate HMAC signature
const hmacSignature = crypto
  .createHmac('sha256', API_KEY)
  .update(base64Payload)
  .digest('hex');

// 3. Send with headers
headers: {
  'Content-Type': 'application/x-www-form-urlencoded', // or 'application/json'
  'x-signature': hmacSignature,
  'x-id': APICLUB_XID
}
```

### 2. Challan API (FetchChallan)

**Files to Update:**
- ⏳ `supabase/functions/fetch-challan-info/index.ts`
- ⏳ Create or update challan proxy server (if needed)

**What to do:**
1. Apply the same HMAC pattern
2. Use same credentials (X-ID and API key)
3. Update headers to use `x-signature` and `x-id`

---

## 🛠️ Implementation Guide

### Step 1: Driver License API

1. **Find/Create the Edge Function:**
   ```bash
   # Check if it exists
   ls supabase/functions/fetch-driver-license
   
   # Or check existing edge functions
   ls supabase/functions/
   ```

2. **Update dl-proxy-server.js:**
   - Already has `import crypto from 'crypto'` ✅
   - Add Base64 encoding
   - Generate HMAC signature
   - Update headers

3. **Test it:**
   - Open Driver Form
   - Enter license number and DOB
   - Click "Fetch Details"
   - Verify data populates

### Step 2: Challan API

1. **Update fetch-challan-info edge function:**
   - File: `supabase/functions/fetch-challan-info/index.ts`
   - Apply HMAC pattern
   - Test with chassis & engine number

2. **Create proxy if needed**

3. **Test it:**
   - Fetch challan information for a vehicle
   - Verify it works without IP whitelisting

---

## 📝 Environment Variables Needed

Make sure these are set (already done for RC):

### In Supabase Secrets:
```bash
APICLUB_URL=https://prod.apiclub.in/api/v1/rc_info
APICLUB_KEY=apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50
APICLUB_XID=NfyPDofqnMpA91ikUroJlA==

# For Driver License
DL_API_URL=https://uat.apiclub.in/api/v1/fetch_dl
DL_API_KEY=apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50
DL_API_XID=NfyPDofqnMpA91ikUroJlA==  # Same X-ID

# For Challan
CHALLAN_API_URL=https://prod.apiclub.in/api/v1/challan_info_v2
CHALLAN_API_KEY=apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50
CHALLAN_API_XID=NfyPDofqnMpA91ikUroJlA==  # Same X-ID
```

---

## 🎯 Quick Win Strategy

1. **Copy the HMAC code from rc-proxy-server.js**
2. **Paste into dl-proxy-server.js** (replace the old header section)
3. **Test Driver License fetch**
4. **Repeat for Challan**
5. **Deploy all edge functions**
6. **DONE!** 🎉

---

## 📸 Evidence of Success

**Screenshots saved:**
- `hmac-test-result-final.png` - Form with fetched data
- `hmac-success-full-form.png` - Complete form view

**Test Vehicle:** CG04NJ0307  
**Result:** All vehicle details auto-filled from API  
**Authentication:** HMAC-SHA256 with X-ID

---

## 🚀 Ready to Proceed?

The hard part is done! The HMAC implementation pattern is proven and working.  
Now just replicate it for the other two APIs!

**Estimated time to complete:**
- Driver License: ~15 minutes
- Challan: ~15 minutes
- Testing: ~10 minutes
- **Total: ~40 minutes to full completion!**

---

**Status:** 1 of 3 APIs complete  
**Next:** Driver License API  
**After That:** Challan API  

Let's finish this! 💪

