import React, { useState, useEffect } from 'react';
import { MaintenanceServiceLineItem } from '@/types/maintenance';
import { Plus, Trash2, IndianRupee, Package } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { createLogger } from '../../utils/logger';

const logger = createLogger('LineItemsFormEntry');

interface LineItemsFormEntryProps {
  items: MaintenanceServiceLineItem[];
  onChange: (items: MaintenanceServiceLineItem[]) => void;
  disabled?: boolean;
}

/**
 * Form-based line items entry component
 * Mobile-friendly with one item per card
 */
const LineItemsFormEntry: React.FC<LineItemsFormEntryProps> = ({
  items,
  onChange,
  disabled = false,
}) => {
  const [localItems, setLocalItems] = useState<MaintenanceServiceLineItem[]>(items);

  // Sync with parent when items prop changes
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Calculate subtotal for an item
  const calculateSubtotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice;
  };

  // Calculate total from all items
  const calculateTotal = (): number => {
    return localItems.reduce((total, item) => {
      return total + calculateSubtotal(item.quantity, item.unit_price);
    }, 0);
  };

  // Add a new empty line item
  const handleAddItem = () => {
    const newItem: MaintenanceServiceLineItem = {
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      item_order: localItems.length,
    };

    const updatedItems = [...localItems, newItem];
    setLocalItems(updatedItems);
    onChange(updatedItems);
    logger.debug('Added new line item');
  };

  // Update a specific line item field
  const handleUpdateItem = (
    index: number,
    field: keyof MaintenanceServiceLineItem,
    value: any
  ) => {
    const updatedItems = [...localItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    setLocalItems(updatedItems);
    onChange(updatedItems);
  };

  // Remove a line item
  const handleRemoveItem = (index: number) => {
    const updatedItems = localItems.filter((_, i) => i !== index);
    
    // Re-index the items
    const reindexedItems = updatedItems.map((item, i) => ({
      ...item,
      item_order: i,
    }));

    setLocalItems(reindexedItems);
    onChange(reindexedItems);
    logger.debug(`Removed line item at index ${index}`);
  };

  return (
    <div className="space-y-4">
      {/* Line Items List */}
      {localItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium">No line items added yet</p>
          <p className="text-xs mt-1">Click "Add Line Item" to start adding items</p>
        </div>
      ) : (
        <div className="space-y-3">
          {localItems.map((item, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Item Header with Delete Button */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Item {index + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  disabled={disabled}
                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Item Name */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <Input
                  type="text"
                  value={item.item_name}
                  onChange={(e) =>
                    handleUpdateItem(index, 'item_name', e.target.value)
                  }
                  placeholder="e.g., Clutch plate, Engine oil, Bearings"
                  disabled={disabled}
                  required
                  className="text-sm"
                />
              </div>

              {/* Description (Optional) */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <Input
                  type="text"
                  value={item.description || ''}
                  onChange={(e) =>
                    handleUpdateItem(index, 'description', e.target.value)
                  }
                  placeholder="Additional details"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>

              {/* Quantity and Unit Price in Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleUpdateItem(
                        index,
                        'quantity',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min="0"
                    step="0.01"
                    disabled={disabled}
                    required
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Unit Price *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleUpdateItem(
                          index,
                          'unit_price',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="0.01"
                      disabled={disabled}
                      required
                      className="text-sm pl-8"
                    />
                  </div>
                </div>
              </div>

              {/* Subtotal Display */}
              <div className="bg-gray-50 rounded p-2 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    Subtotal:
                  </span>
                  <span className="text-sm font-semibold text-gray-900 flex items-center">
                    <IndianRupee className="h-3.5 w-3.5 mr-1" />
                    {calculateSubtotal(item.quantity, item.unit_price).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Button */}
      <Button
        type="button"
        variant="secondary"
        onClick={handleAddItem}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Line Item
      </Button>

      {/* Total Display */}
      {localItems.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-900">
              Total Cost:
            </span>
            <span className="text-lg font-bold text-blue-900 flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {calculateTotal().toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Sum of {localItems.length} item{localItems.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default LineItemsFormEntry;

