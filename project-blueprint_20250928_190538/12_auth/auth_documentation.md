# Authentication Documentation

## Current Setup
- Email-based authentication
- Organization-based access control
- Supabase Auth integration

## User Management
- Users are created through Supabase Auth
- Organization ownership is managed through the organizations table
- RLS policies control data access

## Login Flow
1. User enters email/username
2. System authenticates with Supabase Auth
3. Organization data is fetched based on user ID
4. User context is stored in localStorage

## Security Notes
- All sensitive operations require authentication
- RLS policies enforce data isolation
- API keys are environment-specific
- No sensitive data in client-side code
