import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { supabase } from '../../utils/supabaseClient';
import ThemeToggle from "../ui/ThemeToggle";
import { toast } from 'react-toastify';
import { cn } from '../../utils/cn';

const NAV_ITEMS = [
  { label: "Dashboard",     to: "/" },
  { label: "Vehicles",      to: "/vehicles" },
  { label: "Drivers",       to: "/drivers" },
  { label: "Trips",         to: "/trips" },
  { label: "Trip P&L",      to: "/trip-pnl-reports" },
  { label: "Maintenance",   to: "/maintenance" },
  { label: "Notifications", to: "/notifications" },
  { label: "Admin",         to: "/admin" },
];

const Header: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('user');
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200 dark:border-gray-700 dark:bg-gray-900/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/assets/logo.png" alt="AVS" className="h-7 w-auto" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
          <span className="font-semibold text-gray-900 dark:text-gray-100">Auto Vital</span>
        </Link>

        {/* Nav */}
        <nav className="flex flex-1 items-center justify-center gap-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition",
                isActive 
                  ? "text-primary-700 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400" 
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;