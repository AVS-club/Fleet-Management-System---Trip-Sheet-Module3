import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../../utils/supabaseClient';
import ThemeToggle from "../ui/ThemeToggle";
import AppNav from "./AppNav";
import { toast } from 'react-toastify';

// Optional: replace with your actual logo import if you have a file asset
const LogoMark: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`rounded-full bg-primary-600 text-white grid place-items-center ${className}`}
    aria-hidden="true"
  >
    {/* simple mark; swap with <img src=... alt="" /> if you have a logo file */}
    <span className="font-bold">A</span>
  </div>
);

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
        {/* Brand (responsive collapse: Full → AVS → icon) */}
        <button
          className="flex items-center gap-2 hover:opacity-90 focus:outline-none"
          onClick={() => navigate("/")}
          aria-label="Go to Dashboard"
          title="Auto Vital Solution"
        >
          <img src="/assets/logo.png" alt="AVS" className="h-7 w-auto" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
          {/* Full name on xl+ */}
          <span className="hidden xl:inline text-gray-900 dark:text-gray-100 font-semibold whitespace-nowrap">
            Auto Vital Solution
          </span>
          {/* AVS between md and xl */}
          <span className="hidden md:inline xl:hidden text-gray-900 dark:text-gray-100 font-semibold">
            AVS
          </span>
          {/* On very small screens, only the logo shows */}
        </button>

        {/* Primary Nav (icons always; labels hide on small screens) */}
        <div className="min-w-0 flex-1 flex justify-center">
          <AppNav />
        </div>

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