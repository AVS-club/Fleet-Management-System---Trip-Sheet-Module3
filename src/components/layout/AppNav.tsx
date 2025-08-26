import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { navLinks } from './navLinks';
import { cn } from '../../utils/cn';

const AppNav: React.FC = () => {
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Desktop Navigation - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-1 lg:gap-2">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
          
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive: navIsActive }) => 
                cn(
                  "group inline-flex items-center rounded-lg px-2.5 py-2 lg:px-3 transition-colors",
                  "text-gray-600 hover:text-primary-700 hover:bg-primary-50",
                  (navIsActive || isActive) ? "bg-primary-100 text-primary-700 font-medium" : ""
                )
              }
              title={label}
              end={to === "/"}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {/* Show labels on larger screens */}
              <span className="ml-2 hidden lg:inline">{label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg md:hidden">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
              
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-base transition-colors",
                    isActive 
                      ? "bg-light-green-bg text-dark-teal-text font-medium" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                  end={to === "/"}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AppNav;