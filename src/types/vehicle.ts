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
  registration_date?: string;
  tyre_size?: string;
  number_of_tyres?: number;
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
  tax_scope?: string;
  tax_amount?: number;
  tax_period?: "monthly" | "quarterly" | "half-yearly" | "yearly";
  tax_document_url?: string[];
  tax_paid_upto?: string; // New field for tax paid up to date

  // Permit Details
  permit_number?: string;
  permit_issuing_state?: string;
  issuing_state?: string;
  permit_type?: "national" | "state" | "contract" | "tourist";
  permit_issue_date?: string;
  permit_expiry_date?: string;
  permit_cost?: number;

  // PUC Details
  puc_certificate_number?: string;
  puc_issue_date?: string;
  puc_expiry_date?: string;
  puc_cost?: number;

  // Other Documents
  other_documents?: Array<{
    id?: string;
    file_path?: string;
    file?: string;
    file_obj?: File;
    name?: string;
    issue_date?: string;
    expiry_date?: string;
    cost?: number;
  }>;
  other_info_documents?: string[];

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
  financer?: string;

  created_at?: string;
  updated_at?: string;
  primary_driver_id?: string;
}
