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
};

export const navLinks: NavLink[] = [
  { to: '/',                label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/vehicles',        label: 'Vehicles',   icon: Truck,      hasQuickAdd: true },
  { to: '/drivers',         label: 'Drivers',    icon: Users,      hasQuickAdd: true },
  { to: '/trips',           label: 'Trips',      icon: Route,      hasQuickAdd: true },
  { to: '/trip-pnl-reports', label: 'P&L',       icon: BarChart3 },
  { to: '/maintenance',     label: 'Service',    icon: Wrench,     hasQuickAdd: true },
  { to: '/notifications',   label: 'Alerts',     icon: Bell },
  { to: '/admin',           label: 'Admin',      icon: ShieldCheck },
];