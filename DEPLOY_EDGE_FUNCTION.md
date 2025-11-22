# Deploy Updated Edge Function to Supabase

## What Was Fixed

The Edge Function was calling a non-existent function `generate_kpi_cards_with_comparisons`. 

**Updated to:**
- Call `generate_kpi_cards()` for basic KPIs (8 cards)
- Call `generate_comparative_kpis()` for comparative KPIs (10 cards)
- Both functions are now called on every refresh

## How to Deploy

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref oosrmuqfcqtojflruhww

# Deploy the function
supabase functions deploy refresh-kpis
```

### Option 2: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/oosrmuqfcqtojflruhww/functions
2. Click on `refresh-kpis` function
3. Click "Edit Function"
4. Copy the content from `supabase/functions/refresh-kpis/index.ts`
5. Paste it into the editor
6. Click "Deploy"

### Option 3: Manual Upload

1. Go to Supabase Dashboard → Edge Functions
2. Delete the old `refresh-kpis` function
3. Create a new function with the same name
4. Upload the updated `index.ts` file

## Testing the Deployment

After deployment, test it by manually triggering:

1. **Via Supabase Dashboard:**
   - Go to Edge Functions → refresh-kpis → Invoke

2. **Via curl:**
   ```bash
   curl -X POST https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/refresh-kpis \
     -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     -H "Content-Type: application/json"
   ```

3. **Via GitHub Actions:**
   - Go to: https://github.com/AVS-club/Fleet-Management-System---Trip-Sheet-Module3/actions
   - Click "Refresh KPIs" workflow
   - Click "Run workflow"

## Expected Output

After successful deployment, you should see:
```json
{
  "success": true,
  "cards_created": 18,
  "basic_kpis": 8,
  "comparative_kpis": 10,
  "execution_time_ms": 1234,
  "timestamp": "2025-11-22T07:30:00.000Z"
}
```

## Verification

Check your KPIs dashboard - all values should show real data:
- ✅ Monthly Trips: 299 trips
- ✅ Monthly Revenue: ₹1,914,750
- ✅ This Week's Distance: 12,331 km
- ✅ Top Vehicle: CG04PC7691
- ✅ Top Driver: SAGAR NISHAD

No more zeros!

