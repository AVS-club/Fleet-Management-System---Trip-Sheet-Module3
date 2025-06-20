import React from 'react';
import { Package, Plus } from 'lucide-react';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { useEffect, useState } from 'react';

// Map of material type names to corresponding icons
const MATERIAL_ICONS: Record<string, React.ReactNode> = {
  'Electronics': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 6 6"/><path d="m15 11-6 6"/><rect width="12" height="12" x="6" y="6" rx="2"/></svg>,
  'Textiles': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15h12"/><rect width="18" height="10" x="3" y="8" rx="2"/><path d="M16 21V8"/><path d="M8 21V8"/></svg>,
  'Groceries': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v7"/></svg>,
  'Construction': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 10 1.5-1.5"/><path d="M9.5 17H7a2 2 0 0 1-2-2v-5.1a2 2 0 0 1 .6-1.4l.9-.9"/><path d="m16 10-1.5-1.5"/><path d="M14.5 17H17a2 2 0 0 0 2-2v-5.1a2 2 0 0 0-.6-1.4l-.9-.9"/><rect x="9" y="6" width="6" height="2" rx="1"/><rect x="8" y="17" width="8" height="5" rx="1"/></svg>,
  'Machinery': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, 
  'Furniture': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18h18"/><path d="M3 18a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2"/><path d="M8 18v2"/><path d="M16 18v2"/><path d="M5 10V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"/></svg>,
  'Appliances': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14"/><path d="M5 5v16"/><path d="M19 5v16"/><path d="M5 21h14"/><path d="M9 9h1"/><path d="M14 9h1"/><path d="M9 14h6"/></svg>,
  'Automotive Parts': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M14 7.4c.6.4 1 1 1.3 1.8.1.3.6.6 1.2.6H19c.5 0 .9.4.9 1v2.5c0 .5-.4.9-.9.9H16.4c-.5 0-1 .4-1.2.8-.2.8-.7 1.4-1.3 1.8"/><path d="M10 7.4c-.6.4-1 1-1.3 1.8-.1.3-.6.6-1.2.6H5c-.5 0-.9.4-.9 1v2.5c0 .5.4.9.9.9H7.6c.5 0 1 .4 1.2.8.2.8.7 1.4 1.3 1.8"/><path d="M10 7.3a2.8 2.8 0 0 1 4 0"/><path d="M10 16.7a2.8 2.8 0 0 0 4 0"/></svg>,
  'Pharmaceuticals': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 6 6"/><path d="m15 11-6 6"/><rect width="12" height="12" x="6" y="6" rx="2"/></svg>,
  'Food Products': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77"/><path d="M13 7.77a2.4 2.4 0 0 1-.5 4.73"/><path d="M15.25 13c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75Z"/><path d="M8.75 13c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75Z"/></svg>,
  'Agricultural Supplies': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6a9 9 0 0 1 9 9"/><path d="M3 6h4l2 4"/><path d="M3 10h4l2 4"/><path d="M3 14h4l2 4"/><path d="M12 15a9 9 0 0 0 9-9"/><path d="M12 15h4l2-4"/><path d="M12 11h4l2-4"/><path d="M12 7h4l2-4"/></svg>,
  'Stationery': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14 5-10 9 5 5 9-10-4-4Z"/><path d="m16.71 7.29-1.42-1.42a1 1 0 0 0-1.41 0L9.76 10l4.24 4.24 4.12-4.13a1 1 0 0 0 0-1.41l-1.41-1.41Z"/><line x1="5" x2="9" y1="19" y2="15"/></svg>
};

interface MaterialSelectorProps {
  selectedMaterials: string[];
  onChange: (materialIds: string[]) => void;
}

const MaterialSelector: React.FC<MaterialSelectorProps> = ({ 
  selectedMaterials, 
  onChange 
}) => {
  const [materials, setMaterials] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [frequentMaterials, setFrequentMaterials] = useState<string[]>([]);
  const [lastSelectedMaterial, setLastSelectedMaterial] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const types = await getMaterialTypes();
        setMaterials(Array.isArray(types) ? types : []);
        
        // Set most frequent materials (this would ideally come from a backend API)
        // For now, let's just use the first 3
        setFrequentMaterials(types.slice(0, 3).map(type => type.id));
      } catch (error) {
        console.error("Error fetching material types:", error);
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaterials();
  }, []);

  // Update last selected material whenever selectedMaterials changes
  useEffect(() => {
    if (selectedMaterials.length > 0) {
      const lastId = selectedMaterials[selectedMaterials.length - 1];
      setLastSelectedMaterial(lastId);
    }
  }, [selectedMaterials]);

  const toggleMaterial = (materialId: string) => {
    const newSelection = selectedMaterials.includes(materialId) 
      ? selectedMaterials.filter(id => id !== materialId)
      : [...selectedMaterials, materialId];
    
    onChange(newSelection);
  };

  // Add last selected material again ("+1" feature)
  const handleAddSameAgain = () => {
    if (lastSelectedMaterial && materials.find(m => m.id === lastSelectedMaterial)) {
      onChange([...selectedMaterials, lastSelectedMaterial]);
    }
  };

  // Get icon for a material type
  const getMaterialIcon = (material: MaterialType) => {
    return MATERIAL_ICONS[material.name] || <Package className="h-4 w-4" />;
  };

  // Determine if a material is frequently used (highlighted)
  const isFrequentMaterial = (materialId: string) => {
    return frequentMaterials.includes(materialId);
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Package className="h-4 w-4 mr-2 text-gray-600" />
          Material Carried
        </h4>
        
        {lastSelectedMaterial && (
          <button
            type="button"
            onClick={handleAddSameAgain}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-100"
            title="Add last selected material again"
          >
            <Plus className="h-3 w-3 mr-0.5" />
            <span className="text-xs">+1</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {materials.map(material => (
          <div key={material.id} className="relative">
            <input
              type="checkbox"
              id={`material-${material.id}`}
              checked={selectedMaterials.includes(material.id)}
              onChange={() => toggleMaterial(material.id)}
              className="peer absolute opacity-0 w-0 h-0"
            />
            <label
              htmlFor={`material-${material.id}`}
              className={`flex items-center p-2.5 rounded-lg border border-gray-200 cursor-pointer transition-colors text-sm
                ${selectedMaterials.includes(material.id) 
                  ? 'bg-primary-50 border-primary-200 text-primary-700' 
                  : isFrequentMaterial(material.id)
                    ? 'bg-gray-50 text-gray-700 border-gray-300'
                    : 'hover:bg-gray-50 text-gray-700'
                }
                peer-focus:ring-2 peer-focus:ring-primary-300 peer-focus:ring-offset-1
              `}
            >
              <span className={`mr-2.5 ${
                selectedMaterials.includes(material.id) 
                  ? 'text-primary-500'
                  : 'text-gray-500'
              }`}>
                {getMaterialIcon(material)}
              </span>
              <span className="capitalize">{material.name}</span>
            </label>
          </div>
        ))}
      </div>
      
      {materials.length === 0 && (
        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
          No material types available
        </div>
      )}
    </div>
  );
};

export default MaterialSelector;