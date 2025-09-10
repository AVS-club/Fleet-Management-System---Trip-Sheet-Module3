import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '../../utils/supabaseClient';
import ThemeToggle from "../ui/ThemeToggle";
import AppNav from "./AppNav";
import { toast } from 'react-toastify';
import { LogOut, Truck } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 border-b border-gray-200/50 dark:border-gray-700/50 dark:bg-gray-900/95 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Section */}
          <button
            className="flex items-center gap-2 sm:gap-3 group transition-all duration-200"
            onClick={() => navigate("/")}
            aria-label="Go to Dashboard"
            title="Auto Vital Solution - Fleet Management System"
          >
            {/* Logo with white background */}
            <div className="relative flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 bg-white rounded-lg shadow-md border border-gray-200 dark:border-gray-700 group-hover:shadow-lg transition-all duration-200">
              <img 
                src="/assets/AVS-LOGO-512x512-new.png"
                alt="Auto Vital Solution" 
                className="h-10 w-10 sm:h-11 sm:w-11 object-contain p-0.5"
                onError={(e) => {
                  // Fallback if logo doesn't load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Truck className="hidden h-7 w-7 text-primary-600" />
            </div>
            
            {/* Brand Text - Show only on larger screens since logo has text */}
            <div className="hidden md:flex flex-col justify-center">
              <div className="flex items-baseline gap-2">
                <h1 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                  Auto Vital
                </h1>
                <span className="text-base lg:text-lg font-semibold text-primary-600 dark:text-primary-400">
                  Solution
                </span>
              </div>
              <p className="text-[11px] lg:text-xs text-gray-500 dark:text-gray-400 -mt-0.5 tracking-wide uppercase">
                Intelligent Fleet Management
              </p>
            </div>
          </button>

          {/* Navigation - Center */}
          <nav className="hidden md:flex flex-1 justify-center px-6">
            <AppNav />
          </nav>

          {/* Mobile Navigation Toggle (if needed) */}
          <div className="flex md:hidden">
            <button
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Open navigation"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* User Menu Dropdown (optional enhancement) */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="group inline-flex h-9 items-center gap-2 rounded-brand border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 group-hover:text-error-500 transition-colors" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

            {/* Mobile Logout - Icon only */}
            <button
              onClick={handleLogout}
              className="flex sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu (can be expanded) */}
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-2">
          <AppNav />
        </div>
      </div>
    </header>
  );
};

export default Header;