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
  registration_number: string;
  make: string;
  model: string;
  year: number;
  type: 'truck' | 'tempo' | 'trailer';
  fuel_type: 'diesel' | 'petrol' | 'cng';
  current_odometer: number;
  status: 'active' | 'maintenance' | 'inactive' | 'stood';
  chassis_number?: string;
  engine_number?: string;
  owner_name?: string;
  rc_copy?: boolean;
  insurance_document?: boolean;
  insurance_end_date?: string;
  fitness_document?: boolean;
  fitness_expiry_date?: string;
  permit_document?: boolean;
  permit_expiry_date?: string;
  puc_document?: boolean;
  puc_expiry_date?: string;
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
  total_road_expenses: number;
  short_trip: boolean;
  remarks?: string;
  calculated_kmpl?: number;
  route_deviation?: number;
  created_at: string;
  updated_at: string;
}

export interface TripFormData extends Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'trip_serial_number'> {
  fuel_bill_file?: File;
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
  created_at?: string;
  updated_at?: string;
}