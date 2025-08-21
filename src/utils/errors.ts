import { toast } from 'react-toastify';

export function handleSupabaseError(action: string, error: any) {
  // Show user-friendly toast
  toast.error(`Failed to ${action}. Please try again.`);
  
  // Developer console log with details
  console.error(`[${action.toUpperCase()} ERROR]`, {
    action,
    message: error?.message || 'Unknown error',
    details: error?.details || null,
    hint: error?.hint || null,
    code: error?.code || null,
    stack: error?.stack || null,
    source: error?.cause || null,
  });
}