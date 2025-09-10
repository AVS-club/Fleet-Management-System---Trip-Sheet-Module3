import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navLinks } from './navLinks';
import { cn } from '../../utils/cn';

const AppNav: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Navigation - Always visible with responsive sizing */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
          
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive: navIsActive }) =>
                cn(
                  "group inline-flex items-center rounded-lg px-1.5 py-1.5 sm:px-2 sm:py-2 lg:px-3 transition-colors",
                  "text-gray-600 hover:text-primary-700 hover:bg-primary-50",
                  (navIsActive || isActive) ? "bg-primary-100 text-primary-700 font-medium" : ""
                )
              }
              title={label}
              end={to === "/"}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              {/* Show labels on larger screens */}
              <span className="ml-1.5 hidden lg:inline">{label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* No mobile menu needed - icons always visible */}
    </nav>
  );
};

export default AppNav;