import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { MaintenanceItem, MAINTENANCE_ITEMS, MAINTENANCE_GROUPS } from '../../types/maintenance';
import { PlusCircle, Edit2, Trash2, AlertTriangle, ChevronLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../utils/translationUtils';

const MaintenanceTasksAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [editingItem, setEditingItem] = useState<MaintenanceItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<MaintenanceItem>>({
    group: 'engine'
  });

  // Translate UI text
  const title = useTranslation('Maintenance Tasks Management');
  const subtitle = useTranslation('Manage maintenance task types and configurations');
  const backToAdminText = useTranslation('Back to Admin');
  const editTaskText = useTranslation('Edit Task');
  const addNewTaskText = useTranslation('Add New Task');
  const taskNameLabel = useTranslation('Task Name');
  const categoryLabel = useTranslation('Category');
  const standardLifeKmLabel = useTranslation('Standard Life (KM)');
  const standardLifeDaysLabel = useTranslation('Standard Life (Days)');
  const averageCostLabel = useTranslation('Average Cost (₹)');
  const warrantyPeriodLabel = useTranslation('Warranty Period (Days)');
  const cancelText = useTranslation('Cancel');
  const updateTaskText = useTranslation('Update Task');
  const addTaskText = useTranslation('Add Task');
  const maintenanceTasksText = useTranslation('Maintenance Tasks');
  const importantNoteText = useTranslation('Important Note');
  const noteDetailsText = useTranslation('Existing maintenance records will retain their original task types even if they are disabled here. Only new maintenance tasks will be affected by these changes.');

  useEffect(() => {
    // Load tasks from localStorage or use defaults
    const savedTasks = localStorage.getItem('maintenance_tasks');
    if (savedTasks) {
      setItems(JSON.parse(savedTasks));
    } else {
      setItems(MAINTENANCE_ITEMS);
    }
  }, []);

  const handleSave = (item: MaintenanceItem) => {
    let updatedItems: MaintenanceItem[];
    
    if (editingItem) {
      updatedItems = items.map(i => i.id === item.id ? item : i);
    } else {
      const newId = `task${Date.now()}`;
      updatedItems = [...items, { ...item as MaintenanceItem, id: newId }];
    }
    
    setItems(updatedItems);
    localStorage.setItem('maintenance_tasks', JSON.stringify(updatedItems));
    setEditingItem(null);
    setNewItem({ group: 'engine' });
  };

  const handleDelete = (id: string) => {
    if (confirm(useTranslation('Are you sure you want to disable this maintenance task? Existing records will not be affected.'))) {
      const updatedItems = items.map(item => 
        item.id === id ? { ...item, inactive: true } : item
      );
      setItems(updatedItems);
      localStorage.setItem('maintenance_tasks', JSON.stringify(updatedItems));
    }
  };

  return (
    <Layout
      title={title}
      subtitle={subtitle}
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          {backToAdminText}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Add/Edit Task Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? editTaskText : addNewTaskText}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={taskNameLabel}
              value={editingItem?.name || newItem.name || ''}
              onChange={e => editingItem 
                ? setEditingItem({ ...editingItem, name: e.target.value })
                : setNewItem({ ...newItem, name: e.target.value })
              }
              required
            />

            <Select
              label={categoryLabel}
              options={Object.entries(MAINTENANCE_GROUPS).map(([key, group]) => ({
                value: key,
                label: useTranslation(group.title)
              }))}
              value={editingItem?.group || newItem.group}
              onChange={e => editingItem
                ? setEditingItem({ ...editingItem, group: e.target.value as MaintenanceItem['group'] })
                : setNewItem({ ...newItem, group: e.target.value as MaintenanceItem['group'] })
              }
              required
            />

            <Input
              label={standardLifeKmLabel}
              type="number"
              value={editingItem?.standardLifeKm || newItem.standardLifeKm || ''}
              onChange={e => {
                const value = parseInt(e.target.value);
                editingItem
                  ? setEditingItem({ ...editingItem, standardLifeKm: value })
                  : setNewItem({ ...newItem, standardLifeKm: value });
              }}
            />

            <Input
              label={standardLifeDaysLabel}
              type="number"
              value={editingItem?.standardLifeDays || newItem.standardLifeDays || ''}
              onChange={e => {
                const value = parseInt(e.target.value);
                editingItem
                  ? setEditingItem({ ...editingItem, standardLifeDays: value })
                  : setNewItem({ ...newItem, standardLifeDays: value });
              }}
            />

            <Input
              label={averageCostLabel}
              type="number"
              value={editingItem?.averageCost || newItem.averageCost || ''}
              onChange={e => {
                const value = parseInt(e.target.value);
                editingItem
                  ? setEditingItem({ ...editingItem, averageCost: value })
                  : setNewItem({ ...newItem, averageCost: value });
              }}
            />

            <Input
              label={warrantyPeriodLabel}
              type="number"
              value={editingItem?.warrantyPeriod || newItem.warrantyPeriod || ''}
              onChange={e => {
                const value = parseInt(e.target.value);
                editingItem
                  ? setEditingItem({ ...editingItem, warrantyPeriod: value })
                  : setNewItem({ ...newItem, warrantyPeriod: value });
              }}
            />
          </div>

          <div className="mt-4 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setEditingItem(null);
                setNewItem({ group: 'engine' });
              }}
            >
              {cancelText}
            </Button>
            <Button
              onClick={() => handleSave(editingItem || newItem as MaintenanceItem)}
              disabled={!editingItem?.name && !newItem.name}
              icon={<PlusCircle className="h-4 w-4" />}
            >
              {editingItem ? updateTaskText : addTaskText}
            </Button>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{maintenanceTasksText}</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {Object.entries(MAINTENANCE_GROUPS).map(([groupKey, group]) => {
              const groupItems = items.filter(item => item.group === groupKey && !item.inactive);
              
              if (groupItems.length === 0) return null;

              return (
                <div key={groupKey} className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{useTranslation(group.title)}</h4>
                  <div className="space-y-3">
                    {groupItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <div className="text-sm text-gray-500 mt-1">
                            {item.standardLifeKm && (
                              <span className="mr-3">{item.standardLifeKm.toLocaleString()} km</span>
                            )}
                            {item.standardLifeDays && (
                              <span className="mr-3">{item.standardLifeDays} days</span>
                            )}
                            {item.averageCost && (
                              <span>₹{item.averageCost.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-gray-400 hover:text-error-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning Notice */}
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-warning-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-warning-800 font-medium">{importantNoteText}</h3>
              <p className="text-warning-700 text-sm mt-1">
                {noteDetailsText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MaintenanceTasksAdmin;