import { Vehicle } from './index';

// Add audit log interfaces
export interface MaintenanceAuditLogChange {
  previous_value: any;
  updated_value: any;
}

export interface MaintenanceAuditLog {
  id: string;
  task_id: string;
  timestamp: string;
  admin_user?: string;
  changes: Record<string, MaintenanceAuditLogChange>;
  created_at?: string;
}

// Add new interfaces for maintenance form
export interface MaintenanceBill {
  id: string;
  description: string;
  amount: number;
  vendor_name: string;
  bill_number?: string;
  bill_date: string;
  bill_image?: string;
}

export interface MaintenanceTask {
  id: string;
  vehicle_id: string;
  task_type: 'general_scheduled' | 'emergency_breakdown' | 'driver_damage' | 'warranty_claim';
  title: string[];
  title_group2?: string[];
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'rework';
  priority: 'low' | 'medium' | 'high' | 'critical';
  vendor_id: string;
  garage_id: string;
  estimated_cost: number;
  actual_cost?: number;
  bills: MaintenanceBill[];
  complaint_description?: string;
  resolution_summary?: string;
  warranty_expiry?: string;
  warranty_status?: 'valid' | 'expired' | 'not_applicable';
  warranty_claimed: boolean;
  part_replaced: boolean;
  part_details?: {
    name: string;
    serial_number: string;
    brand: string;
    warranty_expiry_date: string;
  };
  parts_required: MaintenancePart[];
  start_date: string;
  end_date?: string;
  service_hours?: '4' | '6' | '8' | '12';
  downtime_days: number;
  odometer_reading: number;
  odometer_image?: string;
  next_service_due?: {
    date: string;
    odometer: number;
    reminder_set: boolean;
  };
  next_predicted_service?: {
    date: string;
    odometer: number;
    confidence: number;
  };
  overdue_status?: {
    is_overdue: boolean;
    days_overdue?: number;
    km_overdue?: number;
  };
  attachments?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceType {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface MaintenanceComponent {
  id: string;
  name: string;
  description?: string;
  category?: string;
  active: boolean;
}

export interface MaintenanceBrand {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface MaintenanceCompany {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  active: boolean;
}

export interface MaintenanceVendor {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  active: boolean;
}

export interface MaintenanceStats {
  total_expenditure: number;
  record_count: number;
  average_monthly_expense: number;
  average_task_cost: number;
  expenditure_by_vehicle: Record<string, number>;
  expenditure_by_vendor: Record<string, number>;
  km_reading_difference: Record<string, number>;
  vehicle_downtime: Record<string, number>;
  average_completion_time: number;
  total_tasks: number;
  pending_tasks: number;
}

export interface MaintenancePart {
  id: string;
  name: string;
  part_number: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  status: 'required' | 'ordered' | 'received' | 'installed';
  supplier?: string;
  warranty_period?: string;
}

// Define maintenance items
export const MAINTENANCE_ITEMS = [
  { 
    id: 'eng1', 
    name: 'Engine Oil Change', 
    group: 'engine',
    standard_life_km: 5000,
    standard_life_days: 90,
    average_cost: 3000,
    warranty_period: 30
  },
  { 
    id: 'eng2', 
    name: 'Air Filter Replacement', 
    group: 'engine',
    standard_life_km: 15000,
    standard_life_days: 180,
    average_cost: 800,
    warranty_period: 90
  },
  { 
    id: 'brk1', 
    name: 'Brake Pad Replacement', 
    group: 'brakes',
    standard_life_km: 40000,
    standard_life_days: 365,
    average_cost: 2000,
    warranty_period: 180
  },
  { 
    id: 'tyr1', 
    name: 'Tyre Replacement', 
    group: 'tyres',
    standard_life_km: 60000,
    standard_life_days: 730,
    average_cost: 12000,
    warranty_period: 365
  },
  { 
    id: 'sus1', 
    name: 'Suspension Check & Service', 
    group: 'suspension',
    standard_life_km: 20000,
    standard_life_days: 180,
    average_cost: 1500,
    warranty_period: 90
  },
  { 
    id: 'ele1', 
    name: 'Battery Replacement', 
    group: 'electrical',
    standard_life_km: 0,
    standard_life_days: 730,
    average_cost: 5000,
    warranty_period: 365
  }
];

// Define maintenance groups
export const MAINTENANCE_GROUPS = {
  engine: {
    title: 'Engine Maintenance',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'engine')
  },
  transmission: {
    title: 'Transmission Service',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'transmission')
  },
  brakes: {
    title: 'Brake System',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'brakes')
  },
  electrical: {
    title: 'Electrical System',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'electrical')
  },
  suspension: {
    title: 'Suspension & Steering',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'suspension')
  },
  tyres: {
    title: 'Tyres & Wheels',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'tyres')
  },
  other: {
    title: 'Other Services',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'other')
  }
};

// Define demo vendors
export const DEMO_VENDORS = [
  {
    id: 'v1',
    name: 'AutoCare Services',
    contact: '+91 98765 43210',
    address: '123 Mechanic Street, Auto District, City',
    active: true
  },
  {
    id: 'v2',
    name: 'Premium Auto Workshop',
    contact: '+91 98765 43211',
    address: '456 Service Road, Workshop Area, City',
    active: true
  },
  {
    id: 'v3',
    name: 'Quick Fix Auto',
    contact: '+91 98765 43212',
    address: '789 Repair Lane, Service Block, City',
    active: true
  }
];

// Define demo garages
export const DEMO_GARAGES = [
  {
    id: 'g1',
    name: 'City Central Garage',
    contact: '+91 98765 43213',
    address: '321 Workshop Avenue, Central District, City',
    active: true
  },
  {
    id: 'g2',
    name: 'Highway Auto Service',
    contact: '+91 98765 43214',
    address: '654 Highway Road, Industrial Area, City',
    active: true
  },
  {
    id: 'g3',
    name: 'Express Repair Center',
    contact: '+91 98765 43215',
    address: '987 Service Street, Business Park, City',
    active: true
  }
];

// Define part brands
export const PART_BRANDS = [
  'Bosch',
  'Denso',
  'Continental',
  'ZF',
  'Valeo',
  'NGK',
  'Delphi',
  'Mahle',
  'Aisin',
  'Brembo',
  'ACDelco',
  'Schaeffler',
  'SKF',
  'Mann+Hummel',
  'Bridgestone',
  'Michelin',
  'Goodyear',
  'MRF',
  'Apollo',
  'CEAT'
];