import { toast } from 'react-toastify';
import { createLogger } from './logger';

const logger = createLogger('errors');

export function handleSupabaseError(action: string, error: any) {
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
  } else {
    // Generic error message
    toast.error(`Failed to ${action}. Please try again.`);
  }
  
  // Developer console log with details
  logger.error(`[${action.toUpperCase()} ERROR]`, {
    action,
    message: error?.message || 'Unknown error',
    details: error?.details || null,
    hint: error?.hint || null,
    code: error?.code || null,
    stack: error?.stack || null,
    source: error?.cause || null,
  });
}