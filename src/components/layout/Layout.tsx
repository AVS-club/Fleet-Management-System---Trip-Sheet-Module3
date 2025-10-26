import React from 'react';
import Header from './Header';
import MobileNavigation from './MobileNavigation';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  children,
  title,
  subtitle,
  actions
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Header />
      <MobileNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header with Title, Subtitle, and Actions */}
        {(title || subtitle || actions) && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                {title && (
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex-shrink-0">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
        
        {children}
      </main>
    </div>
  );
};

export default Layout;