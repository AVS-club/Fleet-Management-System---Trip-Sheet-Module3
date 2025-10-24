# Enable Unified Alerts View - Quick Guide

## ✅ Implementation is Complete!

All files have been created and the feature is ready to test.

## 🚀 How to Enable

### Step 1: Start Your Dev Server
```bash
npm run dev
```

### Step 2: Open http://localhost:3000

### Step 3: Enable the Feature Flag

Open **Browser DevTools Console** (F12) and run:

```javascript
localStorage.setItem('unified_alerts', 'true');
location.reload();
```

### Step 4: Navigate to AI Alerts

Go to `/ai-alerts` in your app (usually from the sidebar menu).

You should now see the **NEW Unified Timeline View**!

## 🎯 What You Should See

✨ **NEW VIEW:**
- Header: "Fleet Feed" with "Real-time fleet activity"
- Collapsible filter button (top right)
- Timeline cards for different activities
- YouTube videos interspersed (if available)
- Mobile-optimized layout

## 🔄 To Disable (Go Back to Old View)

```javascript
localStorage.setItem('unified_alerts', 'false');
location.reload();
```

## 🐛 If It's Not Working

### Check 1: Feature Flag
```javascript
console.log('Feature flag:', localStorage.getItem('unified_alerts'));
// Should output: "true"
```

### Check 2: Route
Make sure you're at `/ai-alerts` URL

### Check 3: Console Errors
Open DevTools Console (F12) and check for any red errors

### Check 4: Verify Imports
```bash
# Run TypeScript check
npx tsc --noEmit
```

## 📊 Debugging

If you see errors, run this in console:

```javascript
// Check if component loaded
console.log('UnifiedAIAlertsPage loaded:', window.location.pathname === '/ai-alerts');

// Check data fetching
supabase.from('trips').select('*').limit(1).then(console.log);

// Check YouTube API key
console.log('YouTube API:', import.meta.env.VITE_YOUTUBE_API_KEY ? 'Present' : 'Missing');
```

## 🎉 Success Indicators

If working correctly, you should see:
1. "Fleet Feed" header instead of "AI Alerts"
2. Collapsible filters with date range buttons
3. Card-based layout (not tables)
4. Different card types (trips, maintenance, etc.)
5. YouTube videos (if API key is configured)

## ⚠️ Common Issues

### Issue: Still seeing old table view
**Solution:** Feature flag not enabled or page not reloaded
```javascript
localStorage.setItem('unified_alerts', 'true');
location.reload();
```

### Issue: Blank page / white screen
**Solution:** Check browser console for errors
- Open DevTools (F12)
- Look at Console tab
- Share any error messages

### Issue: No data showing
**Solution:** Check Supabase connection
```javascript
// Test in console
supabase.from('trips').select('*').limit(1).then(console.log);
```

### Issue: Videos not loading
**Solution:** YouTube API key might be missing (not required, will use fallbacks)

## 📸 Visual Comparison

**OLD VIEW (Classic):**
- Table-based layout
- 3 tabs (All Feed, AI Alerts, Driver Insights)
- Desktop-first design
- Separate video section

**NEW VIEW (Unified):**
- Card-based timeline
- Single scrollable feed
- Mobile-first responsive
- Videos integrated every 4 items
- Collapsible filters

## 🎨 Customization

Want to change when it's enabled by default?

Edit `src/App.tsx`:
```typescript
// Line ~61
const AIAlertsPageWrapper: React.FC = () => {
  // Change this line:
  const enableUnifiedView = localStorage.getItem('unified_alerts') === 'true';

  // To enable by default:
  const enableUnifiedView = localStorage.getItem('unified_alerts') !== 'false';

  return enableUnifiedView ? <UnifiedAIAlertsPage /> : <AIAlertsPage />;
};
```

## ✅ Verification Checklist

- [ ] Dev server running (npm run dev)
- [ ] Opened http://localhost:3000
- [ ] Set feature flag to 'true' in localStorage
- [ ] Reloaded the page
- [ ] Navigated to /ai-alerts
- [ ] Seeing "Fleet Feed" header
- [ ] Cards instead of tables
- [ ] Filters button visible

## 📞 Still Need Help?

1. Check browser console for errors
2. Verify all files were created (see UNIFIED_ALERTS_README.md)
3. Run `npx tsc --noEmit` to check for TypeScript errors
4. Share the error message if any

---

**Quick Test Command:**
```bash
# In your project directory
npm run dev

# Then in browser console:
localStorage.setItem('unified_alerts', 'true'); location.reload();
```

Good luck! 🚀
