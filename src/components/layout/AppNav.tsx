import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { navLinks } from './navLinks';
import { Plus, ChevronDown } from 'lucide-react';

const AppNav: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAddAction = (type: string) => {
    switch (type) {
      case 'vehicle':
        navigate('/vehicles', { state: { openAddForm: true } });
        break;
      case 'driver':
        navigate('/drivers', { state: { openAddForm: true } });
        break;
      case 'trip':
        navigate('/trips', { state: { openAddForm: true } });
        break;
      case 'maintenance':
        navigate('/maintenance', { state: { openAddForm: true } });
        break;
    }
    setHoveredItem(null);
    setMobileMenuOpen(false);
  };

  const getDropdownItems = (linkName: string) => {
    switch (linkName) {
      case 'Vehicles':
        return [
          { label: 'Add Vehicle', action: () => handleAddAction('vehicle') }
        ];
      case 'Drivers':
        return [
          { label: 'Add Driver', action: () => handleAddAction('driver') }
        ];
      case 'Trips':
        return [
          { label: 'Add Trip', action: () => handleAddAction('trip') }
        ];
      case 'Maintenance':
        return [
          { label: 'Add Maintenance', action: () => handleAddAction('maintenance') }
        ];
      default:
        return [];
    }
  };

  const hasDropdown = (linkName: string) => {
    return ['Vehicles', 'Drivers', 'Trips', 'Maintenance'].includes(linkName);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navLinks.map((link) => (
                <div
                  key={link.name}
                  className="relative"
                  onMouseEnter={() => hasDropdown(link.name) && setHoveredItem(link.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <NavLink
                    to={link.href}
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`
                    }
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.name}
                    {hasDropdown(link.name) && (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </NavLink>

                  {/* Dropdown Menu */}
                  {hasDropdown(link.name) && hoveredItem === link.name && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="py-1">
                        {getDropdownItems(link.name).map((item, index) => (
                          <button
                            key={index}
                            onClick={item.action}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <div key={link.name}>
                <NavLink
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <div className="flex items-center">
                    <link.icon className="h-4 w-4 mr-3" />
                    {link.name}
                  </div>
                </NavLink>
                
                {/* Mobile dropdown items */}
                {hasDropdown(link.name) && (
                  <div className="ml-8 space-y-1">
                    {getDropdownItems(link.name).map((item, index) => (
                      <button
                        key={index}
                        onClick={item.action}
                        className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        <Plus className="h-3 w-3 mr-2 text-primary-600 dark:text-primary-400" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AppNav;