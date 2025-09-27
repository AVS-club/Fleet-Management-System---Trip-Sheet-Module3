import { format, parseISO, isValid, differenceInDays } from 'date-fns';

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not specified';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not specified';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return 'Invalid date';
  }
};

export const daysUntil = (dateString: string | null | undefined): number => {
  if (!dateString) return Infinity;
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return Infinity;
    
    return differenceInDays(date, new Date());
  } catch (error) {
    return Infinity;
  }
};

export const isExpired = (dateString: string | null | undefined): boolean => {
  return daysUntil(dateString) < 0;
};

export const isExpiringSoon = (dateString: string | null | undefined, daysThreshold: number = 30): boolean => {
  const days = daysUntil(dateString);
  return days >= 0 && days <= daysThreshold;
};

export const getExpiryStatus = (dateString: string | null | undefined) => {
  if (!dateString) return { status: 'unknown', color: 'gray', days: null };
  
  const days = daysUntil(dateString);
  
  if (days < 0) return { status: 'expired', color: 'red', days: Math.abs(days) };
  if (days <= 7) return { status: 'critical', color: 'red', days };
  if (days <= 30) return { status: 'warning', color: 'yellow', days };
  if (days <= 60) return { status: 'upcoming', color: 'blue', days };
  return { status: 'valid', color: 'green', days };
};