# Edge Functions Documentation

> **⚠️ IMPORTANT:** These edge functions are pre-configured and wired with APIs. **DO NOT MODIFY** unless explicitly requested.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Edge Functions List](#edge-functions-list)
  - [fetch-rc-details](#fetch-rc-details)
  - [fetch-challan-info](#fetch-challan-info)
  - [refresh-kpis](#refresh-kpis)
- [How to Call Edge Functions](#how-to-call-edge-functions)
- [Authentication & Security](#authentication--security)
- [Error Handling](#error-handling)

---

## Overview

### What are Edge Functions?
Edge Functions are server-side TypeScript/Deno functions that run on Supabase's infrastructure. They:
- Run at the edge (close to users) for low latency
- Can call external APIs
- Process data before returning to frontend
- Have access to Supabase database and auth
- Use Deno runtime (not Node.js)

### Location
All edge functions are located in:
```
supabase/functions/
├── fetch-rc-details/
│   └── index.ts
├── fetch-challan-info/
│   └── index.ts
└── refresh-kpis/
    └── index.ts
```

### Deployment
Edge functions are deployed to Supabase and accessible via:
```
https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/{function-name}
```

---

## Edge Functions List

### fetch-rc-details

**Purpose:** Fetch vehicle RC (Registration Certificate) details from external source

**Location:** `supabase/functions/fetch-rc-details/index.ts`

**Endpoint:**
```
POST https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/fetch-rc-details
```

**Request Body:**
```typescript
{
  registration_number: string;  // Required: Vehicle registration number (e.g., "MH-01-AB-1234")
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    registration_number: string;
    owner_name: string;
    vehicle_class: string;
    fuel_type: string;
    manufacturer: string;
    model: string;
    registration_date: string;    // ISO date
    fitness_upto: string;          // ISO date
    insurance_upto: string;        // ISO date
    rc_status: string;             // "ACTIVE", "SUSPENDED", etc.
    engine_number: string;
    chassis_number: string;
  } | null;
  error?: string;
}
```

**Description:**
This function fetches vehicle details from an external RC verification API (currently using mock data). It returns comprehensive vehicle information including:
- Owner details
- Vehicle specifications
- Document validity dates
- Registration status

**Current Implementation:**
⚠️ Currently returns **mock data** for testing. Will be connected to actual RC verification API in production.

**Frontend Usage:**
```typescript
// Call edge function
const { data, error } = await supabase.functions.invoke('fetch-rc-details', {
  body: {
    registration_number: 'MH-01-AB-1234'
  }
});

if (data.success) {
  console.log('RC Details:', data.data);
  // Use the data to pre-fill vehicle form
  setVehicleForm({
    registration_number: data.data.registration_number,
    make: data.data.manufacturer,
    model: data.data.model,
    fuel_type: data.data.fuel_type,
    // ... other fields
  });
} else {
  console.error('Error:', data.error);
}
```

**Use Cases:**
- Auto-fill vehicle registration form
- Verify vehicle details before adding to system
- Validate RC status
- Fetch insurance/fitness expiry dates

**⚠️ DO NOT MODIFY:**
- API endpoint configuration
- Authentication headers
- Response parsing logic
- Error handling structure

---

### fetch-challan-info

**Purpose:** Fetch traffic challan (fine) information for a vehicle

**Location:** `supabase/functions/fetch-challan-info/index.ts`

**Endpoint:**
```
POST https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/fetch-challan-info
```

**Request Body:**
```typescript
{
  registration_number: string;  // Required: Vehicle registration number
  chassis_number?: string;       // Optional: Vehicle chassis number
  engine_number?: string;        // Optional: Vehicle engine number
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    registration_number: string;
    total_challans: number;
    total_amount: number;         // Total fine amount
    outstanding_amount: number;   // Unpaid amount
    challans: Array<{
      challan_number: string;
      date: string;               // ISO date
      violation: string;          // Type of violation
      location: string;
      amount: number;
      status: string;             // "PAID", "UNPAID", "DISPUTED"
      due_date: string;           // ISO date
    }>;
  } | null;
  error?: string;
}
```

**Description:**
Fetches traffic challan (fine/ticket) information for a vehicle from transport department APIs. Returns:
- List of all challans
- Violation details
- Payment status
- Outstanding amounts

**Current Implementation:**
Connects to state transport department APIs to fetch real challan data. May require state-specific configuration.

**Frontend Usage:**
```typescript
// Fetch challan info
const { data, error } = await supabase.functions.invoke('fetch-challan-info', {
  body: {
    registration_number: 'MH-01-AB-1234'
  }
});

if (data.success && data.data.total_challans > 0) {
  // Show alert for unpaid challans
  alert(`${data.data.total_challans} challan(s) found. Outstanding: ₹${data.data.outstanding_amount}`);

  // Display challan details
  data.data.challans.forEach(challan => {
    console.log(`${challan.challan_number}: ${challan.violation} - ₹${challan.amount}`);
  });
}
```

**Use Cases:**
- Check for pending fines before trip
- Vehicle compliance dashboard
- Challan payment reminders
- Fleet compliance tracking

**Integration Points:**
- Called from vehicle detail page
- Triggered during pre-trip checks
- Scheduled checks for active vehicles

**⚠️ DO NOT MODIFY:**
- API endpoint URLs
- State-specific configurations
- Authentication tokens
- Response parsing logic

---

### refresh-kpis

**Purpose:** Refresh KPI dashboard cards by generating new metrics

**Location:** `supabase/functions/refresh-kpis/index.ts`

**Endpoint:**
```
POST https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/refresh-kpis
```

**Request Body:**
```typescript
{} // Empty body or optional filters
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  cards_generated: number;
  timestamp: string;            // ISO timestamp
}
```

**Description:**
Triggers the `generate_kpi_cards` RPC function to recalculate and update KPI dashboard metrics. Generates cards for:
- Total active vehicles
- Total trips (current month)
- Total active drivers
- Pending maintenance tasks
- Total revenue (current month)
- Average fuel efficiency
- Document expiries
- Other custom KPIs

**How It Works:**
1. Calls `generate_kpi_cards` RPC function
2. RPC queries all relevant tables
3. Calculates metrics and aggregates
4. Updates/inserts records in `kpi_cards` table
5. Returns success status

**Frontend Usage:**
```typescript
// Refresh KPIs (e.g., after bulk data import)
const { data, error } = await supabase.functions.invoke('refresh-kpis');

if (data.success) {
  console.log(`${data.cards_generated} KPI cards refreshed`);

  // Fetch updated KPI cards
  const { data: kpis } = await supabase
    .from('kpi_cards')
    .select('*')
    .order('order_index');

  setDashboardKPIs(kpis);
}
```

**When to Call:**
- Dashboard page mount/refresh
- After bulk trip import
- After adding multiple vehicles
- After data corrections
- Scheduled background refresh (every hour)

**Scheduling:**
Can be scheduled using Supabase cron jobs or external schedulers:
```typescript
// Example: Call every hour
// (Set up in Supabase dashboard or CI/CD)
```

**Use Cases:**
- Real-time dashboard updates
- Post-migration data refresh
- Manual refresh button in UI
- Scheduled background updates

**⚠️ DO NOT MODIFY:**
- RPC function call logic
- Card generation algorithm
- Database update queries
- Error handling

---

## How to Call Edge Functions

### Basic Syntax
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* request body */ }
});
```

### With TypeScript Types
```typescript
interface RCDetailsRequest {
  registration_number: string;
}

interface RCDetailsResponse {
  success: boolean;
  data: {
    registration_number: string;
    owner_name: string;
    // ... other fields
  } | null;
  error?: string;
}

const { data, error } = await supabase.functions.invoke<RCDetailsResponse>(
  'fetch-rc-details',
  {
    body: {
      registration_number: 'MH-01-AB-1234'
    } as RCDetailsRequest
  }
);
```

### With Headers
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  headers: {
    'Content-Type': 'application/json',
    // Custom headers if needed
  },
  body: { /* request body */ }
});
```

### With Timeout
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

try {
  const { data, error } = await supabase.functions.invoke('function-name', {
    body: { /* request body */ },
    signal: controller.signal
  });
} catch (err) {
  console.error('Request timeout or failed');
} finally {
  clearTimeout(timeoutId);
}
```

---

## Authentication & Security

### Automatic Authentication
Edge functions automatically receive user authentication from Supabase client:

```typescript
// User's JWT token is automatically passed
const { data } = await supabase.functions.invoke('function-name', {
  body: { /* request body */ }
});
// Edge function can access: auth.uid(), auth.role(), etc.
```

### Inside Edge Function (Deno)
```typescript
// Access authenticated user
const authHeader = req.headers.get('Authorization');
const token = authHeader.replace('Bearer ', '');
const { data: { user } } = await supabaseClient.auth.getUser(token);

console.log('User ID:', user.id);
console.log('User Email:', user.email);
```

### RLS Enforcement
Edge functions **respect RLS policies** when querying database:
```typescript
// This query is automatically filtered by user's organization
const { data: vehicles } = await supabaseClient
  .from('vehicles')
  .select('*');
// Returns only vehicles in user's organization
```

### API Keys & Secrets
Edge functions access secrets via environment variables:
```typescript
const API_KEY = Deno.env.get('EXTERNAL_API_KEY');
const RC_API_URL = Deno.env.get('RC_API_URL');
```

**⚠️ Never hardcode secrets in edge function code!**

---

## Error Handling

### Standard Error Response
All edge functions follow this error format:
```typescript
{
  success: false,
  error: "Error message here",
  details?: {
    code: "ERROR_CODE",
    message: "Detailed error message"
  }
}
```

### Frontend Error Handling
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* request body */ }
});

// Check for network/invocation errors
if (error) {
  console.error('Invocation error:', error.message);
  showNotification('Network error. Please try again.', 'error');
  return;
}

// Check for function-level errors
if (!data.success) {
  console.error('Function error:', data.error);
  showNotification(data.error, 'error');
  return;
}

// Success - use data
console.log('Success:', data.data);
```

### Common Errors

#### 1. Network Errors
```typescript
// Error: FunctionsHttpError, FunctionsRelayError, FunctionsFetchError
if (error) {
  // Handle network issues, CORS, timeouts
  console.error('Network error:', error.message);
}
```

#### 2. Function Errors
```typescript
// Error: Function returned error response
if (!data.success) {
  switch (data.details?.code) {
    case 'INVALID_INPUT':
      alert('Please provide valid registration number');
      break;
    case 'API_UNAVAILABLE':
      alert('External service unavailable. Try again later.');
      break;
    case 'UNAUTHORIZED':
      alert('You do not have permission to perform this action');
      break;
    default:
      alert('An error occurred: ' + data.error);
  }
}
```

#### 3. Timeout Errors
```typescript
try {
  const { data, error } = await supabase.functions.invoke('function-name', {
    body: { /* request body */ },
    signal: abortController.signal
  });
} catch (err) {
  if (err.name === 'AbortError') {
    console.error('Request timed out');
  }
}
```

---

## 🔄 Update Instructions

**⚠️ CRITICAL: Edge functions should NOT be modified without explicit approval.**

If you absolutely must update an edge function:

1. **Document the reason** in project notes
2. **Test locally** using Supabase CLI:
   ```bash
   supabase functions serve function-name
   ```
3. **Deploy to staging** first (if available)
4. **Test thoroughly** with real data
5. **Deploy to production**:
   ```bash
   supabase functions deploy function-name
   ```
6. **Update this documentation** with changes

**What you CAN modify (if needed):**
- Request/response type definitions in this doc
- Usage examples
- Error messages

**What you CANNOT modify (without approval):**
- Function logic
- API endpoints
- Authentication flow
- Database queries
- Error handling structure

---

## 📝 Testing Edge Functions

### Local Testing
```bash
# Serve function locally
supabase functions serve fetch-rc-details

# Test with curl
curl -X POST http://localhost:54321/functions/v1/fetch-rc-details \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"registration_number": "MH-01-AB-1234"}'
```

### Frontend Testing
```typescript
// Test button in UI
<button onClick={async () => {
  const { data, error } = await supabase.functions.invoke('fetch-rc-details', {
    body: { registration_number: 'MH-01-AB-1234' }
  });
  console.log('Result:', data, error);
}}>
  Test RC Fetch
</button>
```

---

**Last Updated:** 2025-11-02
**Documentation Version:** 1.0
**Total Edge Functions:** 3

---

## 🚨 Notes for AI Agents

- ⚠️ **DO NOT MODIFY** edge function code without explicit permission
- ✅ Edge functions are already deployed and working
- ✅ Use `.functions.invoke()` to call edge functions
- ✅ All edge functions automatically receive user authentication
- ✅ Edge functions respect RLS policies
- ✅ Always handle both invocation errors AND function-level errors
- ⚠️ Edge functions run on Deno (not Node.js) - syntax may differ
- ⚠️ Never expose API keys or secrets in frontend code
- ⚠️ Always test edge functions after deployment
