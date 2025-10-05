import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, Calendar, Gauge } from 'lucide-react';
import Button from '../ui/Button';

interface PartReplacement {
  id: string;
  partName: string;
  category: string;
  quantity: number;
  cost: number;
  brand: string;
  odometerAtReplacement: number;
  replacementDate: string;
}

interface PartsReplacedSelectorProps {
  selectedParts: PartReplacement[];
  onChange: (parts: PartReplacement[]) => void;
  vehicleOdometer?: number;
  disabled?: boolean;
}

// Top 15 high-impact fleet parts for analysis
const FLEET_PARTS_DATABASE = [
  // Critical Safety & Compliance Parts
  { id: 'brake_pads', name: 'Brake Pads', category: 'Brakes & Safety', icon: '🛑', avgCost: 3000, standardLife: 40000 },
  { id: 'tyres', name: 'Tyres', category: 'Tyres & Wheels', icon: '🛞', avgCost: 4500, standardLife: 60000 },
  { id: 'battery', name: 'Battery', category: 'Electrical', icon: '🔋', avgCost: 12000, standardLife: 80000 },
  
  // High-Cost Replacement Parts
  { id: 'clutch_plate', name: 'Clutch Plate', category: 'Transmission', icon: '⚙️', avgCost: 20000, standardLife: 80000 },
  { id: 'leaf_springs', name: 'Leaf Springs', category: 'Suspension', icon: '🔩', avgCost: 16000, standardLife: 120000 },
  { id: 'gearbox', name: 'Gearbox', category: 'Transmission', icon: '⚡', avgCost: 75000, standardLife: 150000 },
  
  // Frequent Maintenance Parts
  { id: 'engine_oil', name: 'Engine Oil', category: 'Engine', icon: '🛢️', avgCost: 1000, standardLife: 10000 },
  { id: 'air_filter', name: 'Air Filter', category: 'Engine', icon: '🌬️', avgCost: 600, standardLife: 20000 },
  { id: 'fuel_filter', name: 'Fuel Filter', category: 'Engine', icon: '⛽', avgCost: 700, standardLife: 30000 },
  
  // Electrical & Cooling
  { id: 'alternator', name: 'Alternator', category: 'Electrical', icon: '⚡', avgCost: 12000, standardLife: 120000 },
  { id: 'radiator', name: 'Radiator', category: 'Cooling', icon: '🌡️', avgCost: 8500, standardLife: 100000 },
  { id: 'water_pump', name: 'Water Pump', category: 'Cooling', icon: '💧', avgCost: 5500, standardLife: 120000 },
  
  // Suspension & Steering
  { id: 'shock_absorbers', name: 'Shock Absorbers', category: 'Suspension', icon: '🔩', avgCost: 6000, standardLife: 80000 },
  { id: 'wheel_bearings', name: 'Wheel Bearings', category: 'Tyres & Wheels', icon: '⚙️', avgCost: 3500, standardLife: 80000 },
  { id: 'timing_belt', name: 'Timing Belt', category: 'Engine', icon: '⏰', avgCost: 4500, standardLife: 100000 },
];

const PARTS_BRANDS = [
  'MRF', 'CEAT', 'Apollo', 'Exide', 'Amaron', 'Bosch', 'Delphi', 
  'Mahle', 'Mann', 'Wix', 'Fram', 'ACDelco', 'Genuine', 'OEM', 'Other'
];

const PartsReplacedSelector: React.FC<PartsReplacedSelectorProps> = ({
  selectedParts,
  onChange,
  vehicleOdometer = 0,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newPart, setNewPart] = useState<Partial<PartReplacement>>({
    partName: '',
    category: '',
    quantity: 1,
    cost: 0,
    brand: '',
    odometerAtReplacement: vehicleOdometer,
    replacementDate: new Date().toISOString().split('T')[0]
  });

  const addPart = () => {
    if (!newPart.partName || !newPart.cost || !newPart.brand) return;

    const part: PartReplacement = {
      id: Date.now().toString(),
      partName: newPart.partName,
      category: newPart.category || 'General',
      quantity: newPart.quantity || 1,
      cost: newPart.cost,
      brand: newPart.brand,
      odometerAtReplacement: newPart.odometerAtReplacement || vehicleOdometer,
      replacementDate: newPart.replacementDate || new Date().toISOString().split('T')[0]
    };

    onChange([...selectedParts, part]);
    setNewPart({
      partName: '',
      category: '',
      quantity: 1,
      cost: 0,
      brand: '',
      odometerAtReplacement: vehicleOdometer,
      replacementDate: new Date().toISOString().split('T')[0]
    });
    setIsOpen(false);
  };

  const removePart = (id: string) => {
    onChange(selectedParts.filter(part => part.id !== id));
  };

  const updatePart = (id: string, field: keyof PartReplacement, value: any) => {
    onChange(selectedParts.map(part => 
      part.id === id ? { ...part, [field]: value } : part
    ));
  };

  const getPartInfo = (partName: string) => {
    return FLEET_PARTS_DATABASE.find(part => 
      part.name.toLowerCase().includes(partName.toLowerCase()) ||
      partName.toLowerCase().includes(part.name.toLowerCase())
    );
  };

  const totalCost = selectedParts.reduce((sum, part) => sum + (part.cost * part.quantity), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Parts Replaced</h4>
          <p className="text-xs text-gray-500">
            Track replaced parts for health analytics across all maintenance types
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Total: ₹{totalCost.toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            icon={<Plus className="h-4 w-4" />}
          >
            Add Part
          </Button>
        </div>
      </div>

      {/* Selected Parts List */}
      {selectedParts.length > 0 && (
        <div className="space-y-2">
          {selectedParts.map((part) => {
            const partInfo = getPartInfo(part.partName);
            return (
              <div key={part.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{partInfo?.icon || '🔧'}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{part.partName}</p>
                        <p className="text-xs text-gray-500">{part.category}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-gray-500 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={part.quantity}
                          onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={disabled}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-500 mb-1">Cost (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={part.cost}
                          onChange={(e) => updatePart(part.id, 'cost', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={disabled}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-500 mb-1">Brand</label>
                        <select
                          value={part.brand}
                          onChange={(e) => updatePart(part.id, 'brand', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={disabled}
                        >
                          {PARTS_BRANDS.map(brand => (
                            <option key={brand} value={brand}>{brand}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-gray-500 mb-1">Odometer</label>
                        <input
                          type="number"
                          min="0"
                          value={part.odometerAtReplacement}
                          onChange={(e) => updatePart(part.id, 'odometerAtReplacement', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={disabled}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>Total: ₹{(part.cost * part.quantity).toLocaleString()}</span>
                      <span>{part.replacementDate}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removePart(part.id)}
                    disabled={disabled}
                    className="ml-2 p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Part Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Replaced Part</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Name *
                </label>
                <select
                  value={newPart.partName}
                  onChange={(e) => {
                    const selectedPart = FLEET_PARTS_DATABASE.find(p => p.name === e.target.value);
                    setNewPart({
                      ...newPart,
                      partName: e.target.value,
                      category: selectedPart?.category || '',
                      cost: selectedPart?.avgCost || 0
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a part</option>
                  {FLEET_PARTS_DATABASE.map(part => (
                    <option key={part.id} value={part.name}>
                      {part.icon} {part.name} - ₹{part.avgCost.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPart.cost}
                    onChange={(e) => setNewPart({ ...newPart, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand *
                </label>
                <select
                  value={newPart.brand}
                  onChange={(e) => setNewPart({ ...newPart, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select brand</option>
                  {PARTS_BRANDS.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Odometer Reading
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPart.odometerAtReplacement}
                    onChange={(e) => setNewPart({ ...newPart, odometerAtReplacement: parseInt(e.target.value) || vehicleOdometer })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Replacement Date
                  </label>
                  <input
                    type="date"
                    value={newPart.replacementDate}
                    onChange={(e) => setNewPart({ ...newPart, replacementDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={addPart}
                disabled={!newPart.partName || !newPart.cost || !newPart.brand}
              >
                Add Part
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartsReplacedSelector;
