import { addDays } from 'date-fns';

export interface NextDueCalculation {
  nextDueOdo?: number;
  nextDueDate?: string;
}

export interface DueStatusResult {
  status: 'ok' | 'due_soon' | 'overdue';
  kmToDue?: number;
  daysToDue?: number;
  reason?: string;
}

/**
 * Compute next due odometer and date from last service
 */
export const computeNextDueFromLast = ({
  lastServiceOdo,
  lastServiceDate,
  intervalKm,
  intervalDays
}: {
  lastServiceOdo?: number | null;
  lastServiceDate?: string | null;
  intervalKm?: number | null;
  intervalDays?: number | null;
}): NextDueCalculation => {
  const result: NextDueCalculation = {};

  // Calculate next due odometer if we have both values
  if (typeof intervalKm === 'number' && intervalKm > 0 && 
      typeof lastServiceOdo === 'number' && !isNaN(lastServiceOdo)) {
    result.nextDueOdo = lastServiceOdo + intervalKm;
  }

  // Calculate next due date if we have both values
  if (typeof intervalDays === 'number' && intervalDays > 0 && lastServiceDate) {
    try {
      const lastDate = new Date(lastServiceDate);
      if (!isNaN(lastDate.getTime())) {
        const nextDate = addDays(lastDate, intervalDays);
        result.nextDueDate = nextDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    } catch (error) {
      console.error('Error calculating next due date:', error);
    }
  }

  return result;
};

/**
 * Compute due status based on current odometer and date vs next due targets
 */
export const computeDueStatus = ({
  nextDueOdo,
  nextDueDate,
  latestOdo,
  today,
  warnKm = 1000,
  warnDays = 7
}: {
  nextDueOdo?: number | null;
  nextDueDate?: string | null;
  latestOdo?: number | null;
  today?: Date;
  warnKm?: number;
  warnDays?: number;
}): DueStatusResult => {
  const currentDate = today || new Date();
  let isOverdue = false;
  let isDueSoon = false;
  let kmToDue: number | undefined;
  let daysToDue: number | undefined;
  let reason: string | undefined;

  // Check odometer-based due status
  if (typeof nextDueOdo === 'number' && typeof latestOdo === 'number') {
    kmToDue = nextDueOdo - latestOdo;
    
    if (kmToDue <= 0) {
      isOverdue = true;
      reason = 'by distance';
    } else if (kmToDue <= warnKm) {
      isDueSoon = true;
      reason = 'by distance';
    }
  }

  // Check date-based due status
  if (nextDueDate) {
    try {
      const dueDate = new Date(nextDueDate);
      if (!isNaN(dueDate.getTime())) {
        const timeDiff = dueDate.getTime() - currentDate.getTime();
        daysToDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysToDue <= 0) {
          isOverdue = true;
          reason = reason ? `${reason} and date` : 'by date';
        } else if (daysToDue <= warnDays) {
          isDueSoon = true;
          reason = reason ? `${reason} and date` : 'by date';
        }
      }
    } catch (error) {
      console.error('Error parsing next due date:', error);
    }
  }

  // Determine final status
  let status: DueStatusResult['status'] = 'ok';
  if (isOverdue) {
    status = 'overdue';
  } else if (isDueSoon) {
    status = 'due_soon';
  }

  return {
    status,
    kmToDue: kmToDue !== undefined ? Math.max(0, kmToDue) : undefined,
    daysToDue: daysToDue !== undefined ? Math.max(0, daysToDue) : undefined,
    reason
  };
};