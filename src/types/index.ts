// Add RCDetails interface
export interface RCDetails {
  registration_number?: string;
  chassis_number?: string;
  engine_number?: string;
  make?: string;
  model?: string;
  year_of_manufacture?: string;
  color?: string;
  unladen_weight?: string;
  horse_power?: string;
  confidence: number;
  raw_text?: string;
}

// Add InsuranceDetails interface
export interface InsuranceDetails {
  policy_number?: string;
  insurer_name?: string;
  valid_from?: string;
  valid_until?: string;
  vehicle_number?: string;
  coverage?: string;
  premium?: number;
  confidence?: number;
  raw_text?: string;
}

// Add Vehicle interface
export interface Vehicle {
  id: string;
  registration_number: string;  // Basic Information
  make: string;
  model: string;
  year: number;
  type: 'truck' | 'tempo' | 'trailer' | 'pickup' | 'van';
  fuel_type: 'diesel' | 'petrol' | 'cng' | 'ev';
  current_odometer: number;
  status: 'active' | 'maintenance' | 'inactive' | 'stood';
  chassis_number?: string;
  engine_number?: string;
  owner_name?: string;
  tyre_size?: string;
  number_of_tyres?: number;
  registration_date?: string;
  rc_expiry_date?: string;
  rc_copy?: boolean | File;
  
  // Insurance Details
  policy_number?: string;
  insurer_name?: string;
  insurance_start_date?: string;
  insurance_end_date?: string;
  insurance_premium_amount?: number;
  insurance_document?: boolean | File;
  
  // Fitness Certificate
  fitness_certificate_number?: string;
  fitness_issue_date?: string;
  fitness_expiry_date?: string;
  fitness_cost?: number;
  fitness_document?: boolean | File;
  
  // Tax Details
  tax_receipt_number?: string;
  tax_amount?: number;
  tax_period?: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  tax_receipt_document?: boolean | File;
  
  // Permit Details
  permit_number?: string;
  issuing_state?: string;
  permit_type?: 'national' | 'state' | 'contract' | 'tourist';
  permit_issue_date?: string;
  permit_expiry_date?: string;
  permit_cost?: number;
  permit_document?: boolean | File;
  
  // PUC Details
  puc_certificate_number?: string;
  puc_issue_date?: string;
  puc_expiry_date?: string;
  puc_cost?: number;
  puc_document?: boolean | File;
  
  // Other Documents
  other_documents?: Array<{
    name: string;
    file?: File;
    issue_date?: string;
    expiry_date?: string;
    cost?: number;
  }>;
  
  created_at?: string;
  updated_at?: string;
}

// Add Driver interface
export interface Driver {
  id: string;
  name: string;
  license_number: string;
  contact_number: string;
  email: string;
  join_date: string;
  status: 'active' | 'inactive' | 'onLeave' | 'suspended' | 'blacklisted';
  experience: number;
  primary_vehicle_id?: string;
  photo?: string;
  license_document?: string;
  license_expiry_date?: string;
  documents_verified?: boolean;
  driver_status_reason?: string;
  performance_metrics?: {
    total_trips: number;
    total_distance: number;
    average_mileage: number;
    breakdown_count: number;
    last_trip_gap: number;
    risk_score?: number;
  };
  created_at?: string;
  updated_at?: string;
}

// Add AIAlert interface
export interface AIAlert {
  id: string;
  alert_type: 'license_expiry' | 'driver_fatigue' | 'driver_breakdown_anomaly' | 'route_deviation' | 'fuel_anomaly';
  severity: 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'denied' | 'ignored';
  title: string;
  description: string;
  affected_entity: {
    type: 'driver' | 'vehicle' | 'trip';
    id: string;
  };
  metadata?: {
    expected_value?: number;
    actual_value?: number;
    deviation?: number;
    recommendations?: string[];
    ignore_duration?: 'week' | 'permanent';
    action_reason?: string;
  };
  created_at: string;
  updated_at: string;
}

// Add Trip interface
export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  warehouse_id: string;
  destinations: string[];
  trip_start_date: string;
  trip_end_date: string;
  trip_duration: number;
  trip_serial_number: string;
  manual_trip_id: boolean;
  start_km: number;
  end_km: number;
  gross_weight: number;
  station?: string;
  refueling_done: boolean;
  fuel_quantity?: number;
  fuel_cost?: number;
  total_fuel_cost?: number;
  unloading_expense: number;
  driver_expense: number;
  road_rto_expense: number;
  breakdown_expense: number;
  miscellaneous_expense?: number;
  total_road_expenses: number;
  short_trip: boolean;
  remarks?: string;
  calculated_kmpl?: number;
  route_deviation?: number;
  fuel_bill_url?: string;
  material_type_ids?: string[];
  is_return_trip?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripFormData extends Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'trip_serial_number'> {
  fuel_bill_file?: File;
  is_return_trip?: boolean;
  alert_accepted?: boolean;
  alert_notes?: string;
}

// Add RouteAnalysis interface
export interface RouteAnalysis {
  total_distance: number;
  standard_distance: number;
  deviation: number;
  estimated_time: string;
  waypoints: Array<{
    lat: number;
    lng: number;
  }>;
}

// Add Alert interface
export interface Alert {
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  details?: string;
}

export interface Destination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  standard_distance: number;
  estimated_time: string;
  historical_deviation: number;
  type: 'district' | 'city' | 'town' | 'village';
  state: 'chhattisgarh' | 'odisha';
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  active?: boolean;
  allocated_vehicles?: string[];
  material_type_id?: string;
  material_type_ids?: string[];
  created_at?: string;
  updated_at?: string;
}