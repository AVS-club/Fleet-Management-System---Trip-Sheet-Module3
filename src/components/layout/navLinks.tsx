import { 
  LayoutDashboard, 
  Truck, 
  Users2, 
  Route, 
  LineChart, 
  Wrench, 
  Bell, 
  ShieldCheck 
} from 'lucide-react';

export type NavLinkItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Lower number = higher priority (kept visible earlier). */
  priority?: number;
};

export const NAV_LINKS: NavLinkItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, priority: 1 },
  { to: '/vehicles', label: 'Vehicles', icon: Truck, priority: 2 },
  { to: '/drivers', label: 'Drivers', icon: Users2, priority: 3 },
  { to: '/trips', label: 'Trips', icon: Route, priority: 4 },
  { to: '/trip-pnl-reports', label: 'Trip P&L', icon: LineChart, priority: 5 },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, priority: 6 },
  { to: '/notifications', label: 'Notifications', icon: Bell, priority: 7 },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, priority: 8 },
];