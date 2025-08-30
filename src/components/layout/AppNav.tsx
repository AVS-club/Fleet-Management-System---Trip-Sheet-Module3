import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Plus } from 'lucide-react';
import { navLinks } from './navLinks';
import { cn } from '../../utils/cn';

const AppNav: React.FC = () => {
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Desktop Navigation - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-1 lg:gap-2">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
          
          return (
            <div
              key={to}
              className="relative"
              onMouseEnter={() => setHoveredItem(to)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <NavLink
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
              
              {/* Hover dropdown for Vehicles */}
              {to === '/vehicles' && hoveredItem === '/vehicles' && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                  <NavLink
                    to="/vehicles"
                    state={{ openAddForm: true }}
                    className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </NavLink>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        aria-label="Toggle mobile menu"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
              
              return (
                <div key={to}>
                  <NavLink
                    to={to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-base transition-colors",
                      isActive 
                        ? "bg-primary-100 text-primary-700 font-medium" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                    end={to === "/"}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                  
                  {/* Add Vehicle sub-option for mobile */}
                  {to === '/vehicles' && (
                    <NavLink
                      to="/vehicles"
                      state={{ openAddForm: true }}
                      className="flex items-center gap-3 px-6 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <span>Add Vehicle</span>
                    </NavLink>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AppNav;