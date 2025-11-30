# HMAC Authentication Setup Guide

## Overview

This document explains how we've implemented HMAC (Hash-based Message Authentication Code) signature authentication for APIClub API calls. This replaces the IP whitelisting requirement, allowing Supabase Edge Functions with dynamic IPs to work seamlessly.

## What Changed?

Previously, our APIs used simple API key authentication with IP whitelisting:
```javascript
headers: {
  'x-api-key': 'your-api-key'
}
```

Now we use HMAC-SHA256 signatures:
```javascript
headers: {
  'x-signature': 'generated-hmac-signature',
  'x-id': 'your-x-id-value'
}
```

## How HMAC Authentication Works

1. **Convert JSON payload to Base64**
   ```javascript
   const base64Payload = btoa(JSON.stringify(requestBody))
   ```

2. **Generate HMAC-SHA256 signature**
   ```javascript
   const signature = HMAC-SHA256(base64Payload, apiKey)
   ```

3. **Send request with signature headers**
   - `x-signature`: The generated HMAC signature
   - `x-id`: Your unique identifier provided by APIClub

## Environment Variables Required

You need to add the following environment variable to both your local `.env` file and your Supabase project:

### For Supabase Edge Functions

Add this to your Supabase project secrets:

```bash
APICLUB_URL=https://prod.apiclub.in/api/v1/rc_info
APICLUB_KEY=apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50
APICLUB_XID=<your-x-id-value-from-apiclub>
```

**To add to Supabase:**
```bash
# Navigate to your project
cd supabase

# Set the environment variables
npx supabase secrets set APICLUB_URL="https://prod.apiclub.in/api/v1/rc_info"
npx supabase secrets set APICLUB_KEY="apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50"
npx supabase secrets set APICLUB_XID="<your-x-id-value>"
```

### For Local Proxy Server

Add to your `.env` file:

```env
# APIClub Credentials
APICLUB_URL=https://prod.apiclub.in/api/v1/rc_info
APICLUB_KEY=apclb_xZ7S4F2ngB8TUpH6vKNbGvL83a446d50
APICLUB_XID=<your-x-id-value-from-apiclub>

# Proxy Server Settings
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Getting Your X-ID Value

**IMPORTANT:** You need to contact your APIClub service provider to get your `x-id` value. This is a unique identifier assigned to your account for HMAC authentication.

According to the APIClub documentation:
> "x-id: Use the provided x-id parameter below. x-id: <value shared by APIClub>"

## Updated Files

### 1. Supabase Edge Function
**File:** `supabase/functions/fetch-rc-details/index.ts`

Changes:
- ✅ Generates Base64 payload
- ✅ Creates HMAC-SHA256 signature using Web Crypto API
- ✅ Sends `x-signature` and `x-id` headers
- ✅ Validates all required credentials (URL, KEY, XID)

### 2. Proxy Server
**File:** `rc-proxy-server.js`

Changes:
- ✅ Imports Node.js `crypto` module
- ✅ Generates Base64 payload
- ✅ Creates HMAC-SHA256 signature using crypto.createHmac()
- ✅ Sends `x-signature` and `x-id` headers
- ✅ Logs authentication method on startup

## Testing the Implementation

### Test 1: Edge Function (Supabase)

After deploying to Supabase:

```bash
# Deploy the function
npx supabase functions deploy fetch-rc-details

# Test it
curl -X POST https://your-project.supabase.co/functions/v1/fetch-rc-details \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"registration_number": "DL01AB1234"}'
```

### Test 2: Local Proxy Server

```bash
# Start the proxy server
node rc-proxy-server.js

# Test it
curl -X POST http://localhost:3001/api/fetch-rc-details \
  -H "Content-Type: application/json" \
  -d '{"registration_number": "DL01AB1234"}'
```

## Benefits of HMAC Authentication

✅ **No IP Whitelisting Required** - Works from any IP address
✅ **Secure** - Cryptographic signature prevents tampering
✅ **Dynamic IPs Supported** - Perfect for Supabase Edge Functions
✅ **Standard Method** - Industry-standard authentication approach

## Troubleshooting

### Error: "API credentials not configured - need URL, KEY, and XID"

**Solution:** Make sure you've set all three environment variables:
- `APICLUB_URL`
- `APICLUB_KEY`
- `APICLUB_XID`

### Error: "Unauthorized" or 403 Response

**Possible causes:**
1. Incorrect `x-id` value - verify with APIClub
2. Incorrect API key - check your credentials
3. Signature generation issue - check the implementation

### Error: "Invalid signature"

**Solution:** Ensure the signature is generated correctly:
1. JSON stringify the request body
2. Base64 encode the JSON string
3. Generate HMAC-SHA256 of the Base64 string using your API key
4. Convert to hex string

## Next Steps

1. ✅ Get your `x-id` value from APIClub
2. ✅ Add environment variables to Supabase and `.env`
3. ⏳ Test with RC details API
4. ⏳ Apply same pattern to Driver License API
5. ⏳ Apply same pattern to Challan API

## References

- APIClub HMAC Documentation: `HMAC APIclub.pdf`
- Edge Function: `supabase/functions/fetch-rc-details/index.ts`
- Proxy Server: `rc-proxy-server.js`


