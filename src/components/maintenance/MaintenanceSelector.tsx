import React, { useState, useRef, useEffect } from 'react';
import { PenTool as Tool } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getMaintenanceTasksCatalog, convertCatalogToSelectorFormat } from '../../utils/maintenanceCatalog';

interface MaintenanceSelectorProps {
  selectedItems: string[];
  onChange: (items: string[]) => void;
  showGroupView: boolean;
  error?: string;
}

const MaintenanceSelector: React.FC<MaintenanceSelectorProps> = ({
  selectedItems,
  onChange,
  showGroupView,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuAbove, setIsMenuAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch maintenance tasks catalog from database
  const { data: catalogData, isLoading, isError } = useQuery({
    queryKey: ['maintenanceTasksCatalog'],
    queryFn: getMaintenanceTasksCatalog,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Convert catalog data to the format expected by the component
  const { items: maintenanceItems, groups: maintenanceGroups } = React.useMemo(() => {
    if (!catalogData) {
      return { items: [], groups: {} };
    }
    return convertCatalogToSelectorFormat(catalogData);
  }, [catalogData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isOpen && inputContainerRef.current && dropdownMenuRef.current) {
      const inputRect = inputContainerRef.current.getBoundingClientRect();
      const dropdownHeight = Math.min(dropdownMenuRef.current.scrollHeight, 250); // Reduced from 300px to 250px
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;

      // If not enough space below and more space above, show above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setIsMenuAbove(true);
      } else {
        setIsMenuAbove(false);
      }
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleItem = (id: string) => {
    const newSelection = selectedItems.includes(id)
      ? selectedItems.filter(i => i !== id)
      : [...selectedItems, id];
    onChange(newSelection);
  };

  // Filter items based on search term
  const filteredItems = maintenanceItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && !item.inactive;
  });

  if (isLoading) {
    return <div className="animate-pulse h-10 bg-gray-200 rounded"></div>;
  }

  if (isError) {
    return <div className="text-error-500 text-sm">Error loading maintenance tasks</div>;
  }

  return (
    <div className="space-y-2 relative z-20">
      <label className="block text-sm font-medium text-gray-700">
        Maintenance Tasks
        <span className="text-error-500 ml-1">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          ref={inputContainerRef}
          className={`min-h-[42px] p-2 border rounded-lg bg-white cursor-text ${
            error ? 'border-error-500' : 'border-gray-300'
          }`}
          onClick={() => setIsOpen(true)}
        >
          {selectedItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedItems.map(id => {
                const item = maintenanceItems.find(i => i.id === id);
                return item ? (
                  <span
                    key={item.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-primary-100 text-primary-700"
                  >
                    <Tool className="h-3 w-3 mr-1" />
                    {item.name}
                    <button
                      type="button"
                      className="ml-1 hover:text-primary-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItem(item.id);
                      }}
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          ) : (
            <div className="text-gray-500">Select maintenance tasks</div>
          )}
        </div>

        {isOpen && (
          <div 
            ref={dropdownMenuRef}
            style={{
              position: 'absolute',
              [isMenuAbove ? 'bottom' : 'top']: isMenuAbove ? 'calc(100% + 4px)' : 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: '250px', // Reduced from 300px to 250px
              overflowY: 'auto',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              zIndex: 50,
              border: '1px solid #e5e7eb'
            }}
            className="z-50 w-full bg-white border rounded-lg shadow-lg"
          >
            <input
              ref={searchInputRef}
              type="text"
              className="w-full p-2 border-b sticky top-0 bg-white z-10"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />

            <div className="max-h-[200px] overflow-y-auto">
              {showGroupView ? (
                // Grouped View
                Object.entries(maintenanceGroups).map(([groupKey, group]) => {
                  // Filter items in this group based on search
                  const filteredGroupItems = group.items.filter(item => 
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !item.inactive
                  );
                  
                  // Only render the group if it has items matching the search
                  if (filteredGroupItems.length === 0) return null;
                  
                  return (
                    <div key={groupKey} className="border-b last:border-b-0">
                      <div className="p-2 bg-gray-50 font-medium text-sm text-gray-700 sticky top-[41px] z-10">
                        {group.title}
                      </div>
                      {filteredGroupItems.map(item => (
                        <div
                          key={item.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 ${
                            selectedItems.includes(item.id) ? 'bg-primary-50' : ''
                          }`}
                          onClick={() => toggleItem(item.id)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.name}</span>
                            {selectedItems.includes(item.id) && (
                              <span className="text-primary-600">✓</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              ) : (
                // List View
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedItems.includes(item.id) ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.name}</span>
                      {selectedItems.includes(item.id) && (
                        <span className="text-primary-600">✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}

              {filteredItems.length === 0 && (
                <div className="p-3 text-center text-gray-500">
                  No tasks found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-error-500 text-sm">{error}</p>
      )}
    </div>
  );
};

export default MaintenanceSelector;