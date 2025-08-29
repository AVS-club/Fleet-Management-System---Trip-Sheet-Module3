import React from 'react';
import { MaterialType } from '../../utils/materialTypes';
import { Package } from 'lucide-react';

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

// Define material colors
const materialColors: Record<string, string> = {
  'machinery': 'bg-orange-100 text-orange-800 border-orange-300',
  'paint': 'bg-purple-100 text-purple-800 border-purple-300',
  'putty bags': 'bg-amber-100 text-amber-800 border-amber-300',
  'cement': 'bg-gray-100 text-gray-800 border-gray-300',
  'steel': 'bg-slate-100 text-slate-800 border-slate-300',
  'tiles': 'bg-blue-100 text-blue-800 border-blue-300',
  'sand': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'gravel': 'bg-stone-100 text-stone-800 border-stone-300',
  'bricks': 'bg-red-100 text-red-800 border-red-300',
  'wood': 'bg-amber-100 text-amber-800 border-amber-300',
  'glass': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'plastic': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'chemicals': 'bg-pink-100 text-pink-800 border-pink-300',
  'electronics': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  'food': 'bg-lime-100 text-lime-800 border-lime-300',
  'textiles': 'bg-violet-100 text-violet-800 border-violet-300',
  'furniture': 'bg-teal-100 text-teal-800 border-teal-300',
  'automotive': 'bg-sky-100 text-sky-800 border-sky-300',
  'medical': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'agricultural': 'bg-green-100 text-green-800 border-green-300'
};

const getIconForMaterial = (materialName: string): string => {
  const key = materialName.toLowerCase().trim();
  return materialIcons[key] || '📦'; // Default package icon
};

const getColorForMaterial = (materialName: string): string => {
  const key = materialName.toLowerCase().trim();
  return materialColors[key] || 'bg-gray-100 text-gray-800 border-gray-200'; // Default gray
};

const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  materialTypes,
  selectedMaterials,
  onChange
}) => {
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

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Material Types (Optional)
      </label>

      {/* Selected Materials Display */}
      {selectedMaterialObjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">Selected Materials:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedMaterialObjects.map(material => (
              <span
                key={material.id}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getColorForMaterial(material.name)}`}
              >
                <span className="mr-2">{getIconForMaterial(material.name)}</span>
                {material.name}
                <button
                  type="button"
                  onClick={() => handleMaterialToggle(material.id)}
                  className="ml-2 text-current hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Material Selection Grid */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
          {materialTypes.map(material => {
            const isSelected = selectedMaterials.includes(material.id);
            
            return (
              <label
                key={material.id}
                className={`relative flex items-center p-1.5 rounded-md border-2 cursor-pointer transition-all ${
                  isSelected
                    ? `border-current ${getColorForMaterial(material.name)} dark:bg-gray-700`
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleMaterialToggle(material.id)}
                  className="sr-only"
                />
                
                <div className="flex items-center space-x-1.5 w-full">
                  <span className="text-base">{getIconForMaterial(material.name)}</span>
                  
                  <span className={`text-xs font-medium capitalize ${
                    isSelected ? 'text-current' : 'text-gray-700'
                  } dark:text-gray-200`}>
                    {material.name}
                  </span>
                  
                  {isSelected && (
                    <div className="ml-auto">
                      <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
        
        {materialTypes.length === 0 && (
          <div className="text-center py-3 text-gray-500 dark:text-gray-400">
            <Package className="h-6 w-6 mx-auto mb-1 text-gray-400" />
            <p>No material types available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialSelector;