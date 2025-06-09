import React, { useState, useEffect } from 'react';
import { getMaterialTypes, addMaterialType, updateMaterialType, deleteMaterialType, MaterialType } from '../../utils/materialTypes';
import { Plus, Edit2, Trash2, Package, X, Check } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { toast } from 'react-toastify';

interface MaterialTypeManagerProps {
  onClose: () => void;
}

const MaterialTypeManager: React.FC<MaterialTypeManagerProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchMaterialTypes = async () => {
      try {
        const typesData = await getMaterialTypes();
        setMaterialTypes(Array.isArray(typesData) ? typesData : []);
      } catch (error) {
        console.error('Error fetching material types:', error);
        toast.error('Failed to load material types');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterialTypes();
  }, []);

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      toast.error('Material type name cannot be empty');
      return;
    }

    try {
      const newType = await addMaterialType(newTypeName);
      if (newType) {
        setMaterialTypes(prev => [...prev, newType]);
        setNewTypeName('');
        toast.success('Material type added successfully');
      }
    } catch (error) {
      console.error('Error adding material type:', error);
      toast.error('Failed to add material type');
    }
  };

  const handleUpdateType = async () => {
    if (!editingType || !editingType.name.trim()) {
      toast.error('Material type name cannot be empty');
      return;
    }

    try {
      const updatedType = await updateMaterialType(editingType.id, { name: editingType.name });
      if (updatedType) {
        setMaterialTypes(prev => 
          prev.map(type => type.id === editingType.id ? updatedType : type)
        );
        setEditingType(null);
        toast.success('Material type updated successfully');
      }
    } catch (error) {
      console.error('Error updating material type:', error);
      toast.error('Failed to update material type');
    }
  };

  const handleDeleteType = async (id: string) => {
    if (confirm('Are you sure you want to delete this material type?')) {
      try {
        const success = await deleteMaterialType(id);
        if (success) {
          setMaterialTypes(prev => prev.filter(type => type.id !== id));
          toast.success('Material type deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting material type:', error);
        toast.error('Failed to delete material type');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Manage Material Types</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-500">Loading material types...</p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Input
              placeholder="New material type..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleAddType}
              icon={<Plus className="h-4 w-4" />}
            >
              Add
            </Button>
          </div>

          <div className="border rounded-lg divide-y min-h-[200px]">
            {Array.isArray(materialTypes) && materialTypes.length > 0 ? (
              materialTypes.map((type) => (
                <div key={type.id} className="p-3 flex items-center justify-between">
                  {editingType?.id === type.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={editingType.name}
                        onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                        className="flex-1"
                      />
                      <button
                        onClick={handleUpdateType}
                        className="p-1 text-success-600 hover:text-success-700"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingType(null)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="capitalize">{type.name}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingType({ id: type.id, name: type.name })}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(type.id)}
                          className="p-1 text-gray-400 hover:text-error-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No material types defined. Add some above.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialTypeManager;