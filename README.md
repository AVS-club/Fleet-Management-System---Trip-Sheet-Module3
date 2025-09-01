# Fleet Management System

A comprehensive fleet management solution for tracking vehicles, drivers, trips, and maintenance.

## Features

- Vehicle management
- Driver management
- Trip tracking and analysis
- Maintenance scheduling and tracking
- AI-powered alerts and insights
- Document management
- Reporting and analytics

## Development


### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual Supabase project URL and anon key
4. Configure CORS in your Supabase project:
   - Go to your Supabase Dashboard: https://supabase.com/dashboard
   - Select your project
   - Navigate to Settings → API → CORS
   - Add these URLs to allowed origins:
     - http://localhost:5173
     - https://localhost:5173
   - Save the changes and wait 1-2 minutes for them to take effect

   **Important**: If you're experiencing CORS errors with Edge Functions, ensure that:
   - Your Supabase project has the correct CORS configuration
   - The Edge Function `fetch-vehicle-details` exists in your Supabase project
   - Your network allows connections to Supabase Edge Functions
   - If issues persist, the VAHAN fetch feature will be temporarily disabled with a fallback to manual entry
4. Start the development server:
   ```
   npm run dev
   ```


### Performance

- Batched mileage updates use a single `upsert` call. In local tests, updating five trips
  dropped from roughly 500ms with individual requests to about 100ms when batched.


## License

This project is proprietary and confidential.
