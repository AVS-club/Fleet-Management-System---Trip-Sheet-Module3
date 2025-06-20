import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Check, Plus, ChevronDown } from 'lucide-react';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';

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
  'Pharmaceuticals': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 13h6"/><circle cx="12" cy="13" r="8"/><path d="m13.4 7.4-.8.6-1.8 1.2a2 2 0 0 0-.8 1.6v1.7a2 2 0 0 0 .8 1.6l1.8 1.2.8.6"/><path d="m16.8 15.6 1.2.8"/><path d="m16.8 10.4 1.2-.8"/><path d="m15.6 16.8.8 1.2"/><path d="m15.6 9.2.8-1.2"/></svg>,
  'Food Products': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77"/><path d="M13 7.77a2.4 2.4 0 0 1-.5 4.73"/><path d="M15.25 13c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75Z"/><path d="M8.75 13c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75Z"/></svg>,
  'Agricultural Supplies': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6a9 9 0 0 1 9 9"/><path d="M3 6h4l2 4"/><path d="M3 10h4l2 4"/><path d="M3 14h4l2 4"/><path d="M12 15a9 9 0 0 0 9-9"/><path d="M12 15h4l2-4"/><path d="M12 11h4l2-4"/><path d="M12 7h4l2-4"/></svg>,
  'Stationery': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14 5-10 9 5 5 9-10-4-4Z"/><path d="m16.71 7.29-1.42-1.42a1 1 0 0 0-1.41 0L9.76 10l4.24 4.24 4.12-4.13a1 1 0 0 0 0-1.41l-1.41-1.41Z"/><line x1="5" x2="9" y1="19" y2="15"/></svg>,
  'Cement': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="15" rx="1"/><path d="M3 8h18"/><path d="M12 13v7"/><path d="M8 13v7"/><path d="M16 13v7"/><path d="M3 5V2h18v3"/></svg>,
  'Paint': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8" fill="none"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>,
  'Fmcg': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6-8.5 8.5"/><path d="M21 6h-4"/><path d="M21 10h-4"/><path d="M21 14h-4"/><path d="M21 18h-4"/><path d="M8 5v18"/><path d="M4 14h.01"/><rect x="3" y="5" width="10" height="18" rx="2"/></svg>,
  'Log/Plywood': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 3 2 2c1.1-1.1 2.7-1.5 4.2-1L13 6.2c-1 .9-1.2 2.5-.2 3.4 1 1 2.6.8 3.4-.2L18.4 7c.5 1.4.1 3-.9 4l2 2"/><path d="m15 9-6 6"/><path d="M9.5 14.5 3 21"/><path d="M10.2 11.8 6 16"/></svg>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropdownAbove, setIsDropdownAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Top 3 materials will be shown as individual buttons
  const [topMaterials, setTopMaterials] = useState<MaterialType[]>([]);
  // Remaining materials will go in the dropdown
  const [dropdownMaterials, setDropdownMaterials] = useState<MaterialType[]>([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const types = await getMaterialTypes();
        const materialsList = Array.isArray(types) ? types : [];
        setMaterials(materialsList);
        
        // Set top 3 materials
        const top = materialsList.slice(0, 3);
        setTopMaterials(top);
        
        // Set remaining materials for the dropdown
        setDropdownMaterials(materialsList.slice(3));
      } catch (error) {
        console.error("Error fetching material types:", error);
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaterials();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Position dropdown above or below based on available space
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current && dropdownContentRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownContentRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      // Check if there's enough space below
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // If not enough space below and more space above, position above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setIsDropdownAbove(true);
      } else {
        setIsDropdownAbove(false);
      }
    }
  }, [isDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  const toggleMaterial = (materialId: string) => {
    const newSelection = selectedMaterials.includes(materialId)
      ? selectedMaterials.filter(id => id !== materialId)
      : [...selectedMaterials, materialId];
    
    onChange(newSelection);
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (isDropdownOpen) {
      setSearchTerm("");
    }
  };

  // Get icon for a material type
  const getMaterialIcon = (material: MaterialType) => {
    return MATERIAL_ICONS[material.name] || <Package className="h-4 w-4" />;
  };

  // Filter materials based on search term
  const filteredMaterials = dropdownMaterials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get material name by ID for displaying selections
  const getMaterialName = (id: string) => {
    const material = materials.find(m => m.id === id);
    return material ? material.name : "Unknown material";
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
        {selectedMaterials.length > 0 && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
            {selectedMaterials.length} selected
          </span>
        )}
      </div>

      {/* Top 3 Material Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {topMaterials.map(material => (
          <button
            key={material.id}
            type="button"
            onClick={() => toggleMaterial(material.id)}
            className={`flex items-center justify-center p-3 rounded-lg border text-sm transition-colors
              ${selectedMaterials.includes(material.id)
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
              }`}
          >
            <span className={`mr-2 ${
              selectedMaterials.includes(material.id) ? 'text-primary-500' : 'text-gray-500'
            }`}>
              {getMaterialIcon(material)}
            </span>
            <span className="capitalize">{material.name}</span>
          </button>
        ))}
      </div>

      {/* More Materials Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleDropdownToggle}
          className="flex items-center justify-between w-full p-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm"
        >
          <span className="flex items-center">
            <Package className="h-4 w-4 mr-2 text-gray-500" />
            More Materials
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div
            ref={dropdownContentRef}
            className={`absolute ${isDropdownAbove ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10`}
          >
            {/* Search input */}
            <div className="p-2 border-b sticky top-0 bg-white z-10">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 pl-8 border border-gray-300 rounded-md text-sm"
                />
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Materials list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map(material => (
                  <div
                    key={material.id}
                    className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0`}
                    onClick={() => toggleMaterial(material.id)}
                  >
                    <div className="flex items-center">
                      <span className="mr-2.5 text-gray-500">
                        {getMaterialIcon(material)}
                      </span>
                      <span className="capitalize">{material.name}</span>
                    </div>
                    {selectedMaterials.includes(material.id) && (
                      <Check className="h-4 w-4 text-primary-500" />
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? `No materials matching "${searchTerm}"` : 'No additional materials available'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Materials Display */}
      {selectedMaterials.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedMaterials.map(id => {
            // Find if it's from the top 3 materials (already displayed)
            const isTopMaterial = topMaterials.some(m => m.id === id);
            // If it's already displayed in the top 3, don't show it here again
            if (isTopMaterial) return null;
            
            return (
              <span
                key={id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-50 text-primary-600 border border-primary-100"
              >
                {getMaterialName(id)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMaterial(id);
                  }}
                  className="ml-1 text-primary-400 hover:text-primary-700 rounded-full hover:bg-primary-100 p-0.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18"></path>
                    <path d="M6 6l12 12"></path>
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MaterialSelector;