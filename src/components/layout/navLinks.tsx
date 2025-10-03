import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Route, 
  BarChart3, 
  Wrench, 
  Bell, 
  ShieldCheck
} from 'lucide-react';

type NavLink = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hasQuickAdd?: boolean;
  requiresPermission?: string;
};

// Note: Labels will be translated in the components that use these links
export const navLinks: NavLink[] = [
  { to: '/',                label: 'navigation.dashboard',  icon: LayoutDashboard, requiresPermission: 'canAccessDashboard' },
  { to: '/vehicles',        label: 'navigation.vehicles',   icon: Truck,      hasQuickAdd: true },
  { to: '/drivers',         label: 'navigation.drivers',    icon: Users,      hasQuickAdd: true },
  { to: '/trips',           label: 'navigation.trips',      icon: Route,      hasQuickAdd: true },
  { to: '/trip-pnl-reports', label: 'navigation.reports',       icon: BarChart3, requiresPermission: 'canAccessReports' },
  { to: '/maintenance',     label: 'navigation.maintenance',    icon: Wrench,     hasQuickAdd: true },
  { to: '/notifications',   label: 'navigation.alerts',     icon: Bell, requiresPermission: 'canAccessAlerts' },
  { to: '/admin',           label: 'navigation.settings',      icon: ShieldCheck, requiresPermission: 'canAccessAdmin' },
];