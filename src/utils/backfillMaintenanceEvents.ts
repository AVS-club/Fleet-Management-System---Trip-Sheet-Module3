import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('backfillMaintenanceEvents');

/**
 * Backfill existing maintenance tasks into the events_feed table
 * This is a one-time utility to populate the feed with historical maintenance data
 */
export const backfillMaintenanceEvents = async () => {
  try {
    logger.info('Starting maintenance events backfill...');

    // Step 1: Clean up any existing maintenance events with NULL organization_id
    const { error: deleteError } = await supabase
      .from('events_feed')
      .delete()
      .eq('kind', 'maintenance')
      .is('organization_id', null);

    if (deleteError) {
      logger.warn('Error deleting broken events:', deleteError);
    }

    // Step 2: Get all maintenance tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .order('start_date', { ascending: false });

    if (tasksError) {
      logger.error('Error fetching maintenance tasks:', tasksError);
      return { success: false, error: tasksError };
    }

    if (!tasks || tasks.length === 0) {
      logger.info('No maintenance tasks found to backfill');
      return { success: true, count: 0 };
    }

    logger.info(`Found ${tasks.length} maintenance tasks to backfill`);

    // Step 3: Get all vehicles to build vehicle_id → organization_id map
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, organization_id');

    if (vehiclesError) {
      logger.error('Error fetching vehicles:', vehiclesError);
      return { success: false, error: vehiclesError };
    }

    // Build vehicle_id → organization_id lookup map
    const vehicleOrgMap = new Map<string, string>();
    vehicles?.forEach(v => {
      if (v.id && v.organization_id) {
        vehicleOrgMap.set(v.id, v.organization_id);
      }
    });

    // Check which tasks already have events
    const taskIds = tasks.map(t => t.id);
    const { data: existingEvents } = await supabase
      .from('events_feed')
      .select('entity_json')
      .eq('kind', 'maintenance')
      .in('entity_json->>task_id', taskIds);

    const existingTaskIds = new Set(
      existingEvents?.map((e: any) => e.entity_json?.task_id) || []
    );

    // Filter out tasks that already have events
    const tasksToAdd = tasks.filter(t => !existingTaskIds.has(t.id));

    logger.info(`${tasksToAdd.length} tasks need events created`);

    if (tasksToAdd.length === 0) {
      return { success: true, count: 0, message: 'All tasks already have events' };
    }

    // Create events for each task using vehicle's organization_id
    const eventsToInsert = tasksToAdd.map(task => {
      // Get organization_id from vehicle lookup, fallback to task's organization_id
      const organizationId = task.vehicle_id
        ? vehicleOrgMap.get(task.vehicle_id) || task.organization_id
        : task.organization_id;

      if (!organizationId) {
        logger.warn(`Task ${task.id} has no organization_id (vehicle: ${task.vehicle_id})`);
      }

      return {
        kind: 'maintenance',
        event_time: task.created_at || task.start_date, // Use created_at for chronological ordering
        priority: task.priority === 'high' ? 'warn' : 'info',
        title: `Maintenance Task${task.priority === 'high' ? ' (High Priority)' : ''}${task.status === 'completed' ? ' - Completed' : ''}`,
        description: `${task.type || 'Service'} ${task.status === 'completed' ? 'completed' : 'scheduled'} for vehicle at ${task.odometer_reading} km`,
        entity_json: {
          task_id: task.id,
          vehicle_id: task.vehicle_id,
          type: task.type,
          priority: task.priority,
          status: task.status,
          odometer_reading: task.odometer_reading,
          garage_id: task.garage_id,
          scheduled_date: task.start_date, // Store scheduled date in metadata
          completed_date: task.end_date
        },
        status: task.status,
        metadata: {
          source: 'maintenance_backfill'
        },
        organization_id: organizationId
      };
    });

    // Filter out events with no organization_id
    const validEvents = eventsToInsert.filter(e => e.organization_id);
    const skippedCount = eventsToInsert.length - validEvents.length;

    if (skippedCount > 0) {
      logger.warn(`Skipping ${skippedCount} tasks with no organization_id`);
    }

    if (validEvents.length === 0) {
      logger.warn('No valid events to insert (all missing organization_id)');
      return { success: true, count: 0, message: 'No valid events to insert' };
    }

    // Insert events in batches of 100
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < validEvents.length; i += batchSize) {
      const batch = validEvents.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('events_feed')
        .insert(batch);

      if (insertError) {
        logger.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      } else {
        inserted += batch.length;
        logger.info(`Inserted batch ${i / batchSize + 1}: ${batch.length} events`);
      }
    }

    logger.info(`✅ Backfill complete: ${inserted} events created`);

    return {
      success: true,
      count: inserted,
      total: tasks.length,
      skipped: existingTaskIds.size
    };
  } catch (error) {
    logger.error('Exception during backfill:', error);
    return { success: false, error };
  }
};
