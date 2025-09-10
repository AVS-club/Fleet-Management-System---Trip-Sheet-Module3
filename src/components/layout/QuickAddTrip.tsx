import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ChevronDown, Route, Wrench } from 'lucide-react';
import { cn } from '../../utils/cn';

const QuickAddTrip: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickAddTrip = () => {
    navigate('/trips?action=new');
    setIsDropdownOpen(false);
  };

  const handleQuickAddMaintenance = () => {
    navigate('/maintenance?action=new');
    setIsDropdownOpen(false);
  };


  return (
    <>
      {/* Desktop FAB - Always visible in bottom-right */}
      <div className="hidden md:block fixed bottom-6 right-6 z-40" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            "flex items-center justify-center gap-2",
            "h-12 px-4 rounded-full",
            "bg-primary-600 text-white shadow-lg",
            "hover:bg-primary-700 active:scale-95",
            "transition-all duration-200"
          )}
          aria-label="Quick add options"
        >
          <Plus className={cn(
            "h-5 w-5 transition-transform",
            isDropdownOpen && "rotate-45"
          )} />
          <span className="font-medium">Quick Add</span>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute bottom-full mb-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <button
              onClick={handleQuickAddTrip}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors first:rounded-t-lg"
            >
              <Route className="h-4 w-4 text-primary-600" />
              <span>New Trip</span>
            </button>
            <button
              onClick={handleQuickAddMaintenance}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors last:rounded-b-lg border-t border-gray-100"
            >
              <Wrench className="h-4 w-4 text-primary-600" />
              <span>New Maintenance Task</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile FAB - Always visible */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            "flex items-center justify-center",
            "h-14 w-14 rounded-full",
            "bg-primary-600 text-white shadow-lg",
            "hover:bg-primary-700 active:scale-95",
            "transition-all duration-200",
            isDropdownOpen && "rotate-45"
          )}
          aria-label="Quick add"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Mobile FAB Menu */}
        {isDropdownOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-3">
            <button
              onClick={handleQuickAddTrip}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-gray-200 whitespace-nowrap"
            >
              <Route className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium">New Trip</span>
            </button>
            <button
              onClick={handleQuickAddMaintenance}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-gray-200 whitespace-nowrap"
            >
              <Wrench className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium">New Task</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default QuickAddTrip;