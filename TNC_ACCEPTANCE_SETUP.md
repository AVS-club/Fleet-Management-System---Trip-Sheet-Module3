# TNC Acceptance System Setup Guide

This guide explains how to set up the Terms and Conditions (TNC) acceptance system in your application.

## Overview

The TNC acceptance system ensures that all users must accept the Terms and Conditions before using the application. The system:

- Shows a mandatory modal on first login
- Stores acceptance records in the database with metadata
- Blocks access until TNC is accepted
- Works for both new users and new organizations

## Database Setup

### Step 1: Run the Migration

Run the SQL migration file to create the `tnc_acceptances` table:

```sql
-- File: supabase/migrations/create_tnc_acceptances_table.sql
```

You can run this in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/create_tnc_acceptances_table.sql`
4. Click "Run"

### Step 2: Verify Table Creation

After running the migration, verify the table was created:

```sql
SELECT * FROM tnc_acceptances LIMIT 1;
```

## Features

### 1. Mandatory TNC Modal
- Appears automatically on first login
- Cannot be closed without accepting
- Blocks all UI interaction until accepted
- Shows full TNC content with scrollable view

### 2. Database Storage
Each acceptance is stored with:
- `user_id`: The user who accepted
- `organization_id`: The organization (if applicable)
- `accepted_at`: Timestamp of acceptance
- `ip_address`: User's IP address
- `user_agent`: Browser information
- `tnc_version`: Version of TNC accepted
- `metadata`: Additional metadata (screen resolution, platform, etc.)

### 3. Registration Page
- Updated to mention TNC acceptance requirement
- Links to full TNC page

### 4. Login Page
- Already includes TNC and Privacy Policy links

## How It Works

1. **User Registration**: User signs up and sees a notice about TNC acceptance
2. **First Login**: When user logs in for the first time, the TNC modal appears
3. **Acceptance Check**: The system checks if user has accepted TNC
4. **Modal Display**: If not accepted, modal blocks all access
5. **Acceptance Storage**: When user clicks "I Agree", acceptance is saved to database
6. **Access Granted**: After acceptance, user can use the application normally

## Components

### `TNCAcceptanceModal`
- Location: `src/components/TNCAcceptanceModal.tsx`
- Purpose: Displays TNC content and handles acceptance
- Features:
  - Scrollable TNC content
  - Single "I Agree" button (no cancel option)
  - Stores metadata on acceptance
  - Blocks UI until accepted

### `useTNCAcceptance` Hook
- Location: `src/hooks/useTNCAcceptance.ts`
- Purpose: Checks if user has accepted TNC
- Returns: `{ hasAccepted, loading, acceptanceRecord }`

### `ProtectedRoute` Integration
- Location: `src/components/auth/ProtectedRoute.tsx`
- Purpose: Checks TNC acceptance before allowing access
- Behavior: Shows modal if not accepted, blocks access until accepted

## Testing

### Test New User Flow
1. Create a new user account
2. Log in for the first time
3. Verify TNC modal appears
4. Scroll through TNC content
5. Click "I Agree"
6. Verify access is granted

### Test Existing User
1. Log in with existing account (without TNC acceptance)
2. Verify modal appears
3. Accept TNC
4. Verify modal doesn't appear on subsequent logins

### Test Database
1. Check `tnc_acceptances` table after acceptance
2. Verify all metadata fields are populated
3. Verify `accepted_at` timestamp is correct

## Troubleshooting

### Modal Not Appearing
- Check if migration was run successfully
- Verify user is logged in
- Check browser console for errors
- Verify `tnc_acceptances` table exists

### Acceptance Not Saving
- Check RLS policies on `tnc_acceptances` table
- Verify user has INSERT permission
- Check browser console for errors
- Verify Supabase connection

### Modal Appearing Multiple Times
- Check if acceptance record is being created
- Verify `useTNCAcceptance` hook is working correctly
- Check for duplicate acceptance records

## Future Enhancements

- TNC version tracking (when TNC is updated, require re-acceptance)
- Email notification on TNC updates
- Admin dashboard to view acceptance statistics
- Export acceptance records for compliance

## Support

If you encounter any issues, check:
1. Database migration was run successfully
2. RLS policies are correctly configured
3. User has proper permissions
4. Browser console for errors

