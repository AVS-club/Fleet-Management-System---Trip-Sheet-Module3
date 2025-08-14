import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  Truck,
  User,
  BarChart2,
  FileText,
  AlertTriangle,
  PenTool as PenToolIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { getRole, Role } from "../../utils/session";
import ThemeToggle from "../ui/ThemeToggle";

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const role = await getRole();
        setUserRole(role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      }
    };
    
    fetchUserRole();
  }, []);

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const role = await getRole();
        setUserRole(role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      }
    };
    
    fetchUserRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    navigate("/login");
  };

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

    document.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Dashboard", path: "/", icon: <BarChart2 className="h-5 w-5" /> },
    { name: "Trips", path: "/trips", icon: <FileText className="h-5 w-5" /> },
    {
      name: "Maintenance",
      path: "/maintenance",
      icon: <PenToolIcon className="h-5 w-5" />,
    },
    {
      name: "Vehicles",
      path: "/vehicles",
      icon: <Truck className="h-5 w-5" />,
    },
    { name: "Drivers", path: "/drivers", icon: <User className="h-5 w-5" /> },
    {
      name: "AI Alerts",
      path: "/ai-alerts",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    { name: "Admin", path: "/admin", icon: <Settings className="h-5 w-5" /> },
  ];

  // Admin sub-links - not displayed in top nav but used for highlighting "Admin" when on these paths
  const adminSubPaths = [
    "/admin/trips",
    "/admin/alert-settings",
    "/admin/maintenance-tasks",
    "/admin/trip-locations",
    "/admin/reminders",
    "/admin/vehicle-management",
    "/admin/document-rules",
    "/admin/driver-ranking-settings",
    "/admin/message-templates",
    "/admin/activity-logs",
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-20 transition-all duration-300 ${
        scrolled ? "bg-white dark:bg-gray-900 shadow-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center -ml-2 sm:ml-0">
              <div className="flex items-center">
                <img
                  src="/assets/logo.png"
                  alt="Auto Vital Solution Logo"
                  className="h-9 sm:h-12 w-auto object-contain"
                />
              </div>
            </Link>
          </div>

          <div className="hidden md:flex space-x-3 lg:space-x-6">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.path ||
                (link.path === "/admin" &&
                  adminSubPaths.some((path) =>
                    location.pathname.startsWith(path)
                  ));

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1 px-2 lg:px-3 py-1.5 lg:py-2 rounded-md text-xs lg:text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30"
                      : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {link.icon}
                  <span className="whitespace-nowrap">{link.name}</span>
                </Link>
              );
            })}
            <div className="flex items-center ml-4">
              <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 sm:space-x-3 px-3 py-2 sm:py-3 rounded-md text-sm sm:text-base font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>

          <button
            className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none"
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
        className={`md:hidden bg-white dark:bg-gray-900 shadow-lg overflow-hidden transition-all duration-300 ease-in-out z-20 ${
          isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="container mx-auto px-4 py-2 space-y-1">
          {navLinks.map((link) => {
            const isActive =
              location.pathname === link.path ||
              (link.path === "/admin" &&
                adminSubPaths.some((path) =>
                  location.pathname.startsWith(path)
                ));

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-2 sm:space-x-3 px-3 py-2 sm:py-3 rounded-md text-sm sm:text-base font-medium transition-colors ${
                  isActive
                    ? "text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30"
                    : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            );
          })}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-3 py-3">
            <ThemeToggle />
            <div className="w-full">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
        {/* </Router> */}
      </div>
    </header>
  );
};

export default Header;
