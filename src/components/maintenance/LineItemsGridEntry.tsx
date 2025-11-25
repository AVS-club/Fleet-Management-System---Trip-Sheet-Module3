import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { MaintenanceServiceLineItem } from '@/types/maintenance';
import { Plus, Trash2, IndianRupee } from 'lucide-react';
import Button from '../ui/Button';
import { createLogger } from '../../utils/logger';

const logger = createLogger('LineItemsGridEntry');

interface LineItemsGridEntryProps {
  items: MaintenanceServiceLineItem[];
  onChange: (items: MaintenanceServiceLineItem[]) => void;
  disabled?: boolean;
}

/**
 * Excel-like grid entry component for line items
 * Desktop-optimized with inline editing and keyboard navigation
 */
const LineItemsGridEntry: React.FC<LineItemsGridEntryProps> = ({
  items,
  onChange,
  disabled = false,
}) => {
  const [localItems, setLocalItems] = useState<MaintenanceServiceLineItem[]>(items);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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
    
    // Focus on the first cell of the new row
    setTimeout(() => {
      const key = `${localItems.length}-item_name`;
      inputRefs.current[key]?.focus();
    }, 0);
    
    logger.debug('Added new line item to grid');
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

  // Handle keyboard navigation (Tab, Enter, Arrow keys)
  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colName: string
  ) => {
    const cols = ['item_name', 'quantity', 'unit_price']; // Removed description
    const currentColIndex = cols.indexOf(colName);

    // Enter: Move to next row, same column (or add new row if last)
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (rowIndex === localItems.length - 1) {
        // Last row - add new row
        handleAddItem();
      } else {
        // Move to next row, same column
        const nextKey = `${rowIndex + 1}-${colName}`;
        inputRefs.current[nextKey]?.focus();
      }
    }
    
    // Tab: Move to next cell (with Shift: previous cell)
    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Move backward
        if (currentColIndex > 0) {
          // Previous column, same row
          const prevCol = cols[currentColIndex - 1];
          const prevKey = `${rowIndex}-${prevCol}`;
          inputRefs.current[prevKey]?.focus();
        } else if (rowIndex > 0) {
          // Last column of previous row
          const prevCol = cols[cols.length - 1];
          const prevKey = `${rowIndex - 1}-${prevCol}`;
          inputRefs.current[prevKey]?.focus();
        }
      } else {
        // Move forward
        if (currentColIndex < cols.length - 1) {
          // Next column, same row
          const nextCol = cols[currentColIndex + 1];
          const nextKey = `${rowIndex}-${nextCol}`;
          inputRefs.current[nextKey]?.focus();
        } else if (rowIndex < localItems.length - 1) {
          // First column of next row
          const nextCol = cols[0];
          const nextKey = `${rowIndex + 1}-${nextCol}`;
          inputRefs.current[nextKey]?.focus();
        }
      }
    }
  };

  // Start editing a cell
  const handleCellClick = (rowIndex: number, colName: string) => {
    if (!disabled) {
      setEditingCell({ row: rowIndex, col: colName });
      const key = `${rowIndex}-${colName}`;
      setTimeout(() => {
        inputRefs.current[key]?.select();
      }, 0);
    }
  };

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Grid Table */}
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300 bg-white">
          {/* Table Header */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-8 sm:w-12">
                #
              </th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Item Name *
              </th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-16 sm:w-24">
                Qty *
              </th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24 sm:w-32">
                Unit Price *
              </th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-24 sm:w-32">
                Subtotal
              </th>
              <th className="px-2 sm:px-3 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-12 sm:w-16">
                Action
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {localItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 sm:px-3 py-8 sm:py-12 text-center text-sm text-gray-500">
                  No line items added. Click "Add Line Item" to start.
                </td>
              </tr>
            ) : (
              localItems.map((item, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Row Number */}
                  <td className="px-2 sm:px-3 py-1 sm:py-2 text-sm text-gray-600 font-medium">
                    {rowIndex + 1}
                  </td>

                  {/* Item Name */}
                  <td
                    className="px-2 sm:px-3 py-1 sm:py-2 cursor-pointer"
                    onClick={() => handleCellClick(rowIndex, 'item_name')}
                  >
                    <input
                      ref={(el) => (inputRefs.current[`${rowIndex}-item_name`] = el)}
                      type="text"
                      value={item.item_name}
                      onChange={(e) =>
                        handleUpdateItem(rowIndex, 'item_name', e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 'item_name')}
                      disabled={disabled}
                      placeholder="Item name"
                      className="w-full px-2 sm:px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed h-11 sm:h-auto"
                    />
                  </td>

                  {/* Quantity */}
                  <td
                    className="px-2 sm:px-3 py-1 sm:py-2 cursor-pointer"
                    onClick={() => handleCellClick(rowIndex, 'quantity')}
                  >
                    <input
                      ref={(el) => (inputRefs.current[`${rowIndex}-quantity`] = el)}
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(
                          rowIndex,
                          'quantity',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, 'quantity')}
                      disabled={disabled}
                      min="0"
                      step="0.01"
                      className="w-full px-2 sm:px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed h-11 sm:h-auto min-w-[60px]"
                    />
                  </td>

                  {/* Unit Price */}
                  <td
                    className="px-2 sm:px-3 py-1 sm:py-2 cursor-pointer"
                    onClick={() => handleCellClick(rowIndex, 'unit_price')}
                  >
                    <div className="flex items-center">
                      <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-1 flex-shrink-0" />
                      <input
                        ref={(el) => (inputRefs.current[`${rowIndex}-unit_price`] = el)}
                        type="number"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleUpdateItem(
                            rowIndex,
                            'unit_price',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, 'unit_price')}
                        disabled={disabled}
                        min="0"
                        step="0.01"
                        className="w-full px-2 sm:px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed h-11 sm:h-auto min-w-[100px]"
                      />
                    </div>
                  </td>

                  {/* Subtotal (Read-only) */}
                  <td className="px-2 sm:px-3 py-1 sm:py-2 text-right">
                    <div className="flex items-center justify-end text-sm sm:text-base font-medium text-gray-900">
                      <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {calculateSubtotal(item.quantity, item.unit_price).toFixed(2)}
                    </div>
                  </td>

                  {/* Delete Button */}
                  <td className="px-2 sm:px-3 py-1 sm:py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(rowIndex)}
                      disabled={disabled}
                      className="text-red-500 hover:text-red-700 p-2 sm:p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0 flex items-center justify-center mx-auto"
                      title="Delete item"
                    >
                      <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}

            {/* Total Row */}
            {localItems.length > 0 && (
              <tr className="bg-green-50 font-semibold">
                <td colSpan={4} className="px-2 sm:px-3 py-2 sm:py-3 text-right text-sm sm:text-base text-green-900">
                  Total:
                </td>
                <td className="px-2 sm:px-3 py-2 sm:py-3 text-right">
                  <div className="flex items-center justify-end text-base sm:text-lg font-bold text-green-900">
                    <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                    {calculateTotal().toFixed(2)}
                  </div>
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Item Button */}
      <Button
        type="button"
        variant="secondary"
        onClick={handleAddItem}
        disabled={disabled}
        className="w-full min-h-[44px] text-sm sm:text-base"
      >
        <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        Add Line Item
      </Button>

      {/* Keyboard Shortcuts Hint - Hidden on mobile */}
      <div className="hidden sm:block text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 border border-gray-200">
        <p className="font-medium mb-1">Keyboard Shortcuts:</p>
        <ul className="space-y-0.5 ml-4">
          <li>• <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">Tab</kbd> - Move to next cell</li>
          <li>• <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">Enter</kbd> - Move to next row (adds new row if on last row)</li>
          <li>• <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">Shift+Tab</kbd> - Move to previous cell</li>
        </ul>
      </div>
    </div>
  );
};

export default LineItemsGridEntry;

