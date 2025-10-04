# Hero Feed Implementation Guide

## Overview

The Hero Feed is a unified activity feed system that displays all fleet events in real-time, including AI alerts, maintenance tasks, trips, documents, and KPIs. This implementation provides a modern, responsive interface for monitoring fleet operations.

## Features

- **Unified Feed**: All fleet events in one place
- **Real-time Updates**: Live data from the database
- **Filtering**: Filter by event type (AI Alerts, Documents, Maintenance, Trips, KPIs)
- **Infinite Scroll**: Load more events as you scroll
- **Interactive Actions**: Accept/Reject AI alerts, view tasks, send reminders
- **Priority-based Styling**: Color-coded events by priority (danger, warn, info)
- **KPI Cards**: Special themed cards for key performance indicators
- **Responsive Design**: Works on desktop and mobile devices

## File Structure

```
src/
├── hooks/
│   └── useHeroFeed.ts              # React Query hook for fetching feed data
├── components/
│   └── HeroFeed/
│       ├── index.tsx               # Export file
│       ├── HeroFeed.tsx            # Main feed component
│       ├── FeedCard.tsx            # Individual event card component
│       ├── FeedFilters.tsx         # Filter buttons component
│       └── KPICard.tsx             # Special KPI display component
└── pages/
    └── NotificationsPage.tsx       # Updated notifications page
```

## Database Schema

### events_feed Table

```sql
CREATE TABLE public.events_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind VARCHAR(50) NOT NULL,                    -- Event type
  event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'info', -- Priority level
  title VARCHAR(255) NOT NULL,                  -- Event title
  description TEXT NOT NULL,                    -- Event description
  entity_json JSONB,                           -- Flexible event data
  status VARCHAR(50),                          -- Event status
  metadata JSONB,                              -- Additional metadata
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Event Types (kind field)

- `ai_alert`: AI-generated alerts and recommendations
- `activity`: General system activities
- `vehicle_activity`: Vehicle-specific activities
- `vehicle_doc`: Vehicle document reminders
- `maintenance`: Maintenance tasks and reminders
- `trip`: Trip-related events
- `kpi`: Key performance indicators

### Priority Levels

- `danger`: Critical issues requiring immediate attention
- `warn`: Warning-level issues
- `info`: Informational events

## Usage

### Basic Implementation

```tsx
import HeroFeed from '@/components/HeroFeed';

function MyPage() {
  return (
    <Layout title="Fleet Activity Feed">
      <HeroFeed />
    </Layout>
  );
}
```

### Using the Hook Directly

```tsx
import { useHeroFeed } from '@/hooks/useHeroFeed';

function CustomFeed() {
  const { data, isLoading, refetch } = useHeroFeed({
    kinds: ['ai_alert', 'maintenance'], // Filter specific event types
    limit: 10 // Limit number of events
  });

  const events = data?.pages.flat() || [];

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>{event.title}</div>
      ))}
    </div>
  );
}
```

## Components

### HeroFeed.tsx

Main component that orchestrates the entire feed:
- Displays header with refresh button
- Shows statistics cards for each event type
- Renders filter buttons
- Handles infinite scroll loading
- Manages event display

### FeedCard.tsx

Individual event card component:
- Displays event icon based on type
- Shows priority-based styling
- Renders action buttons for interactive events
- Handles AI alert accept/reject actions

### FeedFilters.tsx

Filter buttons component:
- Allows filtering by event type
- Supports multiple selection
- Updates feed in real-time

### KPICard.tsx

Special component for KPI events:
- Themed styling based on KPI type
- Shows trend indicators
- Displays sparkline charts (when implemented)

## Database Migration

To set up the database tables, run:

```bash
# Start Supabase (requires Docker Desktop)
npx supabase start

# Apply migrations
npx supabase db reset
```

The migration file `supabase/migrations/20250130000000_create_events_feed.sql` includes:
- `events_feed` table creation
- `ai_alerts` table creation
- RLS policies for organization-based access
- Sample data for testing

## Mock Data

When the database is not available, the system automatically falls back to mock data. This ensures the UI works even during development without a database connection.

## Styling

The implementation uses Tailwind CSS with:
- Priority-based color schemes
- Responsive grid layouts
- Hover effects and transitions
- Mobile-optimized design

## Event Actions

### AI Alerts
- **Accept**: Mark alert as accepted
- **Reject**: Mark alert as rejected
- Status display for processed alerts

### Vehicle Documents
- **Send Reminder**: Trigger document renewal reminder

### Maintenance
- **View Task**: Navigate to maintenance task details

## Performance Optimizations

- **Infinite Query**: Efficient pagination with React Query
- **Indexed Queries**: Database indexes on frequently queried fields
- **RLS Policies**: Row-level security for data isolation
- **Mock Data Fallback**: Graceful degradation when database unavailable

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live updates
2. **Push Notifications**: Browser notifications for critical alerts
3. **Advanced Filtering**: Date ranges, custom filters
4. **Export Functionality**: Export feed data to CSV/PDF
5. **Customizable Dashboard**: User-configurable feed layout
6. **Sparkline Charts**: Visual trend indicators for KPIs

## Troubleshooting

### Database Connection Issues

If you see "Database not available, using mock data" in the console:
1. Ensure Docker Desktop is running
2. Start Supabase: `npx supabase start`
3. Apply migrations: `npx supabase db reset`

### Permission Issues

Ensure users have proper organization access:
- Check `organization_users` table
- Verify RLS policies are applied
- Confirm user has `canAccessAlerts` permission

### Performance Issues

For large datasets:
- Increase database indexes
- Implement virtual scrolling
- Add query result caching
- Optimize RLS policies

## API Integration

The system integrates with existing Supabase tables:
- `organizations`: For multi-tenant access
- `organization_users`: For user permissions
- `vehicles`: For vehicle-related events
- `drivers`: For driver-related events
- `trips`: For trip-related events
- `maintenance_tasks`: For maintenance events

## Security

- **Row Level Security**: All tables have RLS enabled
- **Organization Isolation**: Users only see their organization's data
- **Permission Checks**: UI respects user permissions
- **Input Validation**: All user inputs are validated

## Testing

The implementation includes:
- Mock data for offline testing
- Error boundary handling
- Graceful fallbacks
- Console logging for debugging

## Deployment

1. Ensure all migrations are applied
2. Verify RLS policies are active
3. Test with real data
4. Monitor performance metrics
5. Set up monitoring for feed health

## Support

For issues or questions:
1. Check console logs for errors
2. Verify database connectivity
3. Test with mock data first
4. Review RLS policies
5. Check user permissions
