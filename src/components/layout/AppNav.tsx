import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { navLinks } from './navLinks';
import { cn } from '../../utils/cn';
import { Plus } from 'lucide-react';

const AppNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  
  const handleQuickAdd = (path: string) => {
    navigate(`${path}?action=new`);
  };

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Navigation - Compact with quick add icons */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {navLinks.map(({ to, label, icon: Icon, hasQuickAdd }) => {
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
          
          return (
            <div key={to} className="flex items-center">
              {/* Quick Add Button for specific pages */}
              {hasQuickAdd && (
                <button
                  onClick={() => handleQuickAdd(to)}
                  className="p-1 sm:p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title={`Add new ${label.slice(0, -1)}`}
                >
                  <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
              )}
              
              <NavLink
                to={to}
                className={({ isActive: navIsActive }) =>
                  cn(
                    "group inline-flex items-center rounded-lg px-1.5 py-1.5 sm:px-2 sm:py-2 transition-colors",
                    "text-gray-600 hover:text-primary-700 hover:bg-primary-50",
                    (navIsActive || isActive) ? "bg-primary-100 text-primary-700 font-medium" : ""
                  )
                }
                title={label}
                end={to === "/"}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                {/* Show shortened labels on medium screens, full on large */}
                <span className="ml-1 hidden md:inline text-xs lg:text-sm">
                  {label.length > 8 ? label.slice(0, 5) : label}
                </span>
              </NavLink>
            </div>
          );
        })}
      </div>

      {/* Navigation is always visible with icons */}
    </nav>
  );
};

export default AppNav;