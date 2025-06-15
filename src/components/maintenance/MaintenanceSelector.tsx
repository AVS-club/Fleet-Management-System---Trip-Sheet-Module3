import React, { useState, useRef, useEffect } from 'react';
import { PenTool as Tool } from 'lucide-react';
import { MaintenanceItem, MAINTENANCE_ITEMS, MAINTENANCE_GROUPS, MAINTENANCE_CATEGORIES } from '../../types/maintenance';
import { getMaintenanceTasksCatalog } from '../../utils/maintenanceStorage';

interface MaintenanceSelectorProps {
  selectedItems: string[];
  onChange: (items: string[]) => void;
  showGroupView: boolean;
  selectedCategory?: string;
  error?: string;
}

const MaintenanceSelector: React.FC<MaintenanceSelectorProps> = ({
  selectedItems,
  onChange,
  showGroupView,
  selectedCategory,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);
  const [maintenanceCategories, setMaintenanceCategories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch maintenance tasks from the database
  useEffect(() => {
    const fetchMaintenanceTasks = async () => {
      setLoading(true);
      try {
        const tasks = await getMaintenanceTasksCatalog();
        
        // Group tasks by category
        const categories: Record<string, any> = {};
        const tasksList: any[] = [];
        
        tasks.forEach(task => {
          if (!task.is_category) {
            tasksList.push({
              id: task.id,
              name: task.task_name,
              group: task.task_category,
              inactive: !task.active
            });
          }
          
          // Build categories structure
          if (!categories[task.task_category]) {
            categories[task.task_category] = {
              title: task.task_category,
              items: []
            };
          }
          
          if (!task.is_category) {
            categories[task.task_category].items.push({
              id: task.id,
              name: task.task_name,
              group: task.task_category,
              inactive: !task.active
            });
          }
        });
        
        setMaintenanceTasks(tasksList);
        setMaintenanceCategories(categories);
      } catch (error) {
        console.error('Error fetching maintenance tasks:', error);
        // Fallback to static data if fetch fails
        setMaintenanceTasks(MAINTENANCE_ITEMS);
        setMaintenanceCategories(MAINTENANCE_GROUPS);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaintenanceTasks();
  }, []);

  const toggleItem = (id: string) => {
    const newSelection = selectedItems.includes(id)
      ? selectedItems.filter(i => i !== id)
      : [...selectedItems, id];
    onChange(newSelection);
  };

  // Filter items based on search term and selected category
  const filteredItems = maintenanceTasks.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.group === selectedCategory;
    return matchesSearch && matchesCategory && !item.inactive;
  });

  // Get the groups to display based on selected category
  const groupsToDisplay = selectedCategory 
    ? { [selectedCategory]: maintenanceCategories[selectedCategory] }
    : maintenanceCategories;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Maintenance Tasks
        <span className="text-error-500 ml-1">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          className={`min-h-[42px] p-2 border rounded-lg bg-white cursor-text ${
            error ? 'border-error-500' : 'border-gray-300'
          }`}
          onClick={() => setIsOpen(true)}
        >
          {selectedItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedItems.map(id => {
                const item = maintenanceTasks.find(i => i.id === id) || 
                             MAINTENANCE_ITEMS.find(i => i.id === id);
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
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg">
            <input
              type="text"
              className="w-full p-2 border-b"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />

            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading maintenance tasks...
                </div>
              ) : showGroupView ? (
                // Grouped View
                Object.entries(groupsToDisplay).map(([groupKey, group]) => (
                  <div key={groupKey} className="border-b last:border-b-0">
                    <div className="p-2 bg-gray-50 font-medium text-sm text-gray-700">
                      {group.title}
                    </div>
                    {group.items
                      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !item.inactive)
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

              {filteredItems.length === 0 && !loading && (
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