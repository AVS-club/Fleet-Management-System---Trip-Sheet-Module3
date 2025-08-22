// Add RCDetails interface
interface RCDetails {
  registrationNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  make?: string;
  model?: string;
  yearOfManufacture?: string;
  color?: string;
  fuelType?: string;
  ownerName?: string;
  manufactureDate?: string;
  seatingCapacity?: number;
  wheelBase?: string;
  axleCount?: number;
  bodyType?: string;
  confidence: number;
  rawText?: string;
}

// Add InsuranceDetails interface
interface InsuranceDetails {
  policyNumber?: string;
  insurerName?: string;
  validFrom?: string;
  validUntil?: string;
  vehicleNumber?: string;
  coverage?: string;
  premium?: number;
  confidence?: number;
  rawText?: string;
}

// Add Vehicle interface
export interface Vehicle {
  id: string;
  registration_number: string; // Basic Information
  make: string;
  model: string;
  year: number;
  type: "truck" | "tempo" | "trailer" | "pickup" | "van";
  fuel_type: "diesel" | "petrol" | "cng" | "ev";
  current_odometer: number;
  status: "active" | "maintenance" | "inactive" | "stood" | "archived";
  chassis_number?: string;
  engine_number?: string;
  owner_name?: string;
  tyre_size?: string;
  number_of_tyres?: number;
  registration_date?: string;
  rc_expiry_date?: string;

  // Document files for upload
  rc_copy_file?: File[];
  insurance_document_file?: File[];
  fitness_document_file?: File[];
  tax_receipt_document_file?: File[];
  permit_document_file?: File[];
  puc_document_file?: File[];

  // Document paths for storage
  rc_document_url?: string[];
  insurance_document_url?: string[];
  fitness_document_url?: string[];
  tax_document_url?: string[];
  permit_document_url?: string[];
  puc_document_url?: string[];

  // Legacy boolean flags (for backward compatibility)
  rc_copy?: boolean;
  insurance_document?: boolean;
  fitness_document?: boolean;
  tax_receipt_document?: boolean;
  permit_document?: boolean;
  puc_document?: boolean;

  // Insurance Details
  policy_number?: string;
  insurer_name?: string;
  insurance_start_date?: string;
  insurance_expiry_date?: string;
  insurance_premium_amount?: number;
  insurance_idv?: number;

  // Fitness Certificate
  fitness_certificate_number?: string;
  fitness_issue_date?: string;
  fitness_expiry_date?: string;
  fitness_cost?: number;

  // Tax Details
  tax_receipt_number?: string;
  tax_amount?: number;
  tax_period?: "monthly" | "quarterly" | "half-yearly" | "yearly";
  tax_scope?: string;
  tax_paid_upto?: string; // New field for tax paid up to date

  // Permit Details
  permit_number?: string;
  issuing_state?: string;
  permit_type?: "national" | "state" | "contract" | "tourist";
  permit_issue_date?: string;
  permit_expiry_date?: string;
  permit_cost?: number;
  permit_issuing_state?: string;

  // PUC Details
  puc_certificate_number?: string;
  puc_issue_date?: string;
  puc_expiry_date?: string;
  puc_cost?: number;

  // Other Documents
  other_documents?: Array<{
    id?: string;
    name: string;
    file_path?: string;
    file?: string;
    file_obj?: File;
    issue_date?: string;
    expiry_date?: string;
    cost?: number;
  }>;

  // Reminder fields for Insurance
  remind_insurance?: boolean;
  insurance_reminder_contact_id?: string;
  insurance_reminder_days_before?: number;

  // Reminder fields for Fitness
  remind_fitness?: boolean;
  fitness_reminder_contact_id?: string;
  fitness_reminder_days_before?: number;

  // Reminder fields for PUC
  remind_puc?: boolean;
  puc_reminder_contact_id?: string;
  puc_reminder_days_before?: number;

  // Reminder fields for Tax
  remind_tax?: boolean;
  tax_reminder_contact_id?: string;
  tax_reminder_days_before?: number;

  // Reminder fields for Permit
  remind_permit?: boolean;
  permit_reminder_contact_id?: string;
  permit_reminder_days_before?: number;

  // Reminder fields for Service
  remind_service?: boolean;
  service_reminder_contact_id?: string;
  service_reminder_days_before?: number;
  service_reminder_km?: number;

  // Service interval configuration
  service_interval_km?: number;
  service_interval_days?: number;

  // Vehicle photo
  photo_url?: string;

  // Other Information & Documents (VAHAN data)
  financer?: string;
  vehicle_class?: string;
  color?: string;
  cubic_capacity?: number;
  cylinders?: number;
  unladen_weight?: number;
  seating_capacity?: number;
  emission_norms?: string;
  noc_details?: string;
  national_permit_number?: string;
  national_permit_upto?: string;
  rc_status?: string;
  vahan_last_fetched_at?: string;
  other_info_documents?: File[] | string[];

  created_at?: string;
  updated_at?: string;
  primary_driver_id?: string;
}

// Add Driver interface
export interface Driver {
  id?: string;
  name: string;
  license_number: string;
  dob: string;
  father_or_husband_name: string;
  contact_number: string;
  email: string;
  join_date: string;
  gender: string;
  status: "active" | "inactive" | "onLeave" | "suspended" | "blacklisted";
  experience_years: number;
  primary_vehicle_id?: string;
  photo?: string | File | null;
  driver_photo_url?: string;
  driver_photo_path?: string;

  aadhar_doc_url?: string[];
  license_document?: File[];
  police_document?: File[];
  medical_document?: File[];
  aadhar_doc_file?: File[];
  medical_doc_url?: string[];
  license_document_path?: string;
  license_expiry_date?: string;
  license_issue_date?: string;
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
  state?: string;
  created_at?: string;
  updated_at?: string;
  valid_from?: string;
  address?: string;
  blood_group?: string;
  notes?: string;
  rto?: string;
  rto_code?: string;

  vehicle_class: string[];
  other_documents?: Array<{
    id?: string;
    name: string;
    file_path?: string;
    file?: string;
    file_obj?: File;
    issue_date?: string;
    expiry_date?: string;
    cost?: number;
  }>;
}

// Add AIAlert interface
export interface AIAlert {
  id: string;
  alert_type:
    | "license_expiry"
    | "driver_fatigue"
    | "driver_breakdown_anomaly"
    | "route_deviation"
    | "fuel_anomaly";
  severity: "high" | "medium" | "low";
  status: "pending" | "accepted" | "denied" | "ignored";
  title: string;
  description: string;
  affected_entity: {
    type: "driver" | "vehicle" | "trip";
    id: string;
  };
  metadata?: {
    expected_value?: number;
    actual_value?: number;
    deviation?: number;
    recommendations?: string[];
    ignore_duration?: "week" | "permanent";
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
  miscellaneous_expense?: number;
  total_road_expenses: number;
  short_trip: boolean;
  remarks?: string;
  calculated_kmpl?: number;
  route_deviation?: number;
  fuel_bill_url?: string;
  material_type_ids?: string[];
  is_return_trip?: boolean;
  advance_amount?: number; // New field for advance amount
  created_at: string;
  updated_at: string;

  // P&L fields
  freight_rate?: number;
  billing_type?: "per_km" | "per_ton" | "manual";
  income_amount?: number;
  total_expense?: number;
  net_profit?: number;
  cost_per_km?: number;
  profit_status?: "profit" | "loss" | "neutral";
}

export interface TripFormData
  extends Omit<
    Trip,
    "id" | "created_at" | "updated_at" | "trip_serial_number"
  > {
  fuel_bill_file?: File[];
  is_return_trip?: boolean;
  alert_accepted?: boolean;
  alert_notes?: string;
  breakdown_expense?: number;
  miscellaneous_expense?: number;
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
  severity: "high" | "medium" | "low";
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
  type: "district" | "city" | "town" | "village";
  state: "chhattisgarh" | "odisha";
  active?: boolean;
  place_id?: string; // Google Places unique identifier for the location
  formatted_address?: string; // Full formatted address from Google Places API
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
