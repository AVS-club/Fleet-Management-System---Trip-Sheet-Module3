export type UserRole = 'admin' | 'manager' | 'data_entry' | 'owner';

export interface Permissions {
  role: UserRole;
  organizationId: string | null;
  organizationName: string;
  canAccessDashboard: boolean;
  canAccessReports: boolean;
  canAccessAdmin: boolean;
  canAccessAlerts: boolean;
  canViewDriverInsights: boolean;
  canViewVehicleOverview: boolean;
  canViewRevenue: boolean;
}

export interface OrganizationUser {
  role: UserRole;
  organization_id: string;
  organizations: {
    name: string;
  } | null;
}
