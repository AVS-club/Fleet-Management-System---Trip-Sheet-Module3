import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('entityViewTracking');

export type EntityType = 'vehicles' | 'drivers' | 'trips';

interface TrackViewOptions {
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  organizationId: string;
}

interface RecentlyViewedEntity {
  id: string;
  name: string;
  last_viewed_at: string;
  view_count: number;
}

/**
 * Track when a user views an entity (vehicle, driver, or trip)
 * This will:
 * 1. Update the entity's last_viewed_at, last_viewed_by, and view_count
 * 2. Create an activity event in the events_feed
 * 3. Display in the AI Alerts feed chronologically
 *
 * @example
 * ```ts
 * // When user opens a vehicle detail page
 * await trackEntityView({
 *   entityType: 'vehicles',
 *   entityId: vehicle.id,
 *   entityName: vehicle.registration_number,
 *   organizationId: user.organization_id
 * });
 * ```
 */
export const trackEntityView = async (options: TrackViewOptions): Promise<boolean> => {
  const { entityType, entityId, entityName, organizationId } = options;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error('Failed to get current user for view tracking:', userError);
      return false;
    }

    // Call the database function to track the view
    const { error } = await supabase.rpc('track_entity_view', {
      entity_table: entityType,
      entity_id: entityId,
      user_id: user.id,
      org_id: organizationId,
      entity_name: entityName || null
    });

    if (error) {
      logger.error(`Failed to track ${entityType} view:`, error);
      return false;
    }

    logger.debug(`✅ Tracked view: ${entityType}/${entityId} by user ${user.id}`);
    return true;

  } catch (error) {
    logger.error(`Exception tracking ${entityType} view:`, error);
    return false;
  }
};

/**
 * Get recently viewed entities of a specific type
 *
 * @example
 * ```ts
 * const recentVehicles = await getRecentlyViewedEntities('vehicles', orgId, 5);
 * ```
 */
export const getRecentlyViewedEntities = async (
  entityType: EntityType,
  organizationId: string,
  limit: number = 5
): Promise<RecentlyViewedEntity[]> => {
  try {
    const { data, error } = await supabase.rpc('get_recently_viewed_entities', {
      entity_table: entityType,
      org_id: organizationId,
      limit_count: limit
    });

    if (error) {
      logger.error(`Failed to fetch recently viewed ${entityType}:`, error);
      return [];
    }

    return data || [];

  } catch (error) {
    logger.error(`Exception fetching recently viewed ${entityType}:`, error);
    return [];
  }
};

/**
 * Hook to track entity views automatically on mount
 * Use this in detail page components
 *
 * @example
 * ```tsx
 * function VehiclePage({ vehicleId }: Props) {
 *   useEntityViewTracking({
 *     entityType: 'vehicles',
 *     entityId: vehicleId,
 *     entityName: vehicle?.registration_number,
 *     organizationId: user.organization_id,
 *     enabled: !!vehicle && !!user
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export const useEntityViewTracking = (
  options: TrackViewOptions & { enabled?: boolean }
) => {
  const { enabled = true, ...trackOptions } = options;

  // Track view on mount (using useEffect in the component that calls this)
  // This is just a helper - actual implementation will be in components
  if (enabled && trackOptions.entityId && trackOptions.organizationId) {
    // The actual tracking will be done via useEffect in components
    return () => trackEntityView(trackOptions);
  }

  return () => Promise.resolve(false);
};

/**
 * Batch track multiple entity views (for list pages with thumbnails)
 * Only call this if you want to track views of items in a list
 * Usually not needed - reserve for special cases
 */
export const trackBatchEntityViews = async (
  views: TrackViewOptions[]
): Promise<void> => {
  // Track views in parallel, but don't wait for all to complete
  // This is fire-and-forget to avoid slowing down the UI
  Promise.all(views.map(view => trackEntityView(view)))
    .catch(error => logger.error('Error in batch view tracking:', error));
};

/**
 * Check if entity has been viewed recently (within last N minutes)
 * Useful for preventing duplicate tracking on rapid navigation
 */
export const wasRecentlyViewed = (
  lastViewedAt: string | null,
  withinMinutes: number = 5
): boolean => {
  if (!lastViewedAt) return false;

  const lastViewed = new Date(lastViewedAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastViewed.getTime()) / (1000 * 60);

  return diffMinutes < withinMinutes;
};
