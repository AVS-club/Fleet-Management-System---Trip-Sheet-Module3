import React from 'react';
import Header from './Header';
import { Truck } from 'lucide-react';

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

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header block (title/subtitle/actions) should be implemented within individual page components */}
        {/* The content of the page */}
        <div className="space-y-6"> {/* Added a div with space-y-6 for consistent spacing */}
          {title && <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>}
          {subtitle && <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>}
          {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
          {children}
        </div>
      </main>
      
      <footer className="bg-gray-800 dark:bg-gray-950 text-white py-4 sm:py-6 mt-auto">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-2 md:gap-0">
            <div className="flex items-center justify-center">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-white mr-2" />
              <p className="text-xs sm:text-sm">Auto Vital Solution © {new Date().getFullYear()}</p>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 md:mt-0 text-center md:text-right">
              Intelligent fleet management and analytics
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;