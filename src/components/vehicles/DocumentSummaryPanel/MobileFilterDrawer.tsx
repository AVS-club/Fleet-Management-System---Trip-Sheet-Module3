/**
 * MobileFilterDrawer - Bottom sheet filter panel for mobile
 * 
 * Features:
 * - Slide-up animation
 * - Touch-friendly controls
 * - All filter options in one place
 * - Apply/Reset actions
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, RotateCcw } from 'lucide-react';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Filter state
  dateRange: string;
  customStartDate: string;
  customEndDate: string;
  vehicleFilter: string;
  documentTypeFilter: string;
  
  // Filter setters
  setDateRange: (value: string) => void;
  setCustomStartDate: (value: string) => void;
  setCustomEndDate: (value: string) => void;
  setVehicleFilter: (value: string) => void;
  setDocumentTypeFilter: (value: string) => void;
  
  // Reset action
  onReset: () => void;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  dateRange,
  customStartDate,
  customEndDate,
  vehicleFilter,
  documentTypeFilter,
  setDateRange,
  setCustomStartDate,
  setCustomEndDate,
  setVehicleFilter,
  setDocumentTypeFilter,
  onReset
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[85vh] overflow-hidden"
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full touch-manipulation"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-140px)] px-4 py-4 space-y-4">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="w-full"
                >
                  <option value="allTime">All Time</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisYear">This Year</option>
                  <option value="lastYear">Last Year</option>
                  <option value="custom">Custom Range</option>
                </Select>
              </div>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Vehicle Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Status
                </label>
                <Select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  className="w-full"
                >
                  <option value="all">All Vehicles</option>
                  <option value="urgent">Urgent (Expired)</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="valid">All Valid</option>
                  <option value="missing">Missing Documents</option>
                </Select>
              </div>

              {/* Document Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <Select
                  value={documentTypeFilter}
                  onChange={(e) => setDocumentTypeFilter(e.target.value)}
                  className="w-full"
                >
                  <option value="all">All Documents</option>
                  <option value="insurance">Insurance</option>
                  <option value="fitness">Fitness</option>
                  <option value="permit">Permit</option>
                  <option value="puc">PUC</option>
                  <option value="tax">Tax</option>
                  <option value="rc">RC Expiry</option>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 px-4 py-3 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  onReset();
                  onClose();
                }}
                className="flex-1"
                icon={<RotateCcw className="h-4 w-4" />}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                onClick={onClose}
                className="flex-1"
              >
                Apply Filters
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

