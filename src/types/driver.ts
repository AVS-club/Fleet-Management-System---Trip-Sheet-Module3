export interface Driver {
  id?: string;
  name: string;
  license_number?: string;
  contact_number?: string; // matches database 'contact_number' column
  address?: string;
  date_of_birth?: string; // matches database 'date_of_birth' column
  date_of_joining?: string; // matches database 'date_of_joining' column
  license_expiry?: string; // matches database 'license_expiry' column
  medical_certificate_expiry?: string; // matches database 'medical_certificate_expiry' column
  aadhar_number?: string; // matches database 'aadhar_number' column
  status: "active" | "inactive" | "onLeave" | "suspended" | "blacklisted";
  experience_years: number;
  salary?: number; // matches database 'salary' column
  added_by?: string; // matches database 'added_by' column
  created_at?: string; // matches database 'created_at' column
  updated_at?: string; // matches database 'updated_at' column

  // Legacy fields for backward compatibility (not in database)
  phone?: string; // alias for contact_number
  join_date?: string; // alias for date_of_joining
  dob?: string; // alias for date_of_birth
  license_expiry_date?: string; // alias for license_expiry
  primary_vehicle_id?: string; // not in current schema but used in code
  driver_photo_url?: string; // not in current schema but used in code

  // Document URLs (stored in Supabase Storage) - not in current schema
  aadhar_doc_file?: File[]; // For frontend handling before upload
  license_doc_file?: File[];
  police_doc_file?: File[]; // For frontend handling before upload
  medical_doc_file?: File[]; // For frontend handling before upload
  medical_doc_url?: string[];
  license_doc_url?: string[];
  police_doc_url?: string[];
  license_issue_date?: string;
  documents_verified?: boolean; // Indicates if all required documents are verified
  driver_status_reason?: string;
  performance_metrics?: {
    total_trips: number;
    total_distance: number;
    average_mileage: number;
    breakdown_count: number;
    last_trip_gap: number;
    risk_score?: number;
  }; // AI-generated performance metrics
  state?: string; // State of residence
  valid_from?: string; // License valid from date
  blood_group?: string; // Driver's blood group
  notes?: string; // Internal notes about the driver
  rto?: string; // RTO name
  rto_code?: string; // RTO code
  father_or_husband_name?: string;
  email?: string;
  gender?: string;

  vehicle_class?: string[]; // Array of vehicle classes the driver is licensed for
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

export interface DriverSummary {
  id: string;
  name: string;
}
