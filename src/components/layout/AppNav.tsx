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
      {/* Navigation - Ultra compact for mobile visibility */}
      <div className="flex items-center gap-0 sm:gap-0.5 md:gap-1">
        {navLinks.map(({ to, label, icon: Icon, hasQuickAdd }) => {
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
          
          return (
            <div key={to} className="flex items-center">
              {/* Quick Add Button integrated smaller */}
              {hasQuickAdd && (
                <button
                  onClick={() => handleQuickAdd(to)}
                  className="p-0.5 sm:p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title={`Add new ${label.slice(0, -1)}`}
                >
                  <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </button>
              )}
              
              <NavLink
                to={to}
                className={({ isActive: navIsActive }) =>
                  cn(
                    "group inline-flex items-center rounded-lg px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 transition-colors",
                    "text-gray-600 hover:text-primary-700 hover:bg-primary-50",
                    (navIsActive || isActive) ? "bg-primary-100 text-primary-700 font-medium" : ""
                  )
                }
                title={label}
                end={to === "/"}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 shrink-0" />
                {/* Labels only on larger screens to save space */}
                <span className="ml-1 hidden lg:inline text-xs xl:text-sm">
                  {label}
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