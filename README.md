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

### Scripts

The project includes several utility scripts:

#### Seed Maintenance Tasks

To seed the maintenance tasks catalog:

1. Navigate to the scripts directory:
   ```
   cd scripts
   ```

2. Install script dependencies:
   ```
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your Supabase credentials

4. Run the seed script:
   ```
   npm run seed:maintenance
   ```

This will import all maintenance tasks from `src/data/maintenance_tasks.json` into the Supabase `maintenance_tasks_catalog` table.

## License

This project is proprietary and confidential.
