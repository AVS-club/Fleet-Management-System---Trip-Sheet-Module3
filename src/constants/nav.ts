import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  BarChart3,
  Wrench,
  Bell,
  ShieldCheck,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  ariaLabel?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard, ariaLabel: "Dashboard" },
  { to: "/vehicles", label: "Vehicles", Icon: Truck, ariaLabel: "Vehicles" },
  { to: "/drivers", label: "Drivers", Icon: Users, ariaLabel: "Drivers" },
  { to: "/trips", label: "Trips", Icon: Route, ariaLabel: "Trips" },
  { to: "/trip-pnl-reports", label: "Trip P&L", Icon: BarChart3, ariaLabel: "Trip P and L" },
  { to: "/maintenance", label: "Maintenance", Icon: Wrench, ariaLabel: "Maintenance" },
  { to: "/notifications", label: "Notifications", Icon: Bell, ariaLabel: "Notifications" },
  { to: "/admin", label: "Admin", Icon: ShieldCheck, ariaLabel: "Admin" },
];