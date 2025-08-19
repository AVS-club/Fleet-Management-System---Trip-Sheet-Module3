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
3. Copy `.env.example` to `.env` and fill in your Supabase credentials
4. Start the development server:
   ```
   npm run dev
   ```


### Performance

- Batched mileage updates use a single `upsert` call. In local tests, updating five trips
  dropped from roughly 500ms with individual requests to about 100ms when batched.


## License

This project is proprietary and confidential.
