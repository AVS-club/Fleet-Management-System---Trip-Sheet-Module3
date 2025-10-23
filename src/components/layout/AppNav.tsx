import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { navLinks, getMobileNavLinks } from './navLinks';
import { cn } from '../../utils/cn';
import { Plus } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

const AppNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { permissions, loading } = usePermissions();
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  // Listen for window resize
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleQuickAdd = (path: string) => {
    navigate(`${path}?action=new`);
  };

  // Use filtered links for mobile
  const displayLinks = isMobile ? getMobileNavLinks() : navLinks;

  return (
    <nav className="flex items-center justify-between w-full">
      {/* Navigation - Mobile optimized with icon-first design */}
      <div className="flex items-center overflow-x-auto lg:overflow-x-visible scrollbar-hide">
        <div className="flex items-center justify-center gap-1 sm:gap-2 px-2">
        {displayLinks.map(({ to, label, icon: Icon, customComponent: CustomComponent, hasQuickAdd, requiresPermission }) => {
          // Check if user has permission to view this nav item
          // While loading, show all items to prevent flickering
          if (loading) {
            const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));

            // Special handling for custom components (like AVS AI Button)
            if (CustomComponent) {
              return (
                <div key={to} className="relative group">
                  <CustomComponent
                    onClick={() => navigate(to)}
                    label={t(label)}
                    variant="compact"
                    isActive={isActive}
                    className=""
                  />
                </div>
              );
            }

            return (
              <div key={to} className="relative group">
                <NavLink
                  to={to}
                  className={({ isActive: navIsActive }) =>
                    cn(
                      "relative flex flex-col items-center justify-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 transition-all",
                      "text-gray-600 dark:text-gray-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30",
                      (navIsActive || isActive) ? "bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-semibold" : ""
                    )
                  }
                  title={t(label)}
                  end={to === "/"}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5 sm:h-5 sm:w-5" />
                    {hasQuickAdd && !isMobile && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleQuickAdd(to);
                        }}
                        className="absolute -top-1 -right-1 p-0.5 rounded-full bg-primary-600 dark:bg-primary-500 text-white hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                        title={`Add new ${t(label).slice(0, -1)}`}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  <span className="mt-0.5 text-[10px] sm:text-xs whitespace-nowrap">
                    {isMobile ? t(label).split(' ')[0] : t(label)}
                  </span>
                </NavLink>
              </div>
            );
          }
          if (requiresPermission && permissions && !(permissions as any)[requiresPermission]) {
            return null;
          }
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));

          // Special handling for custom components (like AVS AI Button)
          if (CustomComponent) {
            return (
              <div key={to} className="relative group">
                <CustomComponent
                  onClick={() => navigate(to)}
                  label={t(label)}
                  variant="compact"
                  isActive={isActive}
                  className=""
                />
              </div>
            );
          }

          return (
            <div key={to} className="relative group">
              <NavLink
                to={to}
                className={({ isActive: navIsActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 transition-all",
                    "text-gray-600 dark:text-gray-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30",
                    (navIsActive || isActive) ? "bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-semibold" : ""
                  )
                }
                title={t(label)}
                end={to === "/"}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 sm:h-5 sm:w-5" />
                  {/* Quick Add Badge for specific pages */}
                  {hasQuickAdd && !isMobile && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickAdd(to);
                      }}
                      className="absolute -top-1 -right-1 p-0.5 rounded-full bg-primary-600 dark:bg-primary-500 text-white hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                      title={`Add new ${t(label).slice(0, -1)}`}
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
                {/* Small labels below icons on mobile */}
                <span className="mt-0.5 text-[10px] sm:text-xs whitespace-nowrap">
                  {isMobile ? t(label).split(' ')[0] : t(label)}
                </span>
              </NavLink>
            </div>
          );
        })}
        </div>
      </div>

      {/* Navigation is always visible with icons */}
    </nav>
  );
};

export default AppNav;
