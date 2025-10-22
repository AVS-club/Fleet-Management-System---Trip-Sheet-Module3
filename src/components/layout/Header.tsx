import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabaseClient';
import ThemeToggle from "../ui/ThemeToggle";
import OrganizationSelector from "../ui/OrganizationSelector";
import MobileOrganizationSelector from "../ui/MobileOrganizationSelector";
import AppNav from "./AppNav";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { toast } from 'react-toastify';
import { usePermissions } from '../../hooks/usePermissions';
import { LogOut, Truck } from 'lucide-react';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Header');

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { permissions, loading } = usePermissions();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('user');
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      logger.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 border-b border-gray-200/50 dark:border-gray-700/50 dark:bg-gray-900/95 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Section */}
          <button
            className="group flex items-center space-x-3 hover:opacity-80 transition-all duration-200 ml-12 lg:ml-0"
            onClick={() => navigate("/")}
            aria-label="Go to Dashboard"
            title="Auto Vital Solution - Dashboard"
          >
            {/* Logo with enhanced visual prominence */}
            <div className="relative flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 bg-white rounded-lg shadow-lg border-2 border-primary-200 dark:border-primary-700 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-2 ring-primary-100 dark:ring-primary-800 overflow-hidden">
              {/* Background halo effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary-400/10 to-primary-600/10 group-hover:from-primary-400/20 group-hover:to-primary-600/20 transition-all duration-300"></div>
              <div className="absolute inset-[2px] rounded-[inherit] bg-white dark:bg-gray-900/95"></div>

              <div className="relative z-20 flex h-full w-full items-center justify-center rounded-[inherit]">
                <img 
                  src="/assets/AVS-LOGO-512x512-new.png"
                  alt="Auto Vital Solution - Dashboard" 
                  className="h-10 w-10 sm:h-11 sm:w-11 object-contain p-0.5 filter drop-shadow-sm"
                  onError={(e) => {
                    // Fallback if logo doesn't load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <Truck className="hidden h-7 w-7 text-primary-600" />
              </div>
            </div>
            
            {/* Hide brand text on mobile completely */}
            <div className="hidden lg:flex flex-col justify-center items-center">
              <div className="flex items-baseline gap-2">
                <h1 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                  Auto Vital
                </h1>
                <span className="text-base lg:text-lg font-semibold text-primary-600 dark:text-primary-400">
                  Solution
                </span>
              </div>
              <p className="text-[11px] lg:text-xs text-gray-500 dark:text-gray-400 -mt-0.5 tracking-wide uppercase text-center">
                Intelligent Fleet Management
              </p>
            </div>
          </button>

          {/* Navigation - Always visible, centered */}
          <nav className="flex flex-1 justify-center px-2 sm:px-4 md:px-6">
            <AppNav />
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Organization Selector - Desktop */}
            <div className="hidden md:block">
              <OrganizationSelector size="sm" showLabel={false} />
            </div>
            
            {/* Language Switcher */}
            <LanguageSwitcher />
            
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
                <span className="hidden sm:inline">{t('settings.logout')}</span>
              </button>
            </div>

            {/* Mobile Logout - Icon only */}
            <button
              onClick={handleLogout}
              className="flex sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={t('settings.logout')}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Organization Selector - Below main header */}
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-2">
          <MobileOrganizationSelector />
        </div>

      </div>
    </header>
  );
};

export default Header;