import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Route, 
  BarChart3, 
  Wrench, 
  Bell, 
  ShieldCheck,
  Settings
} from 'lucide-react';
import AvsAiButton from '../ui/AvsAiButton';

type NavLink = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  customComponent?: React.ComponentType<any>; // Add support for custom components
  hasQuickAdd?: boolean;
  requiresPermission?: string;
  mobileVisible?: boolean; // Add this property
};

// Desktop navigation includes all items
export const navLinks: NavLink[] = [
  { to: '/', label: 'navigation.dashboard', icon: LayoutDashboard, requiresPermission: 'canAccessDashboard', mobileVisible: false }, // Hide on mobile
  { to: '/vehicles', label: 'navigation.vehicles', icon: Truck, hasQuickAdd: true, mobileVisible: true },
  { to: '/drivers', label: 'navigation.drivers', icon: Users, hasQuickAdd: true, mobileVisible: true },
  { to: '/trips', label: 'navigation.trips', icon: Route, hasQuickAdd: true, mobileVisible: true },
  { to: '/trip-pnl-reports', label: 'navigation.reports', icon: BarChart3, requiresPermission: 'canAccessReports', mobileVisible: true },
  { to: '/maintenance', label: 'navigation.maintenance', icon: Wrench, hasQuickAdd: true, mobileVisible: true },
  { to: '/notifications', label: 'navigation.alerts', icon: Bell, customComponent: AvsAiButton, requiresPermission: 'canAccessAlerts', mobileVisible: true },
  { to: '/admin', label: 'navigation.settings', icon: ShieldCheck, requiresPermission: 'canAccessAdmin', mobileVisible: false }, // Move to hamburger
];

// Helper function to get mobile navigation
export const getMobileNavLinks = () => navLinks.filter(link => link.mobileVisible !== false);
export const getHamburgerNavLinks = () => navLinks.filter(link => link.mobileVisible === false);