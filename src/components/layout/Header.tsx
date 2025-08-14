import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from '../../utils/supabaseClient';
import ThemeToggle from "../ui/ThemeToggle";
import { toast } from 'react-toastify';

const linkBase =
  "px-3 py-2 rounded-md text-sm md:text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition whitespace-nowrap";
const linkActive =
  "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100";

function NavA({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${linkBase} ${isActive ? linkActive : "text-gray-600 dark:text-gray-300"}`
      }
    >
      {children}
    </NavLink>
  );
}

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
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
        <div className="h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <button
            onClick={() => navigate("/")}
            className="shrink-0 flex items-center gap-2"
            aria-label="Go to dashboard"
          >
            <span className="inline-block size-8 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <svg className="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </span>
            <div className="leading-tight text-left">
              <div className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">Auto Vital</div>
              <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 -mt-0.5">
                Intelligent Fleet Management
              </div>
            </div>
          </button>

          {/* Nav (kept simple, no "Trip P&L" tab here) */}
          <nav className="hidden md:flex items-center gap-1">
            <NavA to="/">Dashboard</NavA>
            <NavA to="/vehicles">Vehicles</NavA>
            <NavA to="/drivers">Drivers</NavA>
            <NavA to="/trips">Trips</NavA>
            <NavA to="/maintenance">Maintenance</NavA>
            <NavA to="/notifications">Notifications</NavA>
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;