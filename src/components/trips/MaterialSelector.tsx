import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MaterialType } from '../../utils/materialTypes';
import { Package, ChevronDown, Plus, X } from 'lucide-react';

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

// Define priority materials (these will show as quick select)
const PRIORITY_MATERIALS = ['machinery', 'paint', 'putty bags'];

const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  materialTypes,
  selectedMaterials,
  onChange
}) => {
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
    };

    if (showMoreDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreDropdown]);

  // Separate materials into quick select and others
  const { quickSelectMaterials, otherMaterials } = useMemo(() => {
    const quick: MaterialType[] = [];
    const others: MaterialType[] = [];
    
    materialTypes.forEach(material => {
      const materialKey = material.name.toLowerCase().trim();
      if (PRIORITY_MATERIALS.includes(materialKey)) {
        quick.push(material);
      } else {
        others.push(material);
      }
    });

    // Sort quick materials by priority order
    quick.sort((a, b) => {
      const aIndex = PRIORITY_MATERIALS.indexOf(a.name.toLowerCase().trim());
      const bIndex = PRIORITY_MATERIALS.indexOf(b.name.toLowerCase().trim());
      return aIndex - bIndex;
    });

    return { quickSelectMaterials: quick, otherMaterials: others };
  }, [materialTypes]);

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

  // Check if any "other" materials are selected
  const hasOtherMaterialsSelected = selectedMaterials.some(id => 
    otherMaterials.some(mat => mat.id === id)
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Material Types (Optional)
      </label>

      {/* Quick Select Materials - Always Visible */}
      <div className="flex flex-wrap items-center gap-2">
        {quickSelectMaterials.map(material => {
          const isSelected = selectedMaterials.includes(material.id);
          return (
            <button
              key={material.id}
              type="button"
              onClick={() => handleMaterialToggle(material.id)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                isSelected
                  ? 'bg-primary-100 text-primary-800 border-primary-300 dark:bg-primary-900 dark:text-primary-200 dark:border-primary-700 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <span className="mr-1.5">{getIconForMaterial(material.name)}</span>
              <span className="capitalize">{material.name}</span>
              {isSelected && (
                <svg className="ml-1.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}

        {/* More Materials Dropdown Button */}
        {otherMaterials.length > 0 && (
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowMoreDropdown(!showMoreDropdown)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                hasOtherMaterialsSelected
                  ? 'bg-primary-50 text-primary-700 border-primary-300 dark:bg-primary-900/50 dark:text-primary-300 dark:border-primary-700'
                  : 'bg-gray-50 text-gray-600 border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <Plus className="h-3 w-3 mr-1" />
              <span>More</span>
              {hasOtherMaterialsSelected && (
                <span className="ml-1.5 bg-primary-200 dark:bg-primary-700 text-primary-800 dark:text-primary-200 px-1.5 py-0.5 rounded-full text-xs">
                  {selectedMaterials.filter(id => otherMaterials.some(mat => mat.id === id)).length}
                </span>
              )}
              <ChevronDown className={`ml-1 h-3 w-3 transition-transform duration-200 ${showMoreDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu for Other Materials */}
            {showMoreDropdown && (
              <div className="absolute z-20 mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg min-w-[200px]">
                <div className="max-h-64 overflow-auto material-selector-dropdown">
                  <div className="py-1">
                    {otherMaterials.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No additional materials
                      </div>
                    ) : (
                      otherMaterials.map(material => {
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
                              <span className="mr-2">{getIconForMaterial(material.name)}</span>
                              <span className={`capitalize ${isSelected ? 'font-medium text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {material.name}
                              </span>
                            </div>
                            {isSelected && (
                              <svg className="h-4 w-4 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Materials Summary */}
      {selectedMaterialObjects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMaterialObjects.map(material => (
            <span
              key={material.id}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              <span className="mr-1">{getIconForMaterial(material.name)}</span>
              {material.name}
              <button
                type="button"
                onClick={() => handleMaterialToggle(material.id)}
                className="ml-1 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaterialSelector;