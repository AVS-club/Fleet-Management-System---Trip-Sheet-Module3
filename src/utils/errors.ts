import { toast } from 'react-toastify';
import { createLogger } from './logger';

const logger = createLogger('errors');

// Silent error categories that shouldn't show toast notifications
const SILENT_AUTH_ACTIONS = [
  'get user for destinations',
  'get user for destination',
  'get user for destination by any id'
];

export function handleSupabaseError(action: string, error: any, silent: boolean = false) {
  // Check if this is an authentication-related error that should be silent
  const isAuthError = error?.message?.toLowerCase().includes('auth') || 
                      error?.message?.toLowerCase().includes('jwt') ||
                      error?.message?.toLowerCase().includes('session') ||
                      error?.status === 401;
  
  const shouldBeSilent = silent || 
                         (isAuthError && SILENT_AUTH_ACTIONS.includes(action));
  
  // Only show toast for non-silent errors
  if (!shouldBeSilent) {
    // Handle specific error codes with user-friendly messages
    if (error?.code === '23505') {
      // Duplicate key violation
      const message = error?.message || '';
      if (message.includes('license_number')) {
        toast.error('A driver with this license number already exists. Please use a different license number.');
      } else if (message.includes('registration_number')) {
        toast.error('A vehicle with this registration number already exists. Please use a different registration number.');
      } else {
        toast.error('This record already exists. Please check for duplicates.');
      }
    } else if (error?.code === '22P02') {
      // Invalid input syntax (e.g., invalid UUID)
      toast.error('Invalid data format. Please check your input and try again.');
    } else if (isAuthError) {
      // Authentication-related errors get a more specific message
      toast.error('Your session has expired. Please log in again.');
    } else {
      // Generic error message
      toast.error(`Failed to ${action}. Please try again.`);
    }
  }
  
  // Developer console log with details (always log, even if silent)
  logger.error(`[${action.toUpperCase()} ERROR]`, {
    action,
    message: error?.message || 'Unknown error',
    details: error?.details || null,
    hint: error?.hint || null,
    code: error?.code || null,
    status: error?.status || null,
    stack: error?.stack || null,
    source: error?.cause || null,
    silent: shouldBeSilent
  });
}