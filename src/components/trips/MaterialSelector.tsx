import React, { useState, useRef, useEffect } from 'react';
import { MaterialType } from '../../utils/materialTypes';
import { Package, ChevronDown, X } from 'lucide-react';

interface MaterialSelectorProps {
  materialTypes: MaterialType[];
  selectedMaterials: string[];
  onChange: (materialIds: string[]) => void;
}

// Define material icons mapping
const materialIcons: Record<string, string> = {
  'machinery': '🛠️',
  'paint': '🎨', 
  'putty bags': '🧱',
  'cement': '🏗️',
  'steel': '⚙️',
  'tiles': '🔲',
  'sand': '⏳',
  'gravel': '🪨',
  'bricks': '🧱',
  'wood': '🪵',
  'glass': '🪟',
  'plastic': '♻️',
  'chemicals': '🧪',
  'electronics': '📱',
  'food': '🍎',
  'textiles': '🧵',
  'furniture': '🪑',
  'automotive': '🚗',
  'medical': '💊',
  'agricultural': '🌾'
};

const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  materialTypes,
  selectedMaterials,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMaterialToggle = (materialId: string) => {
    const isSelected = selectedMaterials.includes(materialId);
    
    if (isSelected) {
      onChange(selectedMaterials.filter(id => id !== materialId));
    } else {
      onChange([...selectedMaterials, materialId]);
    }
  };

  const selectedMaterialObjects = selectedMaterials
    .map(id => materialTypes.find(mat => mat.id === id))
    .filter(Boolean) as MaterialType[];

  const getIconForMaterial = (materialName: string): string => {
    const key = materialName.toLowerCase().trim();
    return materialIcons[key] || '📦';
  };

  const handleRemoveMaterial = (e: React.MouseEvent, materialId: string) => {
    e.stopPropagation();
    handleMaterialToggle(materialId);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Material Types (Optional)
      </label>

      {/* Compact Dropdown Style */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 text-sm transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-2">
              {selectedMaterialObjects.length === 0 ? (
                <span className="text-gray-500 dark:text-gray-400">Select materials...</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedMaterialObjects.slice(0, 3).map(material => (
                    <span
                      key={material.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 max-w-[120px]"
                    >
                      <span className="mr-1 flex-shrink-0">{getIconForMaterial(material.name)}</span>
                      <span className="truncate">{material.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveMaterial(e, material.id)}
                        className="ml-1 flex-shrink-0 hover:text-primary-600 dark:hover:text-primary-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedMaterialObjects.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      +{selectedMaterialObjects.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
            <div className="max-h-48 overflow-auto material-selector-dropdown">
              {materialTypes.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No material types available</p>
                </div>
              ) : (
                <div className="py-1">
                  {/* Quick select all/none buttons */}
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {selectedMaterials.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onChange(materialTypes.map(m => m.id))}
                        className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Material options */}
                  {materialTypes.map(material => {
                    const isSelected = selectedMaterials.includes(material.id);
                    return (
                      <button
                        key={material.id}
                        type="button"
                        onClick={() => handleMaterialToggle(material.id)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors duration-150 ${
                          isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="mr-2 text-base">{getIconForMaterial(material.name)}</span>
                          <span className={`capitalize ${isSelected ? 'font-medium text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {material.name}
                          </span>
                        </div>
                        {isSelected && (
                          <svg className="h-4 w-4 text-primary-600 dark:text-primary-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Optional: Show count if materials selected */}
      {selectedMaterialObjects.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {selectedMaterialObjects.length} material{selectedMaterialObjects.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
};

export default MaterialSelector;