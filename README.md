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
4. **IMPORTANT**: Configure CORS in your Supabase project:
   - Go to your Supabase Dashboard: https://supabase.com/dashboard
   - Select your project
   - Navigate to Settings → API → CORS
   - Add these URLs to allowed origins:
     - http://localhost:5000
     - https://localhost:5000
     - http://localhost:5173
     - https://localhost:5173
   - Save the changes and wait 1-2 minutes for them to take effect

   **Critical**: If you're experiencing CORS errors:
   - Your Supabase project has the correct CORS configuration
   - Your network allows connections to Supabase Edge Functions
   - Wait 1-2 minutes after saving CORS settings
   - Clear browser cache and reload the page
   - If issues persist, the app will run in offline mode with limited functionality

5. Start the development server:
   ```
   npm run dev
   ```


### Performance

- Batched mileage updates use a single `upsert` call. In local tests, updating five trips
  dropped from roughly 500ms with individual requests to about 100ms when batched.


## License

This project is proprietary and confidential.
