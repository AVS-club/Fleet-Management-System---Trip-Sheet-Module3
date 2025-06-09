import React, { useState, useRef, useEffect } from 'react';
import { PenTool as Tool } from 'lucide-react';
import { MaintenanceItem, MAINTENANCE_ITEMS, MAINTENANCE_GROUPS } from '../../types/maintenance';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleItem = (id: string) => {
    const newSelection = selectedItems.includes(id)
      ? selectedItems.filter(i => i !== id)
      : [...selectedItems, id];
    onChange(newSelection);
  };

  const filteredItems = MAINTENANCE_ITEMS.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Maintenance Tasks
        <span className="text-error-500 ml-1">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          className="min-h-[42px] p-2 border rounded-lg bg-white cursor-text"
          onClick={() => setIsOpen(true)}
        >
          {selectedItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedItems.map(id => {
                const item = MAINTENANCE_ITEMS.find(i => i.id === id);
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
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
            <input
              type="text"
              className="w-full p-2 border-b"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />

            <div className="max-h-60 overflow-y-auto">
              {showGroupView ? (
                // Grouped View
                Object.entries(MAINTENANCE_GROUPS).map(([groupKey, group]) => (
                  <div key={groupKey} className="border-b last:border-b-0">
                    <div className="p-2 bg-gray-50 font-medium text-sm text-gray-700">
                      {group.title}
                    </div>
                    {group.items
                      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(item => (
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
                ))
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