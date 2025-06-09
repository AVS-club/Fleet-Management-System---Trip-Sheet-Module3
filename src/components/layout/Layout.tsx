import React from 'react';
import Header from './Header';

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-16 pb-10">
        {(title || actions) && (
          <div className="bg-white shadow-sm border-b">
            <div className="container mx-auto px-4 py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {title && (
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  )}
                  {subtitle && (
                    <p className="mt-1 text-gray-500">{subtitle}</p>
                  )}
                </div>
                {actions && (
                  <div className="mt-4 sm:mt-0 flex space-x-3 justify-start sm:justify-end">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center">
              <Truck className="h-6 w-6 text-white mr-2" />
              <p className="text-sm">FleetWise © {new Date().getFullYear()}</p>
            </div>
            <p className="text-gray-400 text-sm mt-2 md:mt-0">
              Intelligent fleet management and analytics
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

import { Truck } from 'lucide-react';

export default Layout;