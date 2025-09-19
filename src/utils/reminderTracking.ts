import { supabase } from "./supabaseClient";
import { handleSupabaseError } from "./errors";
import { ReminderItem } from "./reminders";

export interface ReminderTrackingRecord {
  id: string;
  reminder_id: string;
  reminder_type: string;
  entity_id: string;
  entity_type: string;
  module: string;
  status: 'active' | 'dismissed' | 'snoozed';
  priority: 'critical' | 'warning' | 'normal';
  title: string;
  due_date?: string;
  days_left?: number;
  link: string;
  metadata: Record<string, any>;
  snoozed_until?: string;
  dismissed_at?: string;
  acknowledged_at?: string;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReminderAction {
  action: 'acknowledge' | 'dismiss' | 'snooze';
  snooze_until?: string; // For snooze action
  metadata?: Record<string, any>;
}

/**
 * Sync reminders with the tracking database
 * This function should be called when generating reminders to ensure they're tracked
 */
export const syncRemindersWithTracking = async (reminders: ReminderItem[]): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    // Get existing tracked reminders for this user
    const { data: existingReminders, error: fetchError } = await supabase
      .from('reminder_tracking')
      .select('reminder_id, status, snoozed_until')
      .eq('added_by', user.id)
      .in('status', ['active', 'snoozed']);

    if (fetchError) {
      handleSupabaseError('fetch existing reminders', fetchError);
      return;
    }

    const existingReminderMap = new Map(
      existingReminders?.map(r => [r.reminder_id, r]) || []
    );

    const now = new Date();
    const remindersToInsert: Partial<ReminderTrackingRecord>[] = [];
    const remindersToUpdate: { id: string; updates: Partial<ReminderTrackingRecord> }[] = [];

    for (const reminder of reminders) {
      const existing = existingReminderMap.get(reminder.id);
      
      // Check if reminder is snoozed and not yet time to show
      if (existing?.status === 'snoozed' && existing.snoozed_until) {
        const snoozeUntil = new Date(existing.snoozed_until);
        if (now < snoozeUntil) {
          continue; // Skip this reminder as it's still snoozed
        }
      }

      const reminderData: Partial<ReminderTrackingRecord> = {
        reminder_id: reminder.id,
        reminder_type: reminder.type,
        entity_id: reminder.entityId,
        entity_type: getEntityTypeFromModule(reminder.module),
        module: reminder.module,
        status: 'active',
        priority: reminder.status,
        title: reminder.title,
        due_date: reminder.dueDate,
        days_left: reminder.daysLeft,
        link: reminder.link,
        metadata: {},
        added_by: user.id,
      };

      if (existing) {
        // Update existing reminder
        remindersToUpdate.push({
          id: existing.reminder_id,
          updates: {
            ...reminderData,
            status: 'active', // Reactivate if it was snoozed
            snoozed_until: null,
          }
        });
      } else {
        // Insert new reminder
        remindersToInsert.push(reminderData);
      }
    }

    // Insert new reminders
    if (remindersToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('reminder_tracking')
        .insert(remindersToInsert);

      if (insertError) {
        handleSupabaseError('insert new reminders', insertError);
      }
    }

    // Update existing reminders
    for (const update of remindersToUpdate) {
      const { error: updateError } = await supabase
        .from('reminder_tracking')
        .update(update.updates)
        .eq('reminder_id', update.id)
        .eq('added_by', user.id);

      if (updateError) {
        handleSupabaseError('update existing reminder', updateError);
      }
    }

  } catch (error) {
    console.error('Error syncing reminders with tracking:', error);
  }
};

/**
 * Get tracked reminders for the current user
 */
export const getTrackedReminders = async (): Promise<ReminderTrackingRecord[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    const { data, error } = await supabase
      .from('reminder_tracking')
      .select('*')
      .eq('added_by', user.id)
      .in('status', ['active', 'snoozed'])
      .order('priority', { ascending: false }) // critical first
      .order('due_date', { ascending: true });

    if (error) {
      handleSupabaseError('fetch tracked reminders', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tracked reminders:', error);
    return [];
  }
};

/**
 * Perform an action on a reminder (acknowledge, dismiss, snooze)
 */
export const performReminderAction = async (
  reminderId: string, 
  action: ReminderAction
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    const now = new Date().toISOString();
    let updates: Partial<ReminderTrackingRecord> = {};

    switch (action.action) {
      case 'acknowledge':
        updates = {
          acknowledged_at: now,
        };
        break;
      
      case 'dismiss':
        updates = {
          status: 'dismissed',
          dismissed_at: now,
        };
        break;
      
      case 'snooze':
        if (!action.snooze_until) {
          console.error('Snooze until date is required for snooze action');
          return false;
        }
        updates = {
          status: 'snoozed',
          snoozed_until: action.snooze_until,
        };
        break;
      
      default:
        console.error('Invalid reminder action:', action.action);
        return false;
    }

    const { error } = await supabase
      .from('reminder_tracking')
      .update(updates)
      .eq('reminder_id', reminderId)
      .eq('added_by', user.id);

    if (error) {
      handleSupabaseError('perform reminder action', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error performing reminder action:', error);
    return false;
  }
};

/**
 * Get reminder statistics for the current user
 */
export const getReminderStats = async (): Promise<{
  total: number;
  critical: number;
  warning: number;
  normal: number;
  acknowledged: number;
  dismissed: number;
  snoozed: number;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return {
        total: 0,
        critical: 0,
        warning: 0,
        normal: 0,
        acknowledged: 0,
        dismissed: 0,
        snoozed: 0,
      };
    }

    const { data, error } = await supabase
      .from('reminder_tracking')
      .select('status, priority, acknowledged_at')
      .eq('added_by', user.id)
      .in('status', ['active', 'snoozed', 'dismissed']);

    if (error) {
      handleSupabaseError('fetch reminder stats', error);
      return {
        total: 0,
        critical: 0,
        warning: 0,
        normal: 0,
        acknowledged: 0,
        dismissed: 0,
        snoozed: 0,
      };
    }

    const stats = {
      total: data.length,
      critical: 0,
      warning: 0,
      normal: 0,
      acknowledged: 0,
      dismissed: 0,
      snoozed: 0,
    };

    data.forEach(reminder => {
      // Count by priority
      if (reminder.priority === 'critical') stats.critical++;
      else if (reminder.priority === 'warning') stats.warning++;
      else if (reminder.priority === 'normal') stats.normal++;

      // Count by status
      if (reminder.status === 'dismissed') stats.dismissed++;
      else if (reminder.status === 'snoozed') stats.snoozed++;

      // Count acknowledged
      if (reminder.acknowledged_at) stats.acknowledged++;
    });

    return stats;
  } catch (error) {
    console.error('Error fetching reminder stats:', error);
    return {
      total: 0,
      critical: 0,
      warning: 0,
      normal: 0,
      acknowledged: 0,
      dismissed: 0,
      snoozed: 0,
    };
  }
};

/**
 * Clean up old dismissed reminders (older than 30 days)
 */
export const cleanupOldReminders = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return 0;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('reminder_tracking')
      .delete()
      .eq('added_by', user.id)
      .eq('status', 'dismissed')
      .lt('dismissed_at', thirtyDaysAgo.toISOString())
      .select('id');

    if (error) {
      handleSupabaseError('cleanup old reminders', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error cleaning up old reminders:', error);
    return 0;
  }
};

/**
 * Helper function to determine entity type from module
 */
const getEntityTypeFromModule = (module: string): string => {
  switch (module) {
    case 'vehicles':
      return 'vehicle';
    case 'drivers':
      return 'driver';
    case 'maintenance':
      return 'maintenance_task';
    case 'trips':
      return 'trip';
    case 'ai_alerts':
      return 'ai_alert';
    default:
      return 'unknown';
  }
};
