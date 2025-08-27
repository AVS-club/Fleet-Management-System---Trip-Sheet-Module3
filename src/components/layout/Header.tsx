import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../../utils/supabaseClient';
import ThemeToggle from "../ui/ThemeToggle";
import AppNav from "./AppNav";
import { toast } from 'react-toastify';

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
        <button
          className="flex items-center gap-2 hover:opacity-90 focus:outline-none shrink-0"
          onClick={() => navigate("/")}
          aria-label="Go to Dashboard"
          title="Auto Vital Solution"
        >
          <img 
            src="/assets/logo.png" 
            alt="Auto Vital Solution" 
            className="h-8 w-auto" 
            onError={(e) => {
              // Fallback to Pexels image if local logo fails
              (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg?auto=compress&cs=tinysrgb&w=64&h=64&fit=crop';
            }} 
          />
          <span className="hidden sm:inline text-gray-900 dark:text-gray-100 font-semibold whitespace-nowrap">
            Auto Vital Solution
          </span>
        </button>

        {/* Navigation */}
        <div className="flex-1 flex justify-center">
          <AppNav />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="inline-flex h-9 items-center rounded-md border border-gray-200 dark:border-gray-600 px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;