/**
 * MobileDocumentSummary - Main mobile layout for document summary
 * 
 * Features:
 * - Mobile-first design
 * - Collapsible vehicle cards
 * - Bottom sheet filters
 * - Horizontally scrollable stats
 * - Touch-optimized interactions
 */

import React, { useState } from 'react';
import { ArrowLeft, Search, Filter, MoreVertical, FileSpreadsheet, Printer, Download } from 'lucide-react';
import { MobileVehicleCard } from './MobileVehicleCard';
import { MobileStatsCards } from './MobileStatsCards';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import { MobileChartsView } from './MobileChartsView';
import Input from '../../ui/Input';
import { Vehicle } from '@/types';
import { motion } from 'framer-motion';

interface DocumentInfo {
  date: string | null;
  status: 'expired' | 'expiring' | 'valid' | 'missing';
}

interface VehicleDocuments {
  id: string;
  registration: string;
  registrationDate: string | null;
  documents: {
    rc: DocumentInfo;
    insurance: DocumentInfo;
    fitness: DocumentInfo;
    permit: DocumentInfo;
    puc: DocumentInfo;
    tax: DocumentInfo;
  };
  __urg: {
    score: number;
    meta: {
      expired: number;
      minDTX: number | null;
      missing: number;
    };
  };
}

interface MonthlyExpenditure {
  month: string;
  rc: number;
  insurance: number;
  fitness: number;
  permit: number;
  puc: number;
  tax: number;
  other: number;
}

interface VehicleExpenditure {
  vehicle: string;
  amount: number;
}

interface Metrics {
  totalVehicles: number;
  expiredDocs: number;
  expiringSoon: number;
  validDocs: number;
  missingDocs: number;
}

interface MobileDocumentSummaryProps {
  onClose: () => void;
  sortedDocumentMatrix: VehicleDocuments[];
  vehicles: Vehicle[];
  metrics: Metrics;
  monthlyExpenditure: MonthlyExpenditure[];
  vehicleExpenditure: VehicleExpenditure[];
  
  // Search and filter
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  
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
  
  // Actions
  onRefreshVehicle?: (vehicleId: string) => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
}

export const MobileDocumentSummary: React.FC<MobileDocumentSummaryProps> = ({
  onClose,
  sortedDocumentMatrix,
  vehicles,
  metrics,
  monthlyExpenditure,
  vehicleExpenditure,
  searchTerm,
  setSearchTerm,
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
  onRefreshVehicle,
  onExportExcel,
  onExportPDF,
  onPrint
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [chartsExpanded, setChartsExpanded] = useState(false);

  const handleResetFilters = () => {
    setDateRange('allTime' as any);
    setCustomStartDate('');
    setCustomEndDate('');
    setVehicleFilter('all');
    setDocumentTypeFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="mobile-document-summary flex flex-col h-full bg-gray-50">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full touch-manipulation"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">
            Vehicle Documents
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full touch-manipulation"
            >
              <MoreVertical className="h-5 w-5 text-gray-700" />
            </button>
            
            {/* Action Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                >
                  {onExportExcel && (
                    <button
                      onClick={() => {
                        onExportExcel();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Export to Excel
                    </button>
                  )}
                  {onExportPDF && (
                    <button
                      onClick={() => {
                        onExportPDF();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export to PDF
                    </button>
                  )}
                  {onPrint && (
                    <button
                      onClick={() => {
                        onPrint();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`px-4 py-2 rounded-lg border-2 touch-manipulation flex items-center gap-2 ${
              vehicleFilter !== 'all' || documentTypeFilter !== 'all' || dateRange !== 'allTime'
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stats Cards */}
        <div className="py-3">
          <MobileStatsCards metrics={metrics} />
        </div>

        {/* Vehicle Cards */}
        <div className="px-4 pb-4">
          {sortedDocumentMatrix.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No vehicles found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-0">
              {sortedDocumentMatrix.map((vehicle) => {
                const vehicleData = vehicles.find(v => v.id === vehicle.id);
                return (
                  <MobileVehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    vehicleData={vehicleData!}
                    onRefresh={onRefreshVehicle}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Charts Section */}
        <MobileChartsView
          monthlyExpenditure={monthlyExpenditure}
          vehicleExpenditure={vehicleExpenditure}
          isExpanded={chartsExpanded}
          onToggle={() => setChartsExpanded(!chartsExpanded)}
        />
      </div>

      {/* Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        dateRange={dateRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        vehicleFilter={vehicleFilter}
        documentTypeFilter={documentTypeFilter}
        setDateRange={setDateRange}
        setCustomStartDate={setCustomStartDate}
        setCustomEndDate={setCustomEndDate}
        setVehicleFilter={setVehicleFilter}
        setDocumentTypeFilter={setDocumentTypeFilter}
        onReset={handleResetFilters}
      />
    </div>
  );
};

