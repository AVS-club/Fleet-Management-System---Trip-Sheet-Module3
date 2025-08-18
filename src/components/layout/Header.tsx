import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from '../../utils/supabaseClient';
import ThemeToggle from "../ui/ThemeToggle";
import { toast } from 'react-toastify';

const NAV_ITEMS = [
  { label: "Dashboard",     to: "/" },
  { label: "Vehicles",      to: "/vehicles" },
  { label: "Drivers",       to: "/drivers" },
  { label: "Trips",         to: "/trips" },
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
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-gray-200 dark:border-gray-700 dark:bg-gray-900/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2 font-semibold leading-none">
          <span className="inline-block rounded bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-0.5 text-xs">AVS</span>
          <span className="text-base text-gray-900 dark:text-gray-100">Auto Vital</span>
        </NavLink>

        {/* Nav */}
        <nav className="ml-6 flex flex-1 items-center gap-4 text-sm">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `inline-flex items-center h-9 px-2 rounded-md transition text-gray-600 dark:text-gray-300
                 ${isActive ? "bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100" : "hover:bg-gray-50 dark:hover:bg-gray-700"}`
              }
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="inline-flex h-9 items-center rounded-md border border-gray-200 dark:border-gray-600 px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;