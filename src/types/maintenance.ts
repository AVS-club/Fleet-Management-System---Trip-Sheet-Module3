import { Vehicle } from './index';

// Add audit log interfaces
interface MaintenanceAuditLogChange {
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

// Add service group interface
export interface MaintenanceServiceGroup {
  id?: string;
  maintenance_task_id?: string;
  vendor_id: string;
  tasks: string[];
  cost: number;
  bill_url?: string;
  bill_file?: File; // For frontend handling before upload
  created_at?: string;
  updated_at?: string;
  battery_tracking?: boolean;
  battery_serial?: string;
  battery_brand?: string;
  tyre_tracking?: boolean;
  tyre_positions?: string[];
  tyre_brand?: string;
  tyre_serials?: string;
  battery_data?: {
    serialNumber: string;
    brand: string;
  };
  tyre_data?: {
    positions: string[];
    brand: string;
    serialNumbers: string;
  };
  battery_warranty_file?: File;
  tyre_warranty_file?: File;
  battery_warranty_expiry_date?: string;
  tyre_warranty_expiry_date?: string;
}

// Add new interfaces for maintenance form
interface MaintenanceBill {
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
  task_type: 'general_scheduled_service' | 'wear_and_tear_replacement_repairs' | 'accidental' | 'others';
  title: string[];
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'rework';
  priority: 'low' | 'medium' | 'high' | 'critical';
  vendor_id?: string; // Optional vendor ID for backward compatibility
  garage_id?: string; // Making this optional as we'll use vendor_id from service groups
  estimated_cost: number;
  actual_cost?: number;
  bills: MaintenanceBill[];
  complaint_description?: string;
  resolution_summary?: string;
  warranty_expiry?: string;
  warranty_status?: 'valid' | 'expired' | 'not_applicable';
  warranty_claimed: boolean;
  part_details?: {
    name: string;
    serial_number: string;
    brand: string;
    warranty_expiry_date: string;
  };
  parts_required: MaintenancePart[];
  start_date: string;
  end_date?: string;
  downtime_period?: string; // Added for downtime period selection
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
  category?: string; // Added for task category
  service_groups?: MaintenanceServiceGroup[];
  created_at: string;
  updated_at: string;
}

interface MaintenanceType {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

interface MaintenanceComponent {
  id: string;
  name: string;
  description?: string;
  category?: string;
  active: boolean;
}

interface MaintenanceBrand {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

interface MaintenanceCompany {
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

interface MaintenancePart {
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

// Define maintenance categories
const MAINTENANCE_CATEGORIES = {
  engine: 'Engine & Oil',
  brakes: 'Brakes & Suspension',
  electrical: 'Electrical',
  tyres: 'Tyres',
  battery: 'Battery',
  transmission: 'Transmission & Clutch',
  cooling: 'Cooling & AC',
  body: 'Body & Cabin',
  fuel: 'Fuel & Exhaust',
  general: 'General Service & Others'
};

// Define maintenance items
export interface MaintenanceItem {
  id: string;
  name: string;
  group: string;
  standardLifeKm?: number;
  standardLifeDays?: number;
  averageCost?: number;
  warrantyPeriod?: number;
  inactive?: boolean;
}

export const MAINTENANCE_ITEMS: MaintenanceItem[] = [
  // Engine & Oil
  { 
    id: 'eng1', 
    name: 'Engine Oil Change', 
    group: 'engine',
    standardLifeKm: 5000,
    standardLifeDays: 90,
    averageCost: 3000,
    warrantyPeriod: 30
  },
  { 
    id: 'eng2', 
    name: 'Air Filter Replacement', 
    group: 'engine',
    standardLifeKm: 15000,
    standardLifeDays: 180,
    averageCost: 800,
    warrantyPeriod: 90
  },
  { 
    id: 'eng3', 
    name: 'Oil Filter Replacement', 
    group: 'engine',
    standardLifeKm: 5000,
    standardLifeDays: 90,
    averageCost: 500,
    warrantyPeriod: 30
  },
  { 
    id: 'eng4', 
    name: 'Fuel Filter Replacement', 
    group: 'engine',
    standardLifeKm: 20000,
    standardLifeDays: 180,
    averageCost: 1200,
    warrantyPeriod: 90
  },
  
  // Brakes & Suspension
  { 
    id: 'brk1', 
    name: 'Brake Pad Replacement', 
    group: 'brakes',
    standardLifeKm: 40000,
    standardLifeDays: 365,
    averageCost: 2000,
    warrantyPeriod: 180
  },
  { 
    id: 'brk2', 
    name: 'Brake Disc Replacement', 
    group: 'brakes',
    standardLifeKm: 80000,
    standardLifeDays: 730,
    averageCost: 4000,
    warrantyPeriod: 365
  },
  { 
    id: 'brk3', 
    name: 'Brake Fluid Change', 
    group: 'brakes',
    standardLifeKm: 40000,
    standardLifeDays: 730,
    averageCost: 1000,
    warrantyPeriod: 180
  },
  { 
    id: 'sus1', 
    name: 'Suspension Check & Service', 
    group: 'brakes',
    standardLifeKm: 20000,
    standardLifeDays: 180,
    averageCost: 1500,
    warrantyPeriod: 90
  },
  { 
    id: 'sus2', 
    name: 'Shock Absorber Replacement', 
    group: 'brakes',
    standardLifeKm: 80000,
    standardLifeDays: 1095,
    averageCost: 6000,
    warrantyPeriod: 365
  },
  
  // Tyres
  { 
    id: 'tyr1', 
    name: 'Tyre Replacement (Front Left)', 
    group: 'tyres',
    standardLifeKm: 60000,
    standardLifeDays: 730,
    averageCost: 3000,
    warrantyPeriod: 365
  },
  { 
    id: 'tyr2', 
    name: 'Tyre Replacement (Front Right)', 
    group: 'tyres',
    standardLifeKm: 60000,
    standardLifeDays: 730,
    averageCost: 3000,
    warrantyPeriod: 365
  },
  { 
    id: 'tyr3', 
    name: 'Tyre Replacement (Rear Left)', 
    group: 'tyres',
    standardLifeKm: 60000,
    standardLifeDays: 730,
    averageCost: 3000,
    warrantyPeriod: 365
  },
  { 
    id: 'tyr4', 
    name: 'Tyre Replacement (Rear Right)', 
    group: 'tyres',
    standardLifeKm: 60000,
    standardLifeDays: 730,
    averageCost: 3000,
    warrantyPeriod: 365
  },
  { 
    id: 'tyr5', 
    name: 'Tyre Rotation', 
    group: 'tyres',
    standardLifeKm: 10000,
    standardLifeDays: 180,
    averageCost: 500,
    warrantyPeriod: 30
  },
  { 
    id: 'tyr6', 
    name: 'Wheel Alignment', 
    group: 'tyres',
    standardLifeKm: 10000,
    standardLifeDays: 180,
    averageCost: 800,
    warrantyPeriod: 30
  },
  { 
    id: 'tyr7', 
    name: 'Puncture Repair', 
    group: 'tyres',
    standardLifeKm: 0,
    standardLifeDays: 0,
    averageCost: 200,
    warrantyPeriod: 30
  },
  { 
    id: 'tyr8', 
    name: 'Spare Tyre Mount', 
    group: 'tyres',
    standardLifeKm: 0,
    standardLifeDays: 0,
    averageCost: 300,
    warrantyPeriod: 30
  },
  
  // Battery
  { 
    id: 'ele1', 
    name: 'Battery Replacement', 
    group: 'battery',
    standardLifeKm: 0,
    standardLifeDays: 730,
    averageCost: 5000,
    warrantyPeriod: 365
  },
  { 
    id: 'ele2', 
    name: 'Battery Terminal Cleaning', 
    group: 'battery',
    standardLifeKm: 10000,
    standardLifeDays: 180,
    averageCost: 300,
    warrantyPeriod: 30
  },
  { 
    id: 'ele3', 
    name: 'Battery Voltage Check', 
    group: 'battery',
    standardLifeKm: 5000,
    standardLifeDays: 90,
    averageCost: 200,
    warrantyPeriod: 0
  },
  
  // Electrical
  { 
    id: 'ele4', 
    name: 'Alternator Replacement', 
    group: 'electrical',
    standardLifeKm: 100000,
    standardLifeDays: 1825,
    averageCost: 8000,
    warrantyPeriod: 365
  },
  { 
    id: 'ele5', 
    name: 'Starter Motor Replacement', 
    group: 'electrical',
    standardLifeKm: 100000,
    standardLifeDays: 1825,
    averageCost: 7000,
    warrantyPeriod: 365
  },
  { 
    id: 'ele6', 
    name: 'Headlight Bulb Replacement', 
    group: 'electrical',
    standardLifeKm: 0,
    standardLifeDays: 365,
    averageCost: 500,
    warrantyPeriod: 90
  },
  
  // Transmission & Clutch
  { 
    id: 'tra1', 
    name: 'Transmission Fluid Change', 
    group: 'transmission',
    standardLifeKm: 40000,
    standardLifeDays: 730,
    averageCost: 3000,
    warrantyPeriod: 180
  },
  { 
    id: 'tra2', 
    name: 'Clutch Replacement', 
    group: 'transmission',
    standardLifeKm: 80000,
    standardLifeDays: 1825,
    averageCost: 12000,
    warrantyPeriod: 365
  },
  { 
    id: 'tra3', 
    name: 'Gearbox Repair', 
    group: 'transmission',
    standardLifeKm: 100000,
    standardLifeDays: 1825,
    averageCost: 15000,
    warrantyPeriod: 365
  },
  
  // Cooling & AC
  { 
    id: 'cool1', 
    name: 'Coolant Replacement', 
    group: 'cooling',
    standardLifeKm: 40000,
    standardLifeDays: 730,
    averageCost: 1500,
    warrantyPeriod: 180
  },
  { 
    id: 'cool2', 
    name: 'Radiator Flush', 
    group: 'cooling',
    standardLifeKm: 40000,
    standardLifeDays: 730,
    averageCost: 2000,
    warrantyPeriod: 180
  },
  { 
    id: 'cool3', 
    name: 'AC Gas Refill', 
    group: 'cooling',
    standardLifeKm: 0,
    standardLifeDays: 365,
    averageCost: 2500,
    warrantyPeriod: 90
  },
  
  // Body & Cabin
  { 
    id: 'body1', 
    name: 'Windshield Replacement', 
    group: 'body',
    standardLifeKm: 0,
    standardLifeDays: 0,
    averageCost: 8000,
    warrantyPeriod: 365
  },
  { 
    id: 'body2', 
    name: 'Wiper Blade Replacement', 
    group: 'body',
    standardLifeKm: 0,
    standardLifeDays: 365,
    averageCost: 800,
    warrantyPeriod: 90
  },
  { 
    id: 'body3', 
    name: 'Body Repair', 
    group: 'body',
    standardLifeKm: 0,
    standardLifeDays: 0,
    averageCost: 10000,
    warrantyPeriod: 365
  },
  
  // Fuel & Exhaust
  { 
    id: 'fuel1', 
    name: 'Fuel Injector Cleaning', 
    group: 'fuel',
    standardLifeKm: 30000,
    standardLifeDays: 730,
    averageCost: 3000,
    warrantyPeriod: 180
  },
  { 
    id: 'fuel2', 
    name: 'Exhaust System Repair', 
    group: 'fuel',
    standardLifeKm: 80000,
    standardLifeDays: 1825,
    averageCost: 5000,
    warrantyPeriod: 365
  },
  { 
    id: 'fuel3', 
    name: 'Catalytic Converter Replacement', 
    group: 'fuel',
    standardLifeKm: 100000,
    standardLifeDays: 3650,
    averageCost: 12000,
    warrantyPeriod: 730
  },
  
  // General Service
  { 
    id: 'gen1', 
    name: 'Regular Service', 
    group: 'general',
    standardLifeKm: 5000,
    standardLifeDays: 90,
    averageCost: 3000,
    warrantyPeriod: 30
  },
  { 
    id: 'gen2', 
    name: 'Major Service', 
    group: 'general',
    standardLifeKm: 15000,
    standardLifeDays: 365,
    averageCost: 8000,
    warrantyPeriod: 90
  },
  { 
    id: 'gen3', 
    name: 'Other Maintenance', 
    group: 'general',
    standardLifeKm: 0,
    standardLifeDays: 0,
    averageCost: 2000,
    warrantyPeriod: 30
  }
];

// Define maintenance groups
export const MAINTENANCE_GROUPS = {
  engine: {
    title: 'Engine & Oil',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'engine')
  },
  brakes: {
    title: 'Brakes & Suspension',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'brakes')
  },
  electrical: {
    title: 'Electrical',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'electrical')
  },
  tyres: {
    title: 'Tyres',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'tyres')
  },
  battery: {
    title: 'Battery',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'battery')
  },
  transmission: {
    title: 'Transmission & Clutch',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'transmission')
  },
  cooling: {
    title: 'Cooling & AC',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'cooling')
  },
  body: {
    title: 'Body & Cabin',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'body')
  },
  fuel: {
    title: 'Fuel & Exhaust',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'fuel')
  },
  general: {
    title: 'General Service & Others',
    items: MAINTENANCE_ITEMS.filter(item => item.group === 'general')
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
    active: true,
    type: 'authorized'
  },
  {
    id: 'g2',
    name: 'Highway Auto Service',
    contact: '+91 98765 43214',
    address: '654 Highway Road, Industrial Area, City',
    active: true,
    type: 'independent'
  },
  {
    id: 'g3',
    name: 'Express Repair Center',
    contact: '+91 98765 43215',
    address: '987 Service Street, Business Park, City',
    active: true,
    type: 'company_owned'
  }
];

// Define part brands
const PART_BRANDS = [
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

// Define battery brands (India, Commercial Use)
export const BATTERY_BRANDS = [
  'Exide',
  'Amaron',
  'SF Sonic',
  'Tata Green',
  'Okaya',
  'Luminous',
  'HBL',
  'Base',
  'Amco',
  'Livguard',
  'PowerZone',
  'Su-Kam',
  'Prestolite',
  'Microtek',
  'Bosch'
];

// Define tyre brands (Commercial Segment)
export const TYRE_BRANDS = [
  'MRF',
  'Apollo',
  'CEAT',
  'JK Tyre',
  'Bridgestone',
  'Michelin',
  'Goodyear',
  'TVS Eurogrip',
  'Continental',
  'Yokohama',
  'BKT',
  'Dunlop',
  'Metro Tyres',
  'Pirelli',
  'Falken'
];