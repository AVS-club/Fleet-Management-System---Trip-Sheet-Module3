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

export type NavLink = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const navLinks: NavLink[] = [
  { to: '/vehicles',        label: 'Vehicles',      icon: Truck },
  { to: '/drivers',         label: 'Drivers',       icon: Users },
  { to: '/trips',           label: 'Trips',         icon: Route },
  { to: '/trip-pnl-reports', label: 'Trip P&L',     icon: BarChart3 },
  { to: '/maintenance',     label: 'Maintenance',   icon: Wrench },
  { to: '/notifications',   label: 'Notifications', icon: Bell },
  { to: '/admin',           label: 'Admin',         icon: ShieldCheck },
];