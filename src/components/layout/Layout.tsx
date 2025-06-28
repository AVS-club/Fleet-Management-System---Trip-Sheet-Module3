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
      
      <main className="pt-16 pb-10">
        {(title || actions) && (
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-0.5">
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  {title && (
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 sm:mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">{subtitle}</p>
                  )}
                </div>
                {actions && (
                  <div className="mt-3 sm:mt-0 flex flex-wrap gap-2 sm:gap-3 justify-start sm:justify-end">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
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