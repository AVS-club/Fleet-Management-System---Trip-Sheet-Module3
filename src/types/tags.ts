export interface Tag {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
  description?: string;
  organization_id: string;
  created_by?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  vehicle_count?: number; // Populated when fetching with counts
}

export interface VehicleTag {
  id: string;
  vehicle_id: string;
  tag_id: string;
  organization_id: string;
  added_by?: string;
  created_at: string;
}

export interface VehicleWithTags {
  id: string;
  registration_number: string;
  make?: string;
  model?: string;
  type?: string;
  tags: Tag[];
}

export interface TagFormData {
  name: string;
  description?: string;
  color_hex: string;
}

export interface TagHistory {
  id: string;
  vehicle_id: string;
  tag_id: string;
  action: 'added' | 'removed';
  changed_by?: string;
  changed_at: string;
  change_reason?: string;
}
