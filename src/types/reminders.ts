// Enum types matching the database
export enum ReminderContactMode {
  SMS = 'SMS',
  Email = 'Email',
  Both = 'Both'
}

export enum ReminderAssignedType {
  Insurance = 'Insurance',
  Fitness = 'Fitness',
  Pollution = 'Pollution',
  Tax = 'Tax',
  Permit = 'Permit',
  ServiceDue = 'Service Due'
}

// Interface for reminder contacts
export interface ReminderContact {
  id: string;
  full_name: string;
  position: string;
  duty?: string;
  phone_number: string;
  email?: string;
  preferred_contact_mode: ReminderContactMode;
  is_active: boolean;
  photo_url?: string;
  assigned_types: ReminderAssignedType[];
  created_at?: string;
  updated_at?: string;
}

// Interface for reminder templates
export interface ReminderTemplate {
  id: string;
  reminder_type: string;
  default_days_before: number;
  repeat: boolean;
  default_contact_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Form data interfaces (for react-hook-form)
export interface ReminderContactFormData {
  full_name: string;
  position: string;
  duty?: string;
  phone_number: string;
  email?: string;
  preferred_contact_mode: ReminderContactMode;
  is_active: boolean;
  photo?: File | null;
  assigned_types: ReminderAssignedType[];
}

export interface ReminderTemplateFormData {
  reminder_type: string;
  default_days_before: number;
  repeat: boolean;
  default_contact_id?: string;
}