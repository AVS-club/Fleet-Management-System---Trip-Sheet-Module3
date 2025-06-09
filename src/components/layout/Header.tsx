import React, { useState, useEffect } from 'react';
import { Menu, X, Truck, User, BarChart2, FileText, Shield, AlertTriangle, PenTool as Tool, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    document.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: <BarChart2 className="h-5 w-5" /> },
    { name: 'Trips', path: '/trips', icon: <FileText className="h-5 w-5" /> },
    { name: 'Maintenance', path: '/maintenance', icon: <Tool className="h-5 w-5" /> },
    { name: 'Vehicles', path: '/vehicles', icon: <Truck className="h-5 w-5" /> },
    { name: 'Drivers', path: '/drivers', icon: <User className="h-5 w-5" /> },
    { name: 'AI Alerts', path: '/alerts', icon: <AlertTriangle className="h-5 w-5" /> },
    { name: 'Admin', path: '/admin', icon: <Settings className="h-5 w-5" /> }
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src="/assets/android-chrome-192x192.png"
                alt="AutoVital Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="hidden md:flex space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            ))}
          </div>

          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-primary-600 hover:bg-gray-50 focus:outline-none"
            onClick={toggleMenu}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden bg-white shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="container mx-auto px-4 py-2 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                location.pathname === link.path
                  ? 'text-primary-700 bg-primary-50'
                  : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;