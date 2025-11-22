export interface Refueling {
  id?: string;
  location: string;
  fuel_quantity: number;
  fuel_rate_per_liter: number;
  total_fuel_cost: number;
  fuel_bill_url?: string;
}

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

export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  warehouse_id: string;
  trip_serial_number?: string;
  manual_trip_id?: string;
  destinations: string[];
  destination_names?: string[]; // Store destination names for direct display
  destination_display?: string; // Single string for display like "Raipur → Bacheli"
  trip_start_date: string;
  trip_end_date: string;
  start_km: number;
  end_km: number;
  gross_weight: number;
  refueling_done: boolean;
  refuelings?: Refueling[];
  fuel_quantity?: number;
  fuel_cost?: number;
  fuel_rate_per_liter?: number;
  total_fuel_cost?: number;
  unloading_expense?: number;
  driver_expense?: number;
  road_rto_expense?: number;
  toll_expense?: number;
  breakdown_expense?: number;
  miscellaneous_expense?: number;
  total_road_expenses: number;
  remarks?: string;
  calculated_kmpl?: number;
  route_deviation?: number;
  fuel_bill_url?: string;
  is_return_trip?: boolean;
  advance_amount?: number; // New field for advance amount
  created_at: string;
  updated_at: string;

  // P&L fields
  freight_rate?: number;
  billing_type?: "per_km" | "per_ton" | "per_trip" | "per_unit" | "manual";
  income_amount?: number;
  total_expense?: number;
  net_profit?: number;
  cost_per_km?: number;
  profit_status?: "profit" | "loss" | "neutral";

  // Expense verification fields
  expense_verified?: boolean;
  expense_verified_by?: string;
  expense_verified_at?: string;
}

export interface TripFormData extends Omit<
  Trip,
  "id" | "created_at" | "updated_at" | "trip_serial_number" | "manual_trip_id"
> {
  id?: string; // Allow id for editing
  trip_serial_number?: string; // Allow trip serial number for form
  material_type_ids?: string[]; // Material type IDs
  gps_screenshots?: any[]; // GPS screenshots array
  trip_start_time?: string; // Trip start time
  trip_end_time?: string; // Trip end time
  trip_duration?: number; // Trip duration in hours
  is_return_trip?: boolean;
  alert_accepted?: boolean;
  alert_notes?: string;
  toll_expense?: number;
  breakdown_expense?: number; // Keep for backward compatibility
  miscellaneous_expense?: number;
  refuelings?: Refueling[]; // Multiple refuelings support
  fuel_bill_file?: File[]; // File upload for fuel bill
}

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

export interface Alert {
  type: string;
  message: string;
  severity: "high" | "medium" | "low";
  details?: string;
}

export interface Destination {
  id: string;
  name: string;
  place_name?: string; // Human-readable place name from Google Places API
  latitude: number | null;
  longitude: number | null;
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
