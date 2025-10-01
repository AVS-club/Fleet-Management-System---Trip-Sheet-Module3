import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { navLinks } from './navLinks';
import { cn } from '../../utils/cn';
import { Plus } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

const AppNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { permissions } = usePermissions();
  
  const handleQuickAdd = (path: string) => {
    navigate(`${path}?action=new`);
  };

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Navigation - Mobile optimized with icon-first design */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {navLinks.map(({ to, label, icon: Icon, hasQuickAdd, requiresPermission }) => {
          // Check if user has permission to view this nav item
          if (requiresPermission && permissions && !(permissions as any)[requiresPermission]) {
            return null;
          }
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
          
          return (
            <div key={to} className="relative group">
              <NavLink
                to={to}
                className={({ isActive: navIsActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 transition-all",
                    "text-gray-600 hover:text-primary-700 hover:bg-primary-50",
                    (navIsActive || isActive) ? "bg-primary-100 text-primary-700 font-semibold" : ""
                  )
                }
                title={label}
                end={to === "/"}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 sm:h-5 sm:w-5" />
                  {/* Quick Add Badge for specific pages */}
                  {hasQuickAdd && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickAdd(to);
                      }}
                      className="absolute -top-1 -right-1 p-0.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      title={`Add new ${label.slice(0, -1)}`}
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
                {/* Small labels below icons on mobile */}
                <span className="mt-0.5 text-[10px] sm:text-xs">
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