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
  driver_photo_url?: string; // URL for the driver's photo

  // Document URLs (stored in Supabase Storage)
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
  created_at?: string; // Timestamp of creation
  updated_at?: string; // Timestamp of last update
  license_expiry_date?: string; // Driver's license expiry date
  valid_from?: string; // License valid from date
  address?: string; // Driver's current address
  blood_group?: string; // Driver's blood group
  notes?: string; // Internal notes about the driver
  rto?: string; // RTO name
  rto_code?: string; // RTO code

  vehicle_class: string[]; // Array of vehicle classes the driver is licensed for
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
