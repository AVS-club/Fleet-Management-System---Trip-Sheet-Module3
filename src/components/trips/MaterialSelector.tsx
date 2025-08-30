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
  'machinery': 'bg-orange-100 text-orange-800 border-orange-200',
  'paint': 'bg-purple-100 text-purple-800 border-purple-200',
  'putty bags': 'bg-brown-100 text-brown-800 border-brown-200',
  'cement': 'bg-gray-100 text-gray-800 border-gray-200',
  'steel': 'bg-slate-100 text-slate-800 border-slate-200',
  'tiles': 'bg-blue-100 text-blue-800 border-blue-200',
  'sand': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'gravel': 'bg-stone-100 text-stone-800 border-stone-200',
  'bricks': 'bg-red-100 text-red-800 border-red-200',
  'wood': 'bg-amber-100 text-amber-800 border-amber-200',
  'glass': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'plastic': 'bg-green-100 text-green-800 border-green-200',
  'chemicals': 'bg-pink-100 text-pink-800 border-pink-200',
  'electronics': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'food': 'bg-lime-100 text-lime-800 border-lime-200',
  'textiles': 'bg-violet-100 text-violet-800 border-violet-200',
  'furniture': 'bg-teal-100 text-teal-800 border-teal-200',
  'automotive': 'bg-blue-100 text-blue-800 border-blue-200',
  'medical': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'agricultural': 'bg-green-100 text-green-800 border-green-200'
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
      <label className="block text-sm font-medium text-gray-700">
        Material Types (Optional)
      </label>

      {/* Selected Materials Display */}
      {selectedMaterialObjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Selected Materials:</h4>
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
                  className="ml-2 text-current hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Material Selection Grid */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
          {materialTypes.map(material => {
            const isSelected = selectedMaterials.includes(material.id);
            
            return (
              <label
                key={material.id}
                className={`relative flex items-center p-2 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? `border-current ${getColorForMaterial(material.name)}`
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleMaterialToggle(material.id)}
                  className="sr-only"
                />
                
                <div className="flex items-center space-x-2 w-full">
                  <span className="text-lg">{getIconForMaterial(material.name)}</span>
                  
                  <span className={`text-sm font-medium capitalize ${
                    isSelected ? 'text-current' : 'text-gray-700'
                  }`}>
                    {material.name}
                  </span>
                  
                  {isSelected && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-current rounded-full"></div>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
        
        {materialTypes.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No material types available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialSelector;