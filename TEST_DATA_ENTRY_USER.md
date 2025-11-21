# Data Entry User Test Account

## Credentials
- **Email**: sud.22.halt@icloud.com
- **Password**: Raipur@123
- **Role**: data_entry

## Expected Behavior When Logging In

### ✅ What SHOULD happen:
1. **Navigation Bar**:
   - Should show loading skeleton briefly
   - Then display ONLY: Vehicles, Drivers, Trips, Maintenance
   - Should NOT show: Dashboard, Reports, AI Alerts, Admin/Settings

2. **Landing Page**:
   - Should redirect to `/vehicles` page (not dashboard)
   - No flash of dashboard content

3. **Permissions Applied**:
   - Cannot access `/dashboard` - redirects to `/vehicles`
   - Cannot access `/trip-pnl-reports` 
   - Cannot access `/ai-alerts`
   - Cannot access `/admin`

### ❌ What should NOT happen:
- No flash of Dashboard, Reports, AI Alerts, or Admin items in navigation
- No momentary display of dashboard before redirect
- No flickering of menu items

## Testing Steps

1. **Initial Login Test**:
   - Clear browser cache/cookies
   - Go to login page
   - Enter credentials
   - Click "Sign In"
   - Observe navigation loading
   - Verify only allowed items appear

2. **Page Refresh Test**:
   - After login, refresh the page (F5)
   - Permissions should apply instantly from cache
   - No flash of restricted items

3. **Direct URL Test**:
   - Try navigating directly to `/dashboard`
   - Should redirect to `/vehicles`
   - Try `/admin` - should redirect
   - Try `/trip-pnl-reports` - should redirect

4. **Logout/Login Cycle**:
   - Logout from the system
   - Login again with same credentials
   - Verify same behavior (cache cleared on logout)

## Verification in Database

To verify this user's role in the database, run:

```sql
SELECT 
  u.email,
  ou.user_id,
  ou.organization_id,
  ou.role,
  o.name as organization_name
FROM organization_users ou
JOIN auth.users u ON ou.user_id = u.id
JOIN organizations o ON ou.organization_id = o.id
WHERE u.email = 'sud.22.halt@icloud.com';
```

This should show role as 'data_entry'.
