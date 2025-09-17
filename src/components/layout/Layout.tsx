import React from 'react';
import Header from './Header';
import MobileNavigation from './MobileNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  children
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Header />
      <MobileNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Mobile padding adjustment */}
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;